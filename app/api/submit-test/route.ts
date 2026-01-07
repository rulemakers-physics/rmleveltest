// 파일 경로: app/api/submit-test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';
import { TEST_DATA, TestType } from '@/lib/constants';

interface ScoreDetails {
  basic: number;
  advanced: number;
}
// [수정] Scores 인터페이스에 comm을 명시적으로 포함
interface Scores {
  bio: ScoreDetails;
  earth: ScoreDetails;
  chem: ScoreDetails;
  phys: ScoreDetails;
  comm: ScoreDetails; 
  [key: string]: ScoreDetails | undefined;
}

interface SubjectCounts {
  bio: number;
  earth: number;
  chem: number;
  phys: number;
  comm: number;
  [key: string]: number | undefined;
}

/**
 * Slack 알림 함수
 */
async function sendSlackNotification(data: any) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.error("Slack Webhook URL is not set.");
    return;
  }

  const { 
    studentName, school, grade, testType,
    totalCorrect, totalScore, resultGrade,
    assignedClass, isExceptionCase, 
    scores, basicCorrect, advancedCorrect, subjectTotals 
  } = data;

  let blocks = [];

  if (testType === 'high') {
    // 고등 과정: 과목별 현황 (융합 포함)
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
        text: { type: "mrkdwn", text: `📝 *과목별 정답 현황*` },
        fields: [
          { type: "mrkdwn", text: `*물리학:* ${(scores.phys?.basic || 0) + (scores.phys?.advanced || 0)} / ${subjectTotals?.phys || 0}` },
          { type: "mrkdwn", text: `*화학:* ${(scores.chem?.basic || 0) + (scores.chem?.advanced || 0)} / ${subjectTotals?.chem || 0}` },
          { type: "mrkdwn", text: `*지구과학:* ${(scores.earth?.basic || 0) + (scores.earth?.advanced || 0)} / ${subjectTotals?.earth || 0}` },
          { type: "mrkdwn", text: `*생명과학:* ${(scores.bio?.basic || 0) + (scores.bio?.advanced || 0)} / ${subjectTotals?.bio || 0}` },
          { type: "mrkdwn", text: `*융합:* ${(scores.comm?.basic || 0) + (scores.comm?.advanced || 0)} / ${subjectTotals?.comm || 0}` }
        ]
      }
    ];
  } else {
    // 중등 과정
    blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `🔔 *중등 심화과학 레벨 테스트 결과*` }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*학생:* ${studentName} (${school} / ${grade})` },
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

export async function POST(req: NextRequest) {
  try {
    const { studentAnswers, studentName, school, grade, testType } = await req.json();
    
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
    let totalScore = 0;
    
    let basicCorrect = 0;
    let advancedCorrect = 0;
    
    // [중요] scores 및 subjectTotals를 모든 과목에 대해 0으로 초기화
    const scores: Scores = {
      bio: { basic: 0, advanced: 0 },
      earth: { basic: 0, advanced: 0 },
      chem: { basic: 0, advanced: 0 },
      phys: { basic: 0, advanced: 0 },
      comm: { basic: 0, advanced: 0 },
    };

    const subjectTotals: SubjectCounts = {
      bio: 0, earth: 0, chem: 0, phys: 0, comm: 0
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
      
      // [집계] 과목별 전체 문항 수
      if (subjectTotals[meta.subject] !== undefined) {
        subjectTotals[meta.subject]!++;
      } else {
        // 혹시 정의되지 않은 과목이 들어오면 초기화 후 증가
        subjectTotals[meta.subject] = 1;
        if (!scores[meta.subject]) scores[meta.subject] = { basic: 0, advanced: 0 };
      }

      if (isCorrect) {
        totalCorrect++;
        if (currentTestType === 'high' && meta.point) {
          totalScore += meta.point;
        }

        const diff = meta.difficulty || 'basic';
        if (diff === 'basic') {
          basicCorrect++;
          if (scores[meta.subject]) scores[meta.subject]!.basic++;
        } else {
          advancedCorrect++;
          if (scores[meta.subject]) scores[meta.subject]!.advanced++;
        }
      }
    }

    // 4. 결과 판정
    let assignedClass = '';
    let isExceptionCase = false;
    let resultGrade: number | null = null;

    if (currentTestType === 'middle') {
      if (advancedCorrect >= 10 && basicCorrect < 19) {
        assignedClass = '기본반';
        isExceptionCase = true;
      } else if (basicCorrect >= 19) {
        assignedClass = '심화반';
      } else {
        assignedClass = '기본반';
      }
    } else {
      assignedClass = '통합과학반';
      if (config.gradeCutoffs) {
        const cutoff = config.gradeCutoffs.find(c => totalScore >= c.score);
        resultGrade = cutoff ? cutoff.grade : 9;
      }
    }
    
    // 5. DB 저장
    const submissionTimestamp = new Date().toISOString(); 
    const dbData = {
      testType: currentTestType,
      studentName: studentName || '익명',
      school: school || '미기입',
      grade: grade || '미기입',
      studentAnswers: JSON.stringify(studentAnswers),
      totalCorrect,
      assignedClass,
      basicCorrect,
      advancedCorrect,
      scores,          // 과목별 정답 상세
      subjectTotals,   // 과목별 전체 문항 수
      isExceptionCase,
      totalScore,
      resultGrade,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const clientResultData = {
      ...dbData,
      createdAt: submissionTimestamp,
    };

    await db.collection('testResults').add(dbData);
    await sendSlackNotification(clientResultData); 

    return NextResponse.json({ 
      message: 'Test submitted successfully!', 
      resultData: clientResultData 
    });

  } catch (error) {
    console.error('Error submitting test:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}