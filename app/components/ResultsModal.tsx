"use client";

import styles from './ResultsModal.module.css';
import { TEST_DATA, TestType } from '@/lib/constants';

const formatAnswer = (ans: number | number[]): string => {
  if (Array.isArray(ans)) {
    if (ans.length === 0) return '무응답';
    if (ans.every(item => item === 0)) return '무응답';
    return `[${ans.join(', ')}]`;
  }
  if (ans === -1) return '모름';
  if (ans === 0) return '무응답';
  return ans.toString();
};

const subjectMap: Record<string, string> = { 
  'bio': '생명', 'earth': '지구', 'chem': '화학', 'phys': '물리', 'comm': '융합' 
};

export default function ResultModal({ result, onClose }: { result: any, onClose: () => void }) {
  
  const {
    studentName, school, grade, assignedClass, isExceptionCase,
    totalCorrect, 
    basicCorrect, advancedCorrect, scores, subjectTotals, 
    totalScore, resultGrade,
    studentAnswers, testType 
  } = result;

  const currentTestType = (testType as TestType) || 'middle';
  const config = TEST_DATA[currentTestType];
  
  if (!config) return <div className={styles.modalContent}>데이터 오류</div>;

  const { metadata, answerKey } = config;

  const parsedAnswers: (number | number[])[] = typeof studentAnswers === 'string' 
    ? JSON.parse(studentAnswers) 
    : studentAnswers;

  const answerSheet = metadata.map((meta, index) => {
    const studentAns = parsedAnswers[index];
    const correctAns = answerKey[index];
    let isCorrect = false;

    if (Array.isArray(correctAns)) {
      if (Array.isArray(studentAns)) {
        isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctAns);
      }
    } else {
      isCorrect = (studentAns === correctAns);
    }

    return {
      qNum: meta.qNum,
      subject: subjectMap[meta.subject] || meta.subject,
      level: meta.level,
      studentAnswerDisplay: formatAnswer(studentAns),
      correctAnswerDisplay: formatAnswer(correctAns),
      isCorrect: isCorrect,
      point: meta.point
    };
  });

  const handlePrint = () => window.print();

  const handleGoHome = () => {
    if (confirm('첫 화면으로 돌아가시겠습니까? 현재 결과는 사라집니다.')) {
      window.location.href = '/';
    }
  };

  return (
    <div className={`${styles.modalBackdrop} printable-modal-area`} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseButton} onClick={onClose}>&times;</button>
        
        <div className={styles.resultContainer}>
          <h1>테스트 결과 ({config.title})</h1>
          
          <div className={styles.resultCard}>
            <p className={styles.studentName}>({school} {grade}) {studentName} 님의</p>
            {currentTestType === 'high' ? (
              <>
                <h2 className={styles.assignedClass}>예상 등급: <span>{resultGrade}등급</span> ({totalScore}점)</h2>
                <p className={styles.totalScore}>정답 수: {totalCorrect} / {config.questionCount}</p>
              </>
            ) : (
              <>
                <h2 className={styles.assignedClass}>배정반은 <span>{assignedClass}</span> 입니다.</h2>
                <p className={styles.totalScore}>총점: {totalCorrect} / {config.questionCount}</p>
              </>
            )}
          </div>

          {currentTestType === 'middle' && isExceptionCase && (
            <div className={styles.exceptionBox}>
              <h4>🚨 상담 필요 (예외 케이스)</h4>
              <p>심화 문항 정답률은 높으나 기본 문항 정답률이 낮습니다. <strong>{assignedClass}</strong> 수강을 권장합니다.</p>
            </div>
          )}

          {scores && (
            <div className={styles.scoreDetails}>
              <h3>과목별 상세 분석</h3>
              
              {currentTestType === 'middle' ? (
                <>
                  <div className={styles.scoreSection}>
                    <h4>📊 기본 문항 (총 {basicCorrect} / 24)</h4>
                    <table className={styles.scoreTable}>
                      <thead><tr><th>생명</th><th>지구</th><th>화학</th><th>물리</th></tr></thead>
                      <tbody>
                        <tr>
                          <td>{scores.bio?.basic} / 6</td>
                          <td>{scores.earth?.basic} / 6</td>
                          <td>{scores.chem?.basic} / 6</td>
                          <td>{scores.phys?.basic} / 6</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className={styles.scoreSection}>
                    <h4>📈 심화 문항 (총 {advancedCorrect} / 16)</h4>
                    <table className={styles.scoreTable}>
                      <thead><tr><th>생명</th><th>지구</th><th>화학</th><th>물리</th></tr></thead>
                      <tbody>
                        <tr>
                          <td>{scores.bio?.advanced} / 4</td>
                          <td>{scores.earth?.advanced} / 4</td>
                          <td>{scores.chem?.advanced} / 4</td>
                          <td>{scores.phys?.advanced} / 4</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                // --- 고등 과정 (융합 추가) ---
                <div className={styles.scoreSection}>
                  <table className={styles.scoreTable}>
                    <thead>
                      <tr>
                        <th>물리</th>
                        <th>화학</th>
                        <th>지구과학</th>
                        <th>생명과학</th>
                        <th>융합</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{(scores.phys?.basic || 0) + (scores.phys?.advanced || 0)} / {subjectTotals?.phys || 0}</td>
                        <td>{(scores.chem?.basic || 0) + (scores.chem?.advanced || 0)} / {subjectTotals?.chem || 0}</td>
                        <td>{(scores.earth?.basic || 0) + (scores.earth?.advanced || 0)} / {subjectTotals?.earth || 0}</td>
                        <td>{(scores.bio?.basic || 0) + (scores.bio?.advanced || 0)} / {subjectTotals?.bio || 0}</td>
                        {/* [수정] 융합 데이터 표시 */}
                        <td>{(scores.comm?.basic || 0) + (scores.comm?.advanced || 0)} / {subjectTotals?.comm || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className={styles.answerSheet}>
            <h3>문항별 채점 상세</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.answerTable}>
                <thead>
                  <tr>
                    <th>번호</th><th>과목</th><th>레벨</th>
                    {currentTestType === 'high' && <th>배점</th>}
                    <th>학생 답</th><th>정답</th><th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {answerSheet.map(item => (
                    <tr key={item.qNum} className={item.isCorrect ? styles.correctRow : styles.incorrectRow}>
                      <td>{item.qNum}번</td>
                      <td>{item.subject}</td>
                      <td>Lv.{item.level}</td>
                      {currentTestType === 'high' && <td>{item.point}</td>}
                      <td>{item.studentAnswerDisplay}</td>
                      <td>{item.correctAnswerDisplay}</td>
                      <td className={styles.resultCell}>{item.isCorrect ? 'O' : 'X'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className={styles.footer}>
            <button onClick={handlePrint} style={{ backgroundColor: '#0070f3', marginRight: '1rem', color: 'white' }}>결과 인쇄/PDF 저장</button>
            <button 
              onClick={handleGoHome} 
              style={{ backgroundColor: '#faad14', marginRight: '0.5rem', color: 'white' }}
            >
              첫 화면으로
            </button>
            <button onClick={onClose} style={{ backgroundColor: '#555', color: 'white' }}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}