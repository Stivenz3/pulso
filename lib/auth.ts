import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  type User as FirebaseUser,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "./firebase";
import { createUserDoc } from "./firestore";

export interface AuthResult {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  console.log("[Auth] registerWithEmail →", { email, name, passwordLen: password.length });
  let createdUser: FirebaseUser | null = null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    createdUser = cred.user;
    console.log("[Auth] createUser OK →", cred.user.uid);
    await updateProfile(cred.user, { displayName: name });
    console.log("[Auth] updateProfile OK");
    await createUserDoc(cred.user.uid, name, email);
    console.log("[Auth] createUserDoc OK");
    return { uid: cred.user.uid, name, email };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error("[Auth] registerWithEmail FAILED →", { code: e.code, message: e.message });
    // Si el usuario se creó en Auth pero Firestore falló, lo eliminamos
    // para no dejar estado inconsistente
    if (createdUser && e.code !== "auth/email-already-in-use") {
      await deleteUser(createdUser).catch(() => {});
    }
    throw err;
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  const displayName = user.displayName || email.split("@")[0];
  await createUserDoc(user.uid, displayName, user.email || email, user.photoURL || undefined);
  return {
    uid: user.uid,
    name: displayName,
    email: user.email || email,
    photoURL: user.photoURL || undefined,
  };
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(
  callback: (user: AuthResult | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    console.log("[Auth] onAuthStateChanged →", firebaseUser ? firebaseUser.uid : "null");
    if (!firebaseUser) {
      callback(null);
      return;
    }
    callback({
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuario",
      email: firebaseUser.email || "",
      photoURL: firebaseUser.photoURL || undefined,
    });
  });
}
