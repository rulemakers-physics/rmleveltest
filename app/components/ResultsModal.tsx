"use client";

import styles from './ResultsModal.module.css'; // (다음 단계에서 생성)
import { QUESTION_METADATA, ANSWER_KEY } from '@/lib/constants';

// 헬퍼 함수: 답안을 표시에 적합한 문자열로 변환
const formatAnswer = (ans: number | number[]): string => {
  if (Array.isArray(ans)) {
    // [0,0,0,0] (21번 미응답)
    if (ans.every(item => item === 0)) return '무응답';
    // [1, 4] (20번) 또는 [1,1,2,2] (21번)
    return `[${ans.join(', ')}]`;
  }
  // 0 (일반 문항 미응답)
  if (ans === 0) return '무응답';
  // 1~5 (일반 문항)
  return ans.toString();
};


// 결과 모달 컴포넌트
export default function ResultModal({ result, onClose }: { result: any, onClose: () => void }) {
  
  const {
    studentName, school, grade, assignedClass, isExceptionCase,
    totalCorrect, basicCorrect, advancedCorrect, scores, studentAnswers
  } = result;

  // 1. DB에서 온 JSON 문자열을 실제 배열로 파싱
  const parsedAnswers: (number | number[])[] = JSON.parse(studentAnswers);

  // 2. 40개 문항 채점표 생성
  const answerSheet = QUESTION_METADATA.map((meta, index) => {
    const studentAns = parsedAnswers[index];
    const correctAns = ANSWER_KEY[index];
    let isCorrect = false;

    if (Array.isArray(correctAns)) {
      isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctAns);
    } else {
      isCorrect = (studentAns === correctAns);
    }

    const subjectMap = { 'bio': '생명', 'earth': '지구', 'chem': '화학', 'phys': '물리' };

    return {
      qNum: meta.qNum,
      subject: subjectMap[meta.subject],
      level: meta.level,
      studentAnswerDisplay: formatAnswer(studentAns),
      correctAnswerDisplay: formatAnswer(correctAns),
      isCorrect: isCorrect
    };
  });

  // 3. [추가] 인쇄 버튼 클릭 시 실행될 함수
  const handlePrint = () => {
    window.print();
  };

  return (
    // 4. [수정] 인쇄 영역 식별을 위한 글로벌 클래스 'printable-modal-area' 추가
    <div className={`${styles.modalBackdrop} printable-modal-area`} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseButton} onClick={onClose}>&times;</button>
        
        {/*
          이 JSX는 app/page.tsx에 있던 모달 내용과 동일합니다.
          CSS 클래스 이름만 이 파일의 CSS 모듈을 사용하도록 변경됩니다.
        */}
        <div className={styles.resultContainer}>
          <h1>테스트 결과</h1>
          
          {/* 1. 반 배정 결과 */}
          <div className={styles.resultCard}>
            <p className={styles.studentName}>
              ({school} {grade}) {studentName} 님의
            </p>
            <h2 className={styles.assignedClass}>
              배정반은 <span>{assignedClass}</span> 입니다.
            </h2>
            <p className={styles.totalScore}>
              총점: {totalCorrect} / 40
            </p>
          </div>

          {/* 2. 예외 케이스 경고 */}
          {isExceptionCase && (
            <div className={styles.exceptionBox}>
              <h4>🚨 상담 필요 (예외 케이스)</h4>
              <p>심화 문항 정답률(총 16개 중 {advancedCorrect}개)은 높으나, 기본 문항 정답률(총 24개 중 {basicCorrect}개)이 낮아 기본 개념이 불완전할 수 있습니다.</p>
              <p>고난도 문제 풀이는 가능하지만, 개념이 불안정하면 금방 한계에 부딪힐 수 있습니다. 개념을 탄탄히 다지기 위해 <strong>{assignedClass}</strong> 수강을 강력히 권장합니다.</p>
            </div>
          )}

          {/* 3. 상세 점수 분석 */}
          <div className={styles.scoreDetails}>
            <h3>상세 점수 분석</h3>
            <div className={styles.scoreSection}>
              <h4>📊 기본 문항 (총 {basicCorrect} / 24)</h4>
              <table className={styles.scoreTable}>
                <thead><tr><th>생명과학</th><th>지구과학</th><th>화학</th><th>물리학</th></tr></thead>
                <tbody><tr><td>{scores.bio.basic} / 6</td><td>{scores.earth.basic} / 6</td><td>{scores.chem.basic} / 6</td><td>{scores.phys.basic} / 6</td></tr></tbody>
              </table>
            </div>
            <div className={styles.scoreSection}>
              <h4>📈 심화 문항 (총 {advancedCorrect} / 16)</h4>
              <table className={styles.scoreTable}>
                <thead><tr><th>생명과학</th><th>지구과학</th><th>화학</th><th>물리학</th></tr></thead>
                <tbody><tr><td>{scores.bio.advanced} / 4</td><td>{scores.earth.advanced} / 4</td><td>{scores.chem.advanced} / 4</td><td>{scores.phys.advanced} / 4</td></tr></tbody>
              </table>
            </div>
          </div>

          {/* 4. 문항별 채점 상세표 */}
          <div className={styles.answerSheet}>
            <h3>문항별 채점 상세</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.answerTable}>
                <thead>
                  <tr>
                    <th>번호</th><th>과목</th><th>레벨</th>
                    <th>학생 답</th><th>정답</th><th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {answerSheet.map(item => (
                    <tr key={item.qNum} className={item.isCorrect ? styles.correctRow : styles.incorrectRow}>
                      <td>{item.qNum}번</td>
                      <td>{item.subject}</td>
                      <td>Lv.{item.level}</td>
                      <td>{item.studentAnswerDisplay}</td>
                      <td>{item.correctAnswerDisplay}</td>
                      <td className={styles.resultCell}>{item.isCorrect ? 'O' : 'X'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 5. [수정] footer 영역에 인쇄 버튼 추가 */}
          {/* ▼▼▼▼▼ 여기만 수정 ▼▼▼▼▼ */}
          <div className={styles.footer}>
            <button 
              onClick={handlePrint} 
              style={{
                backgroundColor: '#0070f3', // 파란색 배경
                marginRight: '1rem',
                color: 'white' // [수정] 글씨를 흰색으로 강제
              }}
            >
              결과 인쇄/PDF 저장
            </button>
            <button 
              onClick={onClose} 
              style={{
                backgroundColor: '#555', // 회색 배경
                color: 'white' // [수정] 글씨를 흰색으로 강제
              }}
            >
              결과 창 닫기
            </button>
          </div>
          {/* ▲▲▲▲▲ 여기까지 수정 ▲▲▲▲▲ */}
        </div>
      </div>
    </div>
  );
}