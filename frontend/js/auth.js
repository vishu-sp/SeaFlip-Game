// Firebase manages passwords and session tokens; no custom password storage.
// https://firebase.google.com/docs/auth/web/password-auth
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,updateProfile,signOut,sendPasswordResetEmail,setPersistence,browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
let auth;
export async function initAuth(callback) {
 const config=await (await fetch('/api/config')).json();
 if(!config.apiKey||config.apiKey.startsWith('your-'))throw new Error('Setup needed: follow README.md and add your Firebase settings to .env.');
 auth=getAuth(initializeApp(config));await setPersistence(auth,browserSessionPersistence);
 onAuthStateChanged(auth,callback);
}
export async function login(email,password){return signInWithEmailAndPassword(auth,email,password);}
export async function register(name,email,password){const result=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(result.user,{displayName:name});await result.user.getIdToken(true);return result;}
export const logout=()=>signOut(auth);
export const reset=email=>sendPasswordResetEmail(auth,email);
export async function token(){if(!auth?.currentUser)throw new Error('Please sign in first.');return auth.currentUser.getIdToken();}
