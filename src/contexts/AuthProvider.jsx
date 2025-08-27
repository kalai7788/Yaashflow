import { useState, useEffect } from "react";
import AuthContext from "./AuthContextValue";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCurrentUser({ uid: user.uid, ...userSnap.data() });
        } else {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "",
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Email/Password login
  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Fetch user data from Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { uid: user.uid, ...userSnap.data() };
    } else {
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
      };
    }
  }

  // Email/Password signup
  async function signup(email, password, displayName) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    const userData = {
      email,
      displayName: displayName || "",
      createdAt: serverTimestamp(),
      organization: "", // default empty
    };

    await setDoc(doc(db, "users", user.uid), userData);
    return { uid: user.uid, ...userData };
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

  // Reset password
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Google login
  async function googleSignIn() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create Firestore user doc if missing
      const userData = {
        email: user.email,
        displayName: user.displayName || "",
        createdAt: serverTimestamp(),
        organization: "", // default empty
      };
      await setDoc(userRef, userData);
      return { uid: user.uid, ...userData };
    }

    return { uid: user.uid, ...userSnap.data() };
  }

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    googleSignIn,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
