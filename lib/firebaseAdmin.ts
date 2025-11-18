// 파일 경로: lib/firebaseAdmin.ts
import admin from 'firebase-admin';

const ADMIN_APP_NAME = 'admin-app';

let app: admin.app.App;

// 🚀 [수정] 'a'가 null일 수 있으므로 (a && a.name)으로 수정
if (admin.apps.some(a => a && a.name === ADMIN_APP_NAME)) {
  // 'admin-app'이라는 이름의 앱이 이미 초기화되었다면
  app = admin.app(ADMIN_APP_NAME);
} else {
  // 'admin-app'이 없다면,
  // Google Cloud의 기본 인증(ADC/IAM 역할)을 사용하여
  // 고유한 이름으로 앱을 초기화합니다.
  app = admin.initializeApp({
    // credential은 명시하지 않음 (ADC가 자동으로 처리)
  }, ADMIN_APP_NAME); // <-- 고유한 앱 이름 지정

  console.log(`Firebase Admin SDK initialized with custom app name: ${ADMIN_APP_NAME}`);
}

// 우리가 초기화한 'app'의 firestore()를 export
export const db = app.firestore();

// admin 객체 자체를 export (api/submit-test에서 필요)
export { admin };