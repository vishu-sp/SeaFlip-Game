// Firebase handles passwords and session tokens; this app never stores passwords.
// https://firebase.google.com/docs/auth/web/password-auth
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';

let auth;

export async function initAuth(onUserChanged) {
  const response = await fetch('/api/config');
  const config = await response.json();

  if (!config.apiKey || config.apiKey.startsWith('your-')) {
    throw new Error(
      'Setup needed: follow README.md and add your Firebase settings to .env.',
    );
  }

  auth = getAuth(initializeApp(config));
  await setPersistence(auth, browserSessionPersistence);
  onAuthStateChanged(auth, onUserChanged);
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  await result.user.getIdToken(true);
  return result;
}

export const logout = () => signOut(auth);
export const reset = (email) => sendPasswordResetEmail(auth, email);

export async function token() {
  if (!auth?.currentUser) {
    throw new Error('Please sign in first.');
  }

  return auth.currentUser.getIdToken();
}
