// lib/constants.ts

export type Subject = 'bio' | 'earth' | 'chem' | 'phys' | 'comm'; // 'comm' (공통) 추가
export type TestType = 'middle' | 'high';

export interface QuestionMetadata {
  qNum: number;
  subject: Subject;
  level: number;       // 난이도 (1.0 ~ 5.0)
  difficulty: 'basic' | 'advanced';
  point?: number;      // [추가] 배점 (고등 과정용)
}

export interface TestConfig {
  title: string;
  questionCount: number;
  blockTitles: string[];
  metadata: QuestionMetadata[];
  answerKey: (number | number[])[];
  // 중등 전용 옵션
  complexOptions?: { [key: number]: string[] };
  subQuestionOptions?: { [key: number]: { label: string; options: string[] }[] };
  // 고등 전용 등급컷 (점수 -> 등급)
  gradeCutoffs?: { score: number; grade: number }[];
}

// ----------------------------------------------------------------------
// 1. 중등 과정 (40문항)
// ----------------------------------------------------------------------
function createMiddleMetadata(): QuestionMetadata[] {
  const meta: QuestionMetadata[] = [];
  const subjects: Subject[] = ['bio', 'earth', 'chem', 'phys', 'earth', 'bio', 'chem', 'phys'];
  for (let block = 0; block < 8; block++) {
    const subject = subjects[block];
    for (let i = 0; i < 5; i++) {
      const qNum = block * 5 + i + 1;
      const level = i + 1;
      const difficulty = level <= 3 ? 'basic' : 'advanced';
      meta.push({ qNum, subject, level, difficulty });
    }
  }
  return meta;
}

const MIDDLE_ANSWERS = [
  2, 5, 3, 2, 5, 3, 5, 2, 3, 3, 2, 2, 4, 3, 1, 2, 3, 4, 4, [1, 4],
  [1, 1, 2, 2], 3, 3, 4, 2, 2, 2, 4, 5, 3, 1, 2, 3, 4, 2, 2, 3, 5, 3, 1
];

// ----------------------------------------------------------------------
// 2. 고등 과정 (25문항 - 시트 데이터 반영)
// ----------------------------------------------------------------------
const HIGH_SCHOOL_DATA_RAW = [
  // Page 1
  { q:1,  ans:5, pt:1.5, subj:'bio',   diff:1.0 },
  { q:2,  ans:5, pt:1.5, subj:'comm',  diff:1.5 },
  { q:3,  ans:3, pt:1.5, subj:'phys',  diff:2.0 },
  { q:4,  ans:2, pt:2.0, subj:'earth', diff:2.0 },
  // Page 2
  { q:5,  ans:1, pt:2.5, subj:'comm',  diff:2.0 },
  { q:6,  ans:1, pt:2.0, subj:'earth', diff:2.0 },
  { q:7,  ans:5, pt:1.5, subj:'comm',  diff:1.5 },
  { q:8,  ans:1, pt:1.5, subj:'earth', diff:2.0 },
  { q:9,  ans:5, pt:1.5, subj:'earth', diff:2.0 }, // 물리/지구 융합 -> 지구로 분류 (편의상)
  // Page 3
  { q:10, ans:5, pt:2.0, subj:'phys',  diff:2.0 }, // 물리/화학 -> 물리
  { q:11, ans:5, pt:1.5, subj:'chem',  diff:2.0 }, // 지구/화학 -> 화학 (표기상 뒤쪽 or 주성분)
  { q:12, ans:3, pt:2.0, subj:'comm',  diff:3.0 },
  { q:13, ans:5, pt:2.0, subj:'bio',   diff:2.5 },
  { q:14, ans:4, pt:2.0, subj:'phys',  diff:3.0 },
  // Page 4
  { q:15, ans:3, pt:1.5, subj:'earth', diff:2.5 },
  { q:16, ans:5, pt:2.5, subj:'chem',  diff:2.5 },
  { q:17, ans:1, pt:2.5, subj:'bio',   diff:2.0 },
  { q:18, ans:3, pt:2.0, subj:'chem',  diff:3.0 },
  // Page 5
  { q:19, ans:1, pt:2.5, subj:'phys',  diff:3.0 },
  { q:20, ans:3, pt:2.0, subj:'earth', diff:3.0 },
  { q:21, ans:3, pt:2.5, subj:'bio',   diff:3.0 },
  { q:22, ans:4, pt:2.0, subj:'bio',   diff:3.5 },
  // Page 6
  { q:23, ans:1, pt:2.5, subj:'phys',  diff:3.5 },
  { q:24, ans:5, pt:2.5, subj:'chem',  diff:3.5 },
  { q:25, ans:4, pt:2.5, subj:'earth', diff:3.5 },
];

function createHighMetadata(): QuestionMetadata[] {
  return HIGH_SCHOOL_DATA_RAW.map(item => ({
    qNum: item.q,
    subject: item.subj as Subject,
    level: item.diff,
    difficulty: item.diff <= 2.0 ? 'basic' : 'advanced', // 2.0 이하 기본, 초과 심화 (임의 기준)
    point: item.pt
  }));
}

// 등급컷 (점수 내림차순 정렬)
const HIGH_GRADE_CUTOFFS = [
  { score: 44, grade: 1 },
  { score: 40, grade: 2 },
  { score: 33, grade: 3 },
  { score: 25, grade: 4 },
  { score: 18, grade: 5 },
  { score: 14, grade: 6 },
  { score: 0,  grade: 7 }, // 14점 미만 7등급 이하 처리 (예시)
];

// ----------------------------------------------------------------------
// 3. 통합 설정 Export
// ----------------------------------------------------------------------
export const TEST_DATA: Record<TestType, TestConfig> = {
  middle: {
    title: "중등 심화 과학 (40제)",
    questionCount: 40,
    blockTitles: [
      "1-5: 생명과학 (I)", "6-10: 지구과학 (I)", "11-15: 화학 (I)", "16-20: 물리학 (I)",
      "21-25: 지구과학 (II)", "26-30: 생명과학 (II)", "31-35: 화학 (II)", "36-40: 물리학 (II)"
    ],
    metadata: createMiddleMetadata(),
    answerKey: MIDDLE_ANSWERS,
    complexOptions: {
      20: ["1", "2", "3", "4", "5"],
      21: ["냉각", "가열", "고기압", "저기압"]
    },
    subQuestionOptions: {
      21: [
        { label: "(1)", options: ["냉각", "가열"] },
        { label: "(2)", options: ["고기압", "저기압"] },
        { label: "(3)", options: ["냉각", "가열"] },
        { label: "(4)", options: ["고기압", "저기압"] }
      ]
    }
  },
  high: {
    title: "고등 통합 과학 (25제)",
    questionCount: 25,
    blockTitles: [
      "1페이지 (1-4번)", "2페이지 (5-9번)", "3페이지 (10-14번)",
      "4페이지 (15-18번)", "5페이지 (19-22번)", "6페이지 (23-25번)"
    ],
    metadata: createHighMetadata(),
    answerKey: HIGH_SCHOOL_DATA_RAW.map(d => d.ans),
    gradeCutoffs: HIGH_GRADE_CUTOFFS
  }
};