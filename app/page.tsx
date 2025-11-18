// 파일 경로: app/page.tsx

"use client"; 

import { useState } from 'react';
import Link from 'next/link'; 
import { 
  QUESTION_METADATA, 
  COMPLEX_QUESTION_OPTIONS,
  SUB_QUESTION_OPTIONS,
  // [제거] ANSWER_KEY (모달이 가져감)
} from '@/lib/constants'; 
import styles from './Page.module.css'; 
import ResultModal from '@/app/components/ResultsModal'; // [수정] 모달 import

// ... (blockTitles, initialAnswers 변수는 동일) ...
const blockTitles = [
  "1-5: 생명과학 (I)", "6-10: 지구과학 (I)", "11-15: 화학 (I)", "16-20: 물리학 (I)",
  "21-25: 지구과학 (II)", "26-30: 생명과학 (II)", "31-35: 화학 (II)", "36-40: 물리학 (II)"
];
const initialAnswers: (number | number[])[] = Array(40).fill(0).map((_, i) => {
  if (i === 19) return [];
  if (i === 20) return [0, 0, 0, 0];
  return 0;
});


export default function TestPage() {
  const [studentName, setStudentName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [studentAnswers, setStudentAnswers] = useState<(number | number[])[]>(initialAnswers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [resultData, setResultData] = useState<any>(null); 

  const handleAnswerChange = (qIndex: number, answer: number | number[]) => {
    setStudentAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[qIndex] = answer;
      return newAnswers;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ... (유효성 검사 동일) ...
    if (!studentName.trim() || !school.trim() || !grade.trim()) {
      setError("이름, 학교, 학년을 모두 입력해주세요.");
      return;
    }
    const unanswered = studentAnswers.filter((ans, i) => {
      if (typeof ans === 'number' && ans === 0) return true;
      if (Array.isArray(ans) && i === 19 && ans.length === 0) return true;
      if (Array.isArray(ans) && i === 20 && ans.some(a => a === 0)) return true;
      return false;
    }).length;

    if (unanswered > 0) {
      if (!confirm(`아직 ${unanswered}개의 문항에 답하지 않았습니다. 이대로 제출하시겠습니까?`)) {
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, school, grade, studentAnswers }),
      });

      if (!response.ok) throw new Error('서버에서 오류가 발생했습니다.');
      const data = await response.json();

      setResultData(data.resultData); 
      setShowModal(true);
      // setIsLoading(false); // 모달이 떴으므로 로딩 중지

    } catch (err) {
      setError(err instanceof Error ? err.message : '제출 중 알 수 없는 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsLoading(false); 
  }

  return (
    <> 
      <main>
        <h1>통합과학 레벨 테스트</h1>
        <form onSubmit={handleSubmit} className={styles.testForm}>
          
          {/* ... (학생 정보 입력, 40개 문항 렌더링 JSX 모두 동일) ... */}
          {/* 학생 정보 입력 */}
          <div className={styles.nameInfoSection}>
            <div className={styles.nameInputGroup}>
              <label htmlFor="school">학교:</label>
              <input id="school" type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="OO고등학교" className={styles.nameInput} disabled={isLoading}/>
            </div>
            <div className={styles.nameInputGroup}>
              <label htmlFor="grade">학년:</label>
              <input id="grade" type="text" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="예: 1학년 / 고1" className={styles.nameInput} disabled={isLoading}/>
            </div>
            <div className={styles.nameInputGroup}>
              <label htmlFor="studentName">학생 이름:</label>
              <input id="studentName" type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="예: 홍길동" className={styles.nameInput} disabled={isLoading}/>
            </div>
          </div>

          {/* 40개 문항 렌더링 */}
          {blockTitles.map((title, blockIndex) => {
            const startIndex = blockIndex * 5;
            return (
              <section key={blockIndex} className={styles.questionBlock}>
                <h2>{title}</h2>
                {QUESTION_METADATA.slice(startIndex, startIndex + 5).map((meta, i) => {
                  const qIndex = startIndex + i; 
                  const qNum = meta.qNum; 
                  if (qNum === 20) { return (<ComplexQuestionItem key={qIndex} qNum={meta.qNum} level={meta.level} options={COMPLEX_QUESTION_OPTIONS[qNum]} selectedAnswers={studentAnswers[qIndex] as number[]} onAnswerChange={(answers) => handleAnswerChange(qIndex, answers)} disabled={isLoading} />); }
                  if (qNum === 21) { return (<SubQuestionItem key={qIndex} qNum={meta.qNum} level={meta.level} subQuestions={SUB_QUESTION_OPTIONS[qNum]} selectedAnswers={studentAnswers[qIndex] as number[]} onAnswerChange={(answers) => handleAnswerChange(qIndex, answers)} disabled={isLoading} />); }
                  return (<QuestionItem key={qIndex} qNum={meta.qNum} level={meta.level} selectedAnswer={studentAnswers[qIndex] as number} onAnswerChange={(answer) => handleAnswerChange(qIndex, answer)} disabled={isLoading} />);
                })}
              </section>
            );
          })}
          
          {/* 제출 버튼 */}
          <div className={styles.submitSection}>
            {error && <p className={styles.errorText}>{error}</p>}
            <button type="submit" disabled={isLoading} className={styles.submitButton}>
              {isLoading ? '채점 중...' : '답안 제출 및 결과 확인'}
            </button>
          </div>

          {/* 관리자 페이지 이동 링크 */}
          <div className={styles.adminLinkFooter}>
            <Link href="/admin" target="_blank">응시 기록 확인 (관리자)</Link>
          </div>
        </form>
      </main>

      {/* [수정] 모달 렌더링 (간결해짐) */}
      {showModal && resultData && (
        <ResultModal 
          result={resultData} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
}

// ... (QuestionItem, ComplexQuestionItem, SubQuestionItem 컴포넌트 3개는 변경 없음) ...
// (ResultModal 컴포넌트는 여기서 삭제됨)
// ------------------------------------------------------------------
// 컴포넌트 1: 일반 문항 (타이핑)
// ------------------------------------------------------------------
function QuestionItem({ qNum, level, selectedAnswer, onAnswerChange, disabled }: {
  qNum: number, level: number, selectedAnswer: number,
  onAnswerChange: (answer: number) => void, disabled: boolean
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filteredValue = e.target.value.replace(/[^1-5]/g, ''); 
    onAnswerChange(parseInt(filteredValue) || 0);
  };
  return (
    <div className={styles.questionItem}>
      <p className={styles.questionTitle}>
        <span className={styles.qNum}>{qNum}번</span> (Lv.{level})
      </p>
      <div className={styles.answerInputWrapper}>
        <input type="tel" pattern="[1-5]" maxLength={1} className={styles.answerInput}
          value={selectedAnswer === 0 ? '' : selectedAnswer}
          onChange={handleChange} disabled={disabled} autoComplete="off" />
      </div>
    </div>
  );
}
// ------------------------------------------------------------------
// 컴포넌트 2: 20번 문항 (체크박스)
// ------------------------------------------------------------------
function ComplexQuestionItem({ qNum, level, options, selectedAnswers, onAnswerChange, disabled }: {
  qNum: number, level: number, options: string[], selectedAnswers: number[],
  onAnswerChange: (answers: number[]) => void, disabled: boolean
}) {
  const handleChange = (optionValue: number) => {
    let newAnswers: number[];
    if (selectedAnswers.includes(optionValue)) {
      newAnswers = selectedAnswers.filter(ans => ans !== optionValue);
    } else {
      newAnswers = [...selectedAnswers, optionValue];
    }
    newAnswers.sort((a, b) => a - b);
    onAnswerChange(newAnswers);
  };
  return (
    <div className={`${styles.questionItem} ${styles.complexQuestionItem}`}>
      <p className={styles.questionTitle}>
        <span className={styles.qNum}>{qNum}번</span> (Lv.{level}) (모두 고르시오)
      </p>
      <div className={styles.optionsContainer}>
        {options.map((text, index) => {
          const optionValue = index + 1;
          return (
            <label key={optionValue} className={styles.optionLabel}>
              <input type="checkbox"
                checked={selectedAnswers.includes(optionValue)}
                onChange={() => handleChange(optionValue)}
                disabled={disabled} />
              {text}
            </label>
          );
        })}
      </div>
    </div>
  );
}
// ------------------------------------------------------------------
// 컴포넌트 3: 21번 문항 (하위 4문제 라디오 그룹)
// ------------------------------------------------------------------
interface SubQuestion {
  label: string;
  options: string[];
}
function SubQuestionItem({ qNum, level, subQuestions, selectedAnswers, onAnswerChange, disabled }: {
  qNum: number, level: number, subQuestions: SubQuestion[], selectedAnswers: number[],
  onAnswerChange: (answers: number[]) => void, disabled: boolean
}) {
  const handleSubChange = (partIndex: number, partAnswer: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[partIndex] = partAnswer;
    onAnswerChange(newAnswers);
  };
  return (
    <div className={`${styles.questionItem} ${styles.complexQuestionItem}`}>
      <p className={styles.questionTitle}>
        <span className={styles.qNum}>{qNum}번</span> (Lv.{level}) (각 항목에서 1개씩 선택)
      </p>
      {subQuestions.map((subQ, partIndex) => (
        <div key={partIndex} className={styles.subQuestionGroup}>
          <strong className={styles.subQuestionLabel}>{subQ.label}</strong>
          <div className={styles.optionsContainer}>
            {subQ.options.map((text, optionIndex) => {
              const optionValue = optionIndex + 1; 
              return (
                <label key={optionValue} className={styles.optionLabel}>
                  <input type="radio" name={`q-${qNum}-${partIndex}`} checked={selectedAnswers[partIndex] === optionValue}
                    onChange={() => handleSubChange(partIndex, optionValue)} disabled={disabled} />
                  {text}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}