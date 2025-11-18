// 파일 경로: app/api/submit-test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';
import { QUESTION_METADATA, ANSWER_KEY } from '@/lib/constants'; // 문항 정보 및 정답지

// 과목별 점수 집계 인터페이스
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
  // process.env에서 SLACK_WEBHOOK_URL을 직접 읽어옵니다.
  const url = process.env.SLACK_WEBHOOK_URL;
  
  if (!url) {
    console.error("Slack Webhook URL is not set (from env). Skipping notification.");
    return;
  }

  // 슬랙으로 보낼 데이터 해체
  const { 
    studentName, school, grade, 
    totalCorrect, assignedClass, isExceptionCase, 
    scores, basicCorrect, advancedCorrect 
  } = data;

  // Slack 메시지 포맷 (Blocks)
  const message = {
    text: `🔔 통합과학 레벨 테스트 결과: ${school} ${grade} ${studentName}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `🔔 *통합과학 레벨 테스트 결과*` }
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
    ]
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
 * 학생 답안을 받아 채점하고, DB에 저장한 후, 슬랙 알림을 보냅니다.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 요청 본문에서 학생 답안과 정보 파싱
    const { studentAnswers, studentName, school, grade } = await req.json();
    
    // 2. 유효성 검사 (변경 없음)
    if (!Array.isArray(studentAnswers) || studentAnswers.length !== 40) {
      return NextResponse.json({ error: 'Invalid answers format.' }, { status: 400 });
    }
    if (!studentName || !school || !grade) {
      return NextResponse.json({ error: 'Missing required fields (name, school, grade).' }, { status: 400 });
    }

    // 3. 채점 및 집계 (변경 없음)
    let totalCorrect = 0;
    let basicCorrect = 0;
    let advancedCorrect = 0;
    const scores: Scores = {
      bio: { basic: 0, advanced: 0 },
      earth: { basic: 0, advanced: 0 },
      chem: { basic: 0, advanced: 0 },
      phys: { basic: 0, advanced: 0 },
    };

    for (let i = 0; i < 40; i++) {
      const meta = QUESTION_METADATA[i];
      const correctAnswer = ANSWER_KEY[i];
      const studentAnswer = studentAnswers[i]; 
      let isCorrect = false;

      if (Array.isArray(correctAnswer)) {
        if (Array.isArray(studentAnswer)) {
          isCorrect = JSON.stringify(correctAnswer) === JSON.stringify(studentAnswer);
        }
      } 
      else {
        isCorrect = (studentAnswer === correctAnswer);
      }

      if (isCorrect) {
        totalCorrect++;
        if (meta.difficulty === 'basic') {
          basicCorrect++;
          scores[meta.subject].basic++;
        } else {
          advancedCorrect++;
          scores[meta.subject].advanced++;
        }
      }
    }

    // 4. 반 배정 로직 (변경 없음)
    let assignedClass: '기본반' | '심화반';
    let isExceptionCase = false;

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
    
    // 5. [수정] DB 저장용 / 클라이언트 반환용 데이터 분리
    
    // 클라이언트에게 반환할 때 사용할 현재 시간 (JSON 변환 가능)
    const submissionTimestamp = new Date().toISOString(); 

    // DB에 저장할 데이터 (Firebase 특수 객체 포함)
    const dbData = {
      studentName: studentName || '익명',
      school: school || '미기입',
      grade: grade || '미기입',
      studentAnswers: JSON.stringify(studentAnswers),
      totalCorrect,
      basicCorrect,
      advancedCorrect,
      scores,
      assignedClass,
      isExceptionCase,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // DB 저장용
    };
    
    // 클라이언트에 반환할 데이터 (JSON 직렬화 가능해야 함)
    const clientResultData = {
      ...dbData,
      createdAt: submissionTimestamp, // DB용 객체를 JS 시간 문자열로 덮어쓰기
    };

    // 6. [수정] Firestore에 결과 저장 (await 추가!)
    await db.collection('testResults').add(dbData);

    // 7. [수정] 슬랙 알림 전송 (await 추가!)
    // (DB 저장이 성공한 후에 알림을 보내는 것이 좋습니다)
    await sendSlackNotification(clientResultData); 

    // 8. [수정] 클라이언트에 'clientResultData' 객체를 반환
    return NextResponse.json({ 
      message: 'Test submitted successfully!', 
      resultData: clientResultData // JSON으로 변환 가능한 객체를 반환
    });

  } catch (error) {
    console.error('Error submitting test:', error);
    // [수정] 에러 로깅 강화
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}