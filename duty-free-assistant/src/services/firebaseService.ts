import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type { Receipt, UserCredential } from '../types';

/**
 * [Firestore DB 구조 설계]
 * users/{username} : 계정 정보 (닉네임, 비밀번호, 설정 등)
 * users/{username}/receipts/{receiptId} : 유저별 영수증 문서들
 */

// 비동기 요청 무한 대기 방지를 위한 타임아웃 유틸리티
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
}

// 1. 유저 계정 정보 가져오기 (최대 1.5초 타임아웃으로 로딩 지연 방지)
export async function getFirebaseUserCredential(username: string): Promise<UserCredential | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const userDocRef = doc(db, 'users', username);
    const snap = await withTimeout(getDoc(userDocRef), 1500, null);
    if (snap && snap.exists()) {
      return snap.data() as UserCredential;
    }
    return null;
  } catch (err) {
    console.error('Failed to get user credential from Firebase:', err);
    return null;
  }
}

// 2. 유저 계정 정보 저장/초기화 (최대 1.5초 타임아웃으로 무한 로딩 원천 차단)
export async function saveFirebaseUserCredential(
  username: string, 
  pass?: string, 
  extra?: {
    freeCaptureCount?: number;
    isSubscribed?: boolean;
    findQuestion?: string;
    findAnswer?: string;
    resetQuestion?: string;
    resetAnswer?: string;
  }
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    const userDocRef = doc(db, 'users', username);
    const dataToSave: any = {
      username,
      updatedAt: Date.now()
    };
    if (pass !== undefined) dataToSave.password = pass;
    if (extra?.freeCaptureCount !== undefined) dataToSave.freeCaptureCount = extra.freeCaptureCount;
    if (extra?.isSubscribed !== undefined) dataToSave.isSubscribed = extra.isSubscribed;
    if (extra?.findQuestion !== undefined) dataToSave.findQuestion = extra.findQuestion;
    if (extra?.findAnswer !== undefined) dataToSave.findAnswer = extra.findAnswer;
    if (extra?.resetQuestion !== undefined) dataToSave.resetQuestion = extra.resetQuestion;
    if (extra?.resetAnswer !== undefined) dataToSave.resetAnswer = extra.resetAnswer;

    const ok = await withTimeout(
      setDoc(userDocRef, dataToSave, { merge: true }).then(() => true),
      1500,
      false
    );
    return ok;
  } catch (err) {
    console.error('Failed to save user credential to Firebase:', err);
    return false;
  }
}

// 2-1. 유저의 구독 및 무료 촬영 카운트 업데이트
export async function updateFirebaseSubscription(
  username: string,
  freeCaptureCount: number,
  isSubscribed: boolean
): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !username) return false;
  try {
    const userDocRef = doc(db, 'users', username);
    await setDoc(userDocRef, {
      freeCaptureCount,
      isSubscribed,
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to update subscription in Firebase:', err);
    return false;
  }
}

// 3. 유저의 전체 영수증 목록 로드
export async function loadFirebaseReceipts(username: string): Promise<Receipt[]> {
  if (!isFirebaseConfigured || !db || !username) return [];
  try {
    const receiptsColRef = collection(db, 'users', username, 'receipts');
    const snap = await getDocs(receiptsColRef);
    const list: Receipt[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Receipt);
    });
    // 최신순 정렬
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (err) {
    console.error('Failed to load receipts from Firebase:', err);
    return [];
  }
}

// 4. 단일 영수증 저장/수정 (undefined 필드 제거 및 1MB 문서 한도 초과 방지)
export async function saveFirebaseReceipt(username: string, receipt: Receipt): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !username) return false;
  try {
    const receiptDocRef = doc(db, 'users', username, 'receipts', receipt.id);
    const sanitized = JSON.parse(JSON.stringify(receipt));
    if (sanitized.imageUrl && sanitized.imageUrl.length > 700000) {
      delete sanitized.imageUrl;
    }
    await setDoc(receiptDocRef, sanitized, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save receipt to Firebase:', err);
    return false;
  }
}

// 5. 단일 영수증 삭제
export async function deleteFirebaseReceipt(username: string, receiptId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !username) return false;
  try {
    const receiptDocRef = doc(db, 'users', username, 'receipts', receiptId);
    await deleteDoc(receiptDocRef);
    return true;
  } catch (err) {
    console.error('Failed to delete receipt from Firebase:', err);
    return false;
  }
}

// 6. 특정 유저 계정 및 하위 영수증 전체 삭제
export async function deleteFirebaseUserAccount(username: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !username) return false;
  try {
    const receiptsColRef = collection(db, 'users', username, 'receipts');
    const snap = await withTimeout(getDocs(receiptsColRef), 2000, null);
    if (snap) {
      const deletions: Promise<void>[] = [];
      snap.forEach((d) => {
        deletions.push(deleteDoc(d.ref));
      });
      await Promise.all(deletions);
    }
    const userDocRef = doc(db, 'users', username);
    await withTimeout(deleteDoc(userDocRef), 1500, undefined);
    return true;
  } catch (err) {
    console.error('Failed to delete user account from Firebase:', err);
    return false;
  }
}
