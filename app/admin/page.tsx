// 파일 경로: app/admin/page.tsx

import { db } from '@/lib/firebaseAdmin'; 
import Link from 'next/link';
import styles from './Admin.module.css'; 
import admin from 'firebase-admin'; 
import AdminClientPage from './AdminClientPage'; 

// [수정] createdAt -> createdAtMillis, scores 추가
interface TestResultSummary {
  id: string;
  studentName: string;
  school: string;
  grade: string;
  totalCorrect: number;
  assignedClass: '기본반' | '심화반';
  isExceptionCase: boolean;
  createdAtMillis: number | null; // [수정] 타임스탬프를 숫자로 받음
  studentAnswers: string; 
  scores: any; // [추가] scores 객체
}

async function getAllResults(): Promise<TestResultSummary[]> {
  try {
    const snapshot = await db.collection('testResults').get();
    
    if (snapshot.empty) {
      return [];
    }
    
    const results: TestResultSummary[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        studentName: data.studentName || 'N/A',
        school: data.school || 'N/A',
        grade: data.grade || 'N/A',
        totalCorrect: data.totalCorrect || 0,
        assignedClass: data.assignedClass || 'N/A',
        isExceptionCase: data.isExceptionCase || false,
        
        // [수정] Timestamp 클래스 대신 .toMillis()를 사용한 숫자로 변환
        createdAtMillis: data.createdAt ? data.createdAt.toMillis() : null,
        
        studentAnswers: data.studentAnswers || "[]",
        
        scores: data.scores || {}, // [추가] DB에서 scores를 가져옴 (없으면 빈 객체)
      };
    });

    // [수정] createdAtMillis 기준으로 정렬
    results.sort((a, b) => {
      const timeA = a.createdAtMillis || 0;
      const timeB = b.createdAtMillis || 0;
      return timeB - timeA; // 최신순 정렬
    });

    return results;

  } catch (error) {
    console.error("Error fetching all results:", error);
    return [];
  }
}


// 페이지 컴포넌트 (서버 컴포넌트)
export default async function AdminPage() {
  const results = await getAllResults();

  return (
    <main className={styles.adminMain}>
      <h1>전체 응시 기록</h1>
      <p>총 {results.length}건의 응시 기록이 있습니다.</p>
      
      {/* 클라이언트 컴포넌트에 props 전달 */}
      <AdminClientPage results={results} />
      
      <div className={styles.footer}>
        <Link href="/">테스트 페이지로 가기</Link>
      </div>
    </main>
  );
}