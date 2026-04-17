// ============================================================
// FIREBASE AUTH MODULE
// ============================================================

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;
let isSignUp = false;

try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
} catch (e) {
  console.warn('Firebase not configured yet. Auth features disabled.');
}

export const authModule = {
  user: null,
  onUserChange: null,
  hasUnsavedWork: false,

  init(onUserChange) {
    this.onUserChange = onUserChange;
    if (!auth) return;

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      this.user = user;
      if (this.onUserChange) this.onUserChange(user);

      if (user) {
        // Load saved config
        const saved = await this.loadConfig();
        if (saved && this.onConfigLoaded) {
          this.onConfigLoaded(saved);
        }
      }
    });
  },

  showModal() {
    document.getElementById('authModal').classList.add('open');
  },

  closeModal() {
    document.getElementById('authModal').classList.remove('open');
  },

  toggleMode() {
    isSignUp = !isSignUp;
    document.getElementById('authModalTitle').textContent = isSignUp ? 'Create Account' : 'Sign In';
    document.getElementById('authSubmitBtn').textContent = isSignUp ? 'Create Account' : 'Sign In';
    document.getElementById('authToggleText').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
    document.getElementById('authToggleLink').textContent = isSignUp ? 'Sign in' : 'Create one';
  },

  async signInGoogle() {
    if (!auth) {
      window.app.toast('Firebase not configured. Add your config to js/firebase-config.js', 'error');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      this.closeModal();
      window.app.toast('Signed in successfully!', 'success');
    } catch (e) {
      window.app.toast('Sign in failed: ' + e.message, 'error');
    }
  },

  async submitEmail() {
    if (!auth) {
      window.app.toast('Firebase not configured. Add your config to js/firebase-config.js', 'error');
      return;
    }
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    if (!email || !password) {
      window.app.toast('Please enter email and password', 'error');
      return;
    }
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      this.closeModal();
      window.app.toast('Signed in successfully!', 'success');
    } catch (e) {
      window.app.toast(e.message, 'error');
    }
  },

  async signOutUser() {
    if (!auth) return;
    await signOut(auth);
    window.app.toast('Signed out', 'success');
  },

  async saveConfig(config) {
    if (!db || !currentUser) return;
    try {
      await setDoc(doc(db, 'configs', currentUser.uid), {
        ...config,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error('Save failed:', e);
    }
  },

  async loadConfig() {
    if (!db || !currentUser) return null;
    try {
      const snap = await getDoc(doc(db, 'configs', currentUser.uid));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  }
};
