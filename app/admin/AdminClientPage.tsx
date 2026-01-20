// 파일 경로: app/admin/AdminClientPage.tsx

"use client";

import { useState } from 'react';
import styles from './Admin.module.css'; 
// [수정] 오류 로그에 표시된 'ResultsModal' (복수형 s)로 import 이름을 변경합니다.
// 만약 파일 이름이 'ResultModal'(단수형)이라면 아래도 'ResultModal'로 수정하세요.
import ResultModal from '@/app/components/ResultsModal'; 

// [수정] createdAt -> createdAtMillis, scores 추가
interface TestResultSummary {
  id: string;
  studentName: string;
  school: string;
  grade: string;
  totalCorrect: number;
  assignedClass: string;
  isExceptionCase: boolean;
  createdAtMillis: number | null; // [수정]
  studentAnswers: string;
  scores: any; // [추가]
}

// [수정] 날짜 포맷팅 함수가 Timestamp 객체 대신 '숫자(millis)'를 받도록 수정
function formatTimestamp(millis: number | null): string {
  if (!millis) return '날짜 없음'; // null 체크
  
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  // [수정] new Date()에 .toMillis() 없이 바로 millis 사용
  const date = new Date(millis + KST_OFFSET); 
  return date.toISOString().replace('T', ' ').substring(0, 16) + ' (KST)';
}

// 서버 컴포넌트로부터 results 배열을 props로 받음
export default function AdminClientPage({ results }: { results: TestResultSummary[] }) {

  // 모달 상태 관리
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResultSummary | null>(null);

  // "상세 보기" 버튼 클릭 핸들러
  const handleShowDetails = (result: TestResultSummary) => {
    setSelectedResult(result);
    setShowModal(true);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedResult(null);
  };

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.resultTable}>
          <thead>
            <tr>
              <th>응시 일시 (최신순)</th>
              <th>학교</th>
              <th>학년</th>
              <th>이름</th>
              <th>총점</th>
              <th>배정반</th>
              <th>특이사항</th>
              <th>상세 결과</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={8}>응시 기록이 없습니다.</td>
              </tr>
            ) : (
              results.map(result => (
                <tr key={result.id}>
                  {/* [수정] result.createdAt -> result.createdAtMillis */}
                  <td>{formatTimestamp(result.createdAtMillis)}</td>
                  <td>{result.school}</td>
                  <td>{result.grade}</td>
                  <td>{result.studentName}</td>
                  <td>{result.totalCorrect} / 40</td>
                  <td className={result.assignedClass === '심화반' ? styles.advanced : styles.basic}>
                    {result.assignedClass}
                  </td>
                  <td className={result.isExceptionCase ? styles.exception : ''}>
                    {result.isExceptionCase ? '🚨 예외' : '없음'}
                  </td>
                  <td>
                    <button 
                      className={styles.detailsButton} 
                      onClick={() => handleShowDetails(result)}
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 관리자 페이지용 모달 렌더링 */}
      {showModal && selectedResult && (
        <ResultModal 
          result={selectedResult} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
}