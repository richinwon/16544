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

// 1. 유저 계정 정보 가져오기
export async function getFirebaseUserCredential(username: string): Promise<UserCredential | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const userDocRef = doc(db, 'users', username);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserCredential;
    }
    return null;
  } catch (err) {
    console.error('Failed to get user credential from Firebase:', err);
    return null;
  }
}

// 2. 유저 계정 정보 저장/초기화
export async function saveFirebaseUserCredential(username: string, pass: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    const userDocRef = doc(db, 'users', username);
    await setDoc(userDocRef, {
      username,
      password: pass,
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save user credential to Firebase:', err);
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

// 4. 단일 영수증 저장/수정
export async function saveFirebaseReceipt(username: string, receipt: Receipt): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !username) return false;
  try {
    const receiptDocRef = doc(db, 'users', username, 'receipts', receipt.id);
    await setDoc(receiptDocRef, receipt, { merge: true });
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
