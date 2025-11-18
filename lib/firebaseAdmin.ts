// 파일 경로: lib/firebaseAdmin.ts
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export { admin };