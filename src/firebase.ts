import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error:', serialized);
  throw new Error(serialized);
}

export function formatFriendlyFirestoreError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as Partial<FirestoreErrorInfo>;
    const msg = parsed.error || raw;
    if (msg.includes('Quota exceeded')) {
      return 'Daily Firestore free-tier quota exceeded. Quota resets tomorrow.';
    }
    if (msg.includes('Missing or insufficient permissions') || msg.includes('PERMISSION_DENIED')) {
      return 'Permission denied while accessing shop data. Ensure your email is verified and sign in again.';
    }
    if (msg.includes('the client is offline')) {
      return 'Unable to reach Cloud Firestore. Check your internet connection and try again.';
    }
    return msg;
  } catch {
    if (raw.includes('Quota exceeded')) {
      return 'Daily Firestore free-tier quota exceeded. Quota resets tomorrow.';
    }
    if (raw.includes('the client is offline')) {
      return 'Unable to reach Cloud Firestore. Check your internet connection and try again.';
    }
    return raw;
  }
}

export function formatAuthError(err: unknown): string {
  const codeOrMsg = err instanceof Error ? err.message : String(err);
  if (codeOrMsg.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not enabled in Firebase Authentication yet. Enable Email/Password under Authentication > Sign-in method in Firebase Console, or sign in with Google below.';
  }
  if (codeOrMsg.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Please switch to Sign In instead.';
  }
  if (codeOrMsg.includes('auth/invalid-credential') || codeOrMsg.includes('auth/wrong-password')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (codeOrMsg.includes('auth/user-not-found')) {
    return 'No business account found with that email address.';
  }
  if (codeOrMsg.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (codeOrMsg.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (codeOrMsg.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (codeOrMsg.includes('popup-closed-by-user')) {
    return 'Sign-in window was closed before completing login. Please try again.';
  }
  if (codeOrMsg.includes('popup-blocked')) {
    return 'Popup was blocked by your browser. Allow popups for this site and try again.';
  }
  return formatFriendlyFirestoreError(err);
}

export async function testFirestoreConnection(): Promise<{ ok: boolean; offline: boolean }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true, offline: false };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration — Firestore client is offline.');
      return { ok: false, offline: true };
    }
    return { ok: true, offline: false };
  }
}

export async function signInShopOwner(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signUpWithEmail(
  fullName: string,
  email: string,
  password: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (fullName.trim()) {
    await updateProfile(cred.user, { displayName: fullName.trim() });
  }
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) throw new Error('No signed-in user found.');
  await sendEmailVerification(auth.currentUser);
}

export async function refreshCurrentUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function sendShopPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutShopOwner(): Promise<void> {
  await signOut(auth);
}

export async function getAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(extra || {}),
  };
}

export { onAuthStateChanged };
