// 파일 경로: app/page.tsx

"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  TEST_DATA, 
  TestType,
  QuestionMetadata
} from '@/lib/constants';
import styles from './Page.module.css';
import ResultModal from '@/app/components/ResultsModal';

export default function TestPage() {
  const [testType, setTestType] = useState<TestType | null>(null);

  const [studentName, setStudentName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  
  // 초기값은 testType 선택 후 설정됨
  const [studentAnswers, setStudentAnswers] = useState<(number | number[])[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [resultData, setResultData] = useState<any>(null); 

  // 1. 과정 선택 핸들러
  const handleSelectTest = (type: TestType) => {
    setTestType(type);
    const config = TEST_DATA[type];
    
    // 답안 배열 초기화
    const initAnswers = Array(config.questionCount).fill(0).map((_, i) => {
      // 중등 특수문항 처리
      if (type === 'middle') {
        if (i === 19) return []; // 20번
        if (i === 20) return [0, 0, 0, 0]; // 21번
      }
      return 0;
    });
    setStudentAnswers(initAnswers);
  };

  const handleAnswerChange = (qIndex: number, answer: number | number[]) => {
    setStudentAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[qIndex] = answer;
      return newAnswers;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testType) return;
    setError(null);

    // 유효성 검사
    if (!studentName.trim() || !school.trim() || !grade.trim()) {
      setError("이름, 학교, 학년을 모두 입력해주세요.");
      return;
    }
    
    // 미응답 검사 (0이거나 빈 배열이면 미응답)
    const unanswered = studentAnswers.filter((ans, i) => {
      if (typeof ans === 'number' && ans === 0) return true;
      if (Array.isArray(ans)) {
        if (ans.length === 0) return true; // 빈 배열
        if (ans.some(a => a === 0)) return true; // [0,0,0,0] 등
      }
      return false;
    }).length;

    if (unanswered > 0) {
      if (!confirm(`아직 ${unanswered}개의 문항에 답하지 않았습니다(또는 '모름' 체크 안함). 이대로 제출하시겠습니까?`)) {
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/submit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testType, // 과정 타입 전송
          studentName, school, grade, studentAnswers 
        }),
      });

      if (!response.ok) throw new Error('서버에서 오류가 발생했습니다.');
      const data = await response.json();

      setResultData(data.resultData); 
      setShowModal(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : '제출 중 알 수 없는 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsLoading(false); 
  };

  // ---------------------------------------------------------
  // 렌더링 1: 과정 선택 화면
  // ---------------------------------------------------------
  if (!testType) {
    return (
      <main className={styles.selectionContainer}>
        <h1>과정을 선택해주세요</h1>
        <div className={styles.cardContainer}>
          <button className={styles.selectionCard} onClick={() => handleSelectTest('middle')}>
            <h2>중등 심화 과정</h2>
            <p>40문항 / 반 배정 테스트</p>
          </button>
          <button className={styles.selectionCard} onClick={() => handleSelectTest('high')}>
            <h2>고등 통합 과정</h2>
            <p>25문항 / 등급 산출 테스트</p>
          </button>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // 렌더링 2: 문제 풀이 화면
  // ---------------------------------------------------------
  const currentTest = TEST_DATA[testType];
  
  // 블록별 문항 수 설정
  const blockSizes = testType === 'middle' 
    ? [5,5,5,5,5,5,5,5] 
    : [4,5,5,4,4,3]; // 고등 (페이지별)

  return (
    <> 
      <main>
        <h1>{currentTest.title}</h1>
        <form onSubmit={handleSubmit} className={styles.testForm}>
          
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

          {/* 문항 렌더링 */}
          {currentTest.blockTitles.map((title, blockIndex) => {
            // 현재 블록의 시작 인덱스 계산
            const startIndex = blockSizes.slice(0, blockIndex).reduce((a, b) => a + b, 0);
            const currentBlockSize = blockSizes[blockIndex];
            const blockMeta = currentTest.metadata.slice(startIndex, startIndex + currentBlockSize);

            return (
              <section key={blockIndex} className={styles.questionBlock}>
                <h2>{title}</h2>
                {blockMeta.map((meta, i) => {
                  const qIndex = startIndex + i; 
                  
                  // [중등] 특수 문항 처리
                  if (testType === 'middle') {
                    if (meta.qNum === 20 && currentTest.complexOptions) { 
                      return (
                        <ComplexQuestionItem 
                          key={qIndex} qNum={meta.qNum} level={meta.level} 
                          options={currentTest.complexOptions[20]} 
                          selectedAnswers={studentAnswers[qIndex] as number[]} 
                          onAnswerChange={(answers) => handleAnswerChange(qIndex, answers)} 
                          disabled={isLoading} 
                        />
                      ); 
                    }
                    if (meta.qNum === 21 && currentTest.subQuestionOptions) { 
                      return (
                        <SubQuestionItem 
                          key={qIndex} qNum={meta.qNum} level={meta.level} 
                          subQuestions={currentTest.subQuestionOptions[21]} 
                          selectedAnswers={studentAnswers[qIndex] as number[]} 
                          onAnswerChange={(answers) => handleAnswerChange(qIndex, answers)} 
                          disabled={isLoading} 
                        />
                      ); 
                    }
                  }

                  // [공통] 일반 문항 (모름 체크박스 포함)
                  return (
                    <QuestionItem 
                      key={qIndex} 
                      qNum={meta.qNum} 
                      level={meta.level} 
                      point={meta.point} // 고등 과정 배점 전달
                      selectedAnswer={studentAnswers[qIndex] as number} 
                      onAnswerChange={(answer) => handleAnswerChange(qIndex, answer)} 
                      disabled={isLoading} 
                    />
                  );
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

          {/* 관리자 페이지 링크 */}
          <div className={styles.adminLinkFooter}>
            <Link href="/admin" target="_blank">응시 기록 확인 (관리자)</Link>
          </div>
        </form>
      </main>

      {/* 결과 모달 */}
      {showModal && resultData && (
        <ResultModal 
          result={resultData} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------
// [수정됨] 일반 문항: -1을 '모름'으로 처리
// ------------------------------------------------------------------
function QuestionItem({ qNum, level, point, selectedAnswer, onAnswerChange, disabled }: {
  qNum: number, level: number, point?: number, selectedAnswer: number,
  onAnswerChange: (answer: number) => void, disabled: boolean
}) {
  // selectedAnswer가 -1이면 '모름' 상태
  const isUnknown = selectedAnswer === -1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filteredValue = e.target.value.replace(/[^1-5]/g, ''); 
    onAnswerChange(parseInt(filteredValue) || 0);
  };

  const handleUnknownCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onAnswerChange(-1); // 체크 시 -1 (모름) 설정
    } else {
      onAnswerChange(0);  // 체크 해제 시 0 (입력 대기) 설정
    }
  };

  return (
    <div className={styles.questionItem}>
      <p className={styles.questionTitle}>
        <span className={styles.qNum}>{qNum}번</span> 
        (Lv.{level})
        {point && <span style={{fontSize: '0.8em', color: '#666', marginLeft:'4px'}}>({point}점)</span>}
      </p>
      
      <div className={styles.answerInputGroup}>
        {/* 값이 0이거나 -1이면 빈 칸으로 표시 */}
        <input 
          type="tel" pattern="[1-5]" maxLength={1} className={styles.answerInput}
          value={(selectedAnswer === 0 || selectedAnswer === -1) ? '' : selectedAnswer}
          onChange={handleChange} 
          disabled={disabled || isUnknown} // 모름 체크 시 입력 불가
          autoComplete="off" 
          placeholder="답"
        />
        <label className={styles.unknownLabel}>
          <input 
            type="checkbox" 
            checked={isUnknown} 
            onChange={handleUnknownCheck}
            disabled={disabled}
          />
          <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>모름</span>
        </label>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 컴포넌트 2: 20번 문항 (체크박스) - 중등용
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
// 컴포넌트 3: 21번 문항 (하위 4문제 라디오 그룹) - 중등용
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