import admin from 'firebase-admin';

const ADMIN_APP_NAME = 'admin-app';

let app: admin.app.App;

// [수정] 환경 변수에서 Service Account 정보를 가져오도록 설정
const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Private Key의 줄바꿈 문자(\n) 처리
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

if (admin.apps.some(a => a && a.name === ADMIN_APP_NAME)) {
  app = admin.app(ADMIN_APP_NAME);
} else {
  // [수정] 인증 정보(credential)를 포함하여 초기화
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  }, ADMIN_APP_NAME);
}

export const db = app.firestore();
export { admin };