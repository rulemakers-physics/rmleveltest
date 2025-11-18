export interface QuestionMetadata {
  qNum: number;       // 문항 번호
  subject: 'bio' | 'earth' | 'chem' | 'phys'; // 과목
  level: 1 | 2 | 3 | 4 | 5; // 레벨
  difficulty: 'basic' | 'advanced'; // 난이도
}

// 문항 메타데이터 생성 (수정된 로직 적용)
function createMetadata(): QuestionMetadata[] {
  const meta: QuestionMetadata[] = [];
  const subjects: Array<'bio' | 'earth' | 'chem' | 'phys'> = [
    'bio', 'earth', 'chem', 'phys', 'earth', 'bio', 'chem', 'phys'
  ];

  for (let block = 0; block < 8; block++) {
    const subject = subjects[block];
    for (let i = 0; i < 5; i++) {
      const qNum = block * 5 + i + 1;
      const level = (i + 1) as (1 | 2 | 3 | 4 | 5);
      const difficulty = (level <= 3) ? 'basic' : 'advanced';
      meta.push({ qNum, subject, level, difficulty });
    }
  }
  return meta;
}

// 40개 문항 메타데이터
export const QUESTION_METADATA: QuestionMetadata[] = createMetadata();

// [수정] 정답지의 타입을 (숫자 | 숫자배열)의 배열로 변경
export const ANSWER_KEY: (number | number[])[] = [
  // 1-5 (생)
  2, 5, 3, 2, 5, 
  // 6-10 (지)
  3, 5, 2, 3, 3, 
  // 11-15 (화)
  2, 2, 4, 3, 1, 
  // 16-20 (물)
  2, 3, 4, 4, 
  [1, 4], // 20번 (인덱스 19): 1과 4가 복수 정답

  // 21-25 (지)
  // [수정] 21번 (인덱스 20): [냉각(1), 고기압(1), 가열(2), 저기압(2)]
  [1, 1, 2, 2], 
  3, 3, 4, 2, // 22-25
  
  // 26-30 (생)
  2, 2, 4, 5, 3, 
  // 31-35 (화)
  1, 2, 3, 4, 2, 
  // 36-40 (물)
  2, 3, 5, 3, 1  
];

// [추가] 20번, 21번 문항의 선택지 정의
export const COMPLEX_QUESTION_OPTIONS: { [key: number]: string[] } = {
  20: ["1", "2", "3", "4", "5"], // 20번 선택지는 1, 2, 3, 4, 5
  21: ["냉각", "가열", "고기압", "저기압"] // 21번 선택지
};

// [신규] 21번 문항의 하위 문항 선택지 (라디오 그룹용)
export const SUB_QUESTION_OPTIONS: { [key: number]: { label: string; options: string[] }[] } = {
  21: [
    { label: "(1)", options: ["냉각", "가열"] }, // 1번 새끼 문제
    { label: "(2)", options: ["고기압", "저기압"] }, // 2번 새끼 문제
    { label: "(3)", options: ["냉각", "가열"] }, // 3번 새끼 문제
    { label: "(4)", options: ["고기압", "저기압"] }  // 4번 새끼 문제
  ]
};