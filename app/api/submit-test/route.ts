// 파일 경로: app/api/submit-test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';
import { TEST_DATA, TestType } from '@/lib/constants'; // [수정] 통합 상수 사용

// 과목별 점수 집계 인터페이스 (중등용)
interface ScoreDetails {
  basic: number;
  advanced: number;
}
interface Scores {
  bio: ScoreDetails;
  earth: ScoreDetails;
  chem: ScoreDetails;
  phys: ScoreDetails;
}

/**
 * Slack으로 알림을 전송하는 함수
 */
async function sendSlackNotification(data: any) {
  const url = process.env.SLACK_WEBHOOK_URL;
  
  if (!url) {
    console.error("Slack Webhook URL is not set. Skipping notification.");
    return;
  }

  const { 
    studentName, school, grade, testType,
    totalCorrect, totalScore, resultGrade, // 고등용 필드
    assignedClass, isExceptionCase, 
    scores, basicCorrect, advancedCorrect 
  } = data;

  let blocks = [];

  // [분기] 테스트 타입에 따라 슬랙 메시지 구성
  if (testType === 'high') {
    // -------------------------------------------------------
    // 1. 고등 과정 (등급 중심)
    // -------------------------------------------------------
    blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `🔔 *고등 통합과학 테스트 결과*` }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*학생:* ${studentName} (${school} / ${grade})` },
          { type: "mrkdwn", text: `*결과:* ${resultGrade}등급 (${totalScore}점)` },
          { type: "mrkdwn", text: `*정답 수:* ${totalCorrect} / 25` }
        ]
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `📝 *상세 결과*` },
        fields: [
          { type: "mrkdwn", text: `*총점:* ${totalScore}점 (50점 만점)` },
          { type: "mrkdwn", text: `*예상 등급:* ${resultGrade}등급` },
        ]
      }
    ];
  } else {
    // -------------------------------------------------------
    // 2. 중등 과정 (기존 포맷 유지 - 과목별 상세)
    // -------------------------------------------------------
    blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `🔔 *중등 심화과학 레벨 테스트 결과*` }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*학생:* ${studentName || '익명'} (${school || '미기입'} / ${grade || '미기입'})` },
          { type: "mrkdwn", text: `*배정반:* *${assignedClass}* ${isExceptionCase ? "🚨" : ""}` },
          { type: "mrkdwn", text: `*총점:* ${totalCorrect} / 40` }
        ]
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `📊 *기본 문항 (총 ${basicCorrect} / 24)*` },
        fields: [
          { type: "mrkdwn", text: `*물리학:* ${scores.phys.basic} / 6` },
          { type: "mrkdwn", text: `*화학:* ${scores.chem.basic} / 6` },
          { type: "mrkdwn", text: `*생명과학:* ${scores.bio.basic} / 6` },
          { type: "mrkdwn", text: `*지구과학:* ${scores.earth.basic} / 6` },
        ]
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `📈 *심화 문항 (총 ${advancedCorrect} / 16)*` },
        fields: [
          { type: "mrkdwn", text: `*물리학:* ${scores.phys.advanced} / 4` },
          { type: "mrkdwn", text: `*화학:* ${scores.chem.advanced} / 4` },
          { type: "mrkdwn", text: `*생명과학:* ${scores.bio.advanced} / 4` },
          { type: "mrkdwn", text: `*지구과학:* ${scores.earth.advanced} / 4` }
        ]
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `*특이사항:* ${isExceptionCase ? "🚨 [예외 케이스] 심화 정답률(60%+) 대비 기본 정답률(19 미만) 낮음. 상담 필요." : "없음"}` }
        ]
      }
    ];
  }

  const message = {
    text: `🔔 레벨 테스트 결과: ${school} ${grade} ${studentName}`,
    blocks: blocks
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Error sending Slack notification:", error);
  }
}


/**
 * POST /api/submit-test
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 요청 본문 파싱
    const { studentAnswers, studentName, school, grade, testType } = await req.json();
    
    // 2. 유효성 검사
    // testType이 없으면 기존 로직 호환을 위해 'middle'로 간주하거나 에러 처리
    const currentTestType = (testType as TestType) || 'middle';
    
    if (!TEST_DATA[currentTestType]) {
      return NextResponse.json({ error: 'Invalid test type.' }, { status: 400 });
    }

    const config = TEST_DATA[currentTestType];

    if (!Array.isArray(studentAnswers) || studentAnswers.length !== config.questionCount) {
      return NextResponse.json({ error: `Invalid answers format. Expected ${config.questionCount}.` }, { status: 400 });
    }
    if (!studentName || !school || !grade) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 3. 채점 및 집계
    let totalCorrect = 0;
    let totalScore = 0; // 고등 과정용 (배점 합계)
    
    // 중등용 통계 변수
    let basicCorrect = 0;
    let advancedCorrect = 0;
    const scores: Scores = {
      bio: { basic: 0, advanced: 0 },
      earth: { basic: 0, advanced: 0 },
      chem: { basic: 0, advanced: 0 },
      phys: { basic: 0, advanced: 0 },
    };

    const { metadata, answerKey } = config;

    for (let i = 0; i < config.questionCount; i++) {
      const meta = metadata[i];
      const correctAnswer = answerKey[i];
      const studentAnswer = studentAnswers[i]; 
      let isCorrect = false;

      // 정오 판별
      if (Array.isArray(correctAnswer)) {
        if (Array.isArray(studentAnswer)) {
          isCorrect = JSON.stringify(correctAnswer) === JSON.stringify(studentAnswer);
        }
      } else {
        isCorrect = (studentAnswer === correctAnswer);
      }

      if (isCorrect) {
        totalCorrect++;
        
        // [고등] 배점 합산
        if (currentTestType === 'high' && meta.point) {
          totalScore += meta.point;
        }

        // [중등] 난이도/과목별 통계 (기존 로직 유지)
        if (currentTestType === 'middle') {
          // 중등은 과목 코드가 정확히 일치하므로 scores 집계 가능
          if (meta.difficulty === 'basic') {
            basicCorrect++;
            if (scores[meta.subject]) scores[meta.subject].basic++;
          } else {
            advancedCorrect++;
            if (scores[meta.subject]) scores[meta.subject].advanced++;
          }
        }
      }
    }

    // 4. 결과 판정 (반 배정 / 등급 산출)
    let assignedClass = '';
    let isExceptionCase = false;
    let resultGrade: number | null = null; // 고등용

    if (currentTestType === 'middle') {
      // ----------------------------------------------------
      // 중등 과정: 기존 로직 그대로 유지
      // ----------------------------------------------------
      if (advancedCorrect >= 10 && basicCorrect < 19) {
        assignedClass = '기본반';
        isExceptionCase = true;
      } 
      else if (basicCorrect >= 19) {
        assignedClass = '심화반';
      }
      else {
        assignedClass = '기본반';
      }
    } else {
      // ----------------------------------------------------
      // 고등 과정: 등급컷 적용
      // ----------------------------------------------------
      assignedClass = '통합과학반'; // 고등은 고정 반 이름 (혹은 필요시 수정)
      if (config.gradeCutoffs) {
        // 점수 내림차순 정렬된 컷오프에서 내 점수보다 작거나 같은 컷 찾기
        // 예: 44점 1등급, 40점 2등급... 내 점수 42점 -> 40점(2등급)에 걸림?
        // 아니요, 등급컷은 "이 점수 이상이면 해당 등급"입니다.
        // 예: 44점 이상 -> 1등급. 43점 -> 2등급.
        
        const cutoff = config.gradeCutoffs.find(c => totalScore >= c.score);
        resultGrade = cutoff ? cutoff.grade : 9; // 컷오프에 없으면 9등급
      }
    }
    
    // 5. DB 저장
    const submissionTimestamp = new Date().toISOString(); 

    const dbData = {
      testType: currentTestType, // [추가] 테스트 타입 저장
      studentName: studentName || '익명',
      school: school || '미기입',
      grade: grade || '미기입',
      studentAnswers: JSON.stringify(studentAnswers),
      
      // 공통 필드
      totalCorrect,
      assignedClass,
      
      // 중등용 필드
      basicCorrect,
      advancedCorrect,
      scores,
      isExceptionCase,
      
      // 고등용 필드
      totalScore,
      resultGrade,
      
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const clientResultData = {
      ...dbData,
      createdAt: submissionTimestamp,
    };

    // 6. 저장 및 알림
    await db.collection('testResults').add(dbData);
    await sendSlackNotification(clientResultData); 

    // 7. 응답
    return NextResponse.json({ 
      message: 'Test submitted successfully!', 
      resultData: clientResultData 
    });

  } catch (error) {
    console.error('Error submitting test:', error);
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}