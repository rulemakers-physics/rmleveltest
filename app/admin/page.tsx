// 파일 경로: app/admin/page.tsx

import { db } from '@/lib/firebaseAdmin'; 
import Link from 'next/link';
import styles from './Admin.module.css'; 
import AdminClientPage from './AdminClientPage'; 

export const dynamic = 'force-dynamic';

interface TestResultSummary {
  id: string;
  testType?: string; // 추가
  studentName: string;
  school: string;
  grade: string;
  totalCorrect: number;
  totalScore?: number; // 추가
  resultGrade?: number; // 추가
  assignedClass: string;
  isExceptionCase: boolean;
  createdAtMillis: number | null;
  studentAnswers: string; 
  scores: any;
}

async function getAllResults(): Promise<TestResultSummary[]> {
  try {
    const snapshot = await db.collection('testResults').orderBy('createdAt', 'desc').get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        testType: data.testType || 'middle', // 기존 데이터 호환
        studentName: data.studentName || 'N/A',
        school: data.school || 'N/A',
        grade: data.grade || 'N/A',
        
        totalCorrect: data.totalCorrect || 0,
        totalScore: data.totalScore,
        resultGrade: data.resultGrade,
        
        assignedClass: data.assignedClass || 'N/A',
        isExceptionCase: data.isExceptionCase || false,
        createdAtMillis: data.createdAt ? data.createdAt.toMillis() : null,
        studentAnswers: data.studentAnswers || "[]",
        scores: data.scores || {},
      };
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return [];
  }
}

export default async function AdminPage() {
  const results = await getAllResults();

  return (
    <main className={styles.adminMain}>
      <h1>전체 응시 기록</h1>
      <AdminClientPage results={results} />
      <div className={styles.footer}>
        <Link href="/">테스트 페이지로 가기</Link>
      </div>
    </main>
  );
}