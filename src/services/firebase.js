// src/services/firebase.js
// Dịch vụ tích hợp Firebase Authentication và Cloud Firestore cho ToolKit

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { initializeApp, getApps, getApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  sendPasswordResetEmail,
} from 'firebase/auth';

import * as Crypto from 'expo-crypto';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { ROLES } from '../constants/roles';

WebBrowser.maybeCompleteAuthSession();

// Cấu hình Firebase đọc từ biến môi trường (EXPO_PUBLIC_...)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Kiểm tra xem Firebase đã được cấu hình với API Key thật hay chưa
export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.length > 10 &&
    firebaseConfig.projectId
  );
};

// Khởi tạo Firebase App
let app = null;
let auth = null;
let db = null;

try {
  if (isFirebaseConfigured()) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch {
      auth = getAuth(app);
    }
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('[Firebase] Khởi tạo ở chế độ Offline Fallback:', e?.message);
}

export { auth, db };

/* ===================================================================
 * 1. DỊCH VỤ AUTHENTICATION
 * =================================================================== */

// Đăng nhập Firebase Auth
export async function firebaseSignIn(email, password) {
  if (!isFirebaseConfigured() || !auth) {
    // Chế độ fallback offline
    return null;
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err) {
    console.warn('[Firebase Auth] Đăng nhập lỗi, chuyển sang Fallback:', err.message);
    throw err;
  }
}

// Đăng ký Firebase Auth & tự động tạo profile trên Firestore
export async function firebaseSignUp(email, password, name, role = ROLES.FREE) {
  if (!isFirebaseConfigured() || !auth) {
    return null;
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  // Tạo document trong collection 'users'
  await saveUserToFirestore(user.uid, {
    email: user.email,
    name: name || email.split('@')[0],
    role,
    createdAt: new Date().toISOString(),
  });

  return user;
}

// Đăng xuất Firebase
export async function firebaseSignOut() {
  if (auth) {
    try {
      await signOut(auth);
    } catch {}
  }
}

// Đăng nhập bằng Google (Hỗ trợ đa nền tảng Web & Mobile)
export async function firebaseSignInWithGoogle() {
  if (!isFirebaseConfigured() || !auth) {
    throw new Error('Firebase chưa được cấu hình với API Key.');
  }

  // 1. Nền tảng Web: Sử dụng popup trực tiếp của Firebase
  if (Platform.OS === 'web' && typeof signInWithPopup === 'function') {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (err) {
      console.warn('[Firebase Auth Web] Đăng nhập Google lỗi:', err.message);
      throw err;
    }
  }

  // 2. Nền tảng Native (iOS / Android trong Expo):
  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error(
      'Để đăng nhập Google trên điện thoại, vui lòng cấu hình Google Web Client ID trong file .env:\n' +
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-client-id.apps.googleusercontent.com\n\n' +
      '(Bạn có thể đăng nhập Google ngay trên bản Web tại http://localhost:8082).'
    );
  }

  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'toolkit',
      preferLocalhost: false,
    });
    console.log('[Google Auth] Redirect URI cấu hình:', redirectUri);

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}` +
      `&response_type=id_token%20token` +
      `&scope=${encodeURIComponent('openid profile email')}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&nonce=${Date.now()}`;

    const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (authResult.type !== 'success' || !authResult.url) {
      if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
        throw new Error('Bạn đã đóng cửa sổ đăng nhập Google.');
      }
      throw new Error('Xác thực Google không thành công.');
    }

    const hashIndex = authResult.url.indexOf('#');
    const queryIndex = authResult.url.indexOf('?');
    const queryString =
      hashIndex !== -1
        ? authResult.url.substring(hashIndex + 1)
        : queryIndex !== -1
        ? authResult.url.substring(queryIndex + 1)
        : '';

    const params = new URLSearchParams(queryString);
    const errorParam = params.get('error') || params.get('error_description');
    if (errorParam) {
      throw new Error(`Google trả về lỗi: ${errorParam}`);
    }

    const idToken = params.get('id_token');

    if (!idToken) {
      throw new Error('Không nhận được mã định danh id_token từ Google.');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (err) {
    console.warn('[Firebase Auth Native] Đăng nhập Google lỗi:', err.message);
    throw err;
  }
}

// Gửi email đặt lại mật khẩu kèm liên kết (Hiệu lực 5 phút)
export async function firebaseSendPasswordReset(email) {
  if (!isFirebaseConfigured() || !auth) {
    throw new Error('Firebase chưa được cấu hình với API Key.');
  }
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (err) {
    console.warn('[Firebase Auth] Lỗi gửi email reset password:', err.message);
    throw err;
  }
}

/* ===================================================================
 * 2. CLOUD FIRESTORE: QUẢN LÝ USER VÀ ROLE
 * =================================================================== */

// Lưu thông tin người dùng vào collection 'users'
export async function saveUserToFirestore(uid, userData) {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...userData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Lỗi lưu user profile:', err.message);
    return false;
  }
}

// Lấy thông tin user kèm vai trò từ Firestore
export async function getUserFromFirestore(uid) {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firestore] Lỗi đọc user profile:', err.message);
  }
  return null;
}

// Lưu thông tin mã OTP khôi phục mật khẩu vào collection 'password_resets'
export async function saveOtpToFirestore(email, otpData) {
  if (!isFirebaseConfigured() || !db || !email) return false;
  try {
    const safeDocId = email.replace(/[^a-zA-Z0-9]/g, '_');
    const otpRef = doc(db, 'password_resets', safeDocId);
    await setDoc(otpRef, {
      email,
      ...otpData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Lỗi lưu mã OTP:', err.message);
    return false;
  }
}

// Tra cứu mã OTP khôi phục mật khẩu từ collection 'password_resets'
export async function getOtpFromFirestore(email) {
  if (!isFirebaseConfigured() || !db || !email) return null;
  try {
    const safeDocId = email.replace(/[^a-zA-Z0-9]/g, '_');
    const otpRef = doc(db, 'password_resets', safeDocId);
    const snap = await getDoc(otpRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firestore] Lỗi đọc mã OTP:', err.message);
  }
  return null;
}

// Gửi mã OTP về email thực qua máy chủ SMTP trung gian
export async function sendOtpViaEmail(email, otp) {
  const cleanEmail = email.trim().toLowerCase();
  const envUrl = process.env.EXPO_PUBLIC_SNAP_SERVER_URL?.replace(/\/$/, '');
  const candidates = [
    envUrl,
    'http://192.168.1.7:4000',
    'http://10.0.2.2:4000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
  ].filter(Boolean);

  let sent = false;
  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        sent = true;
        break;
      }
    } catch {
      // thử candidate tiếp theo
    }
  }
  return sent;
}

// Băm mật khẩu để lưu trữ và xác thực dự phòng trong Firestore
export async function hashPassword(password) {
  if (!password) return '';
  try {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `toolkit_user_salt_${password}`
    );
  } catch {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `local_${Math.abs(hash)}`;
  }
}

// Tìm kiếm hồ sơ người dùng trong Firestore theo email, username hoặc Document ID
export async function findUserInFirestore(identifier) {
  if (!isFirebaseConfigured() || !db || !identifier) return null;
  const clean = identifier.trim().toLowerCase();
  try {
    // 1. Thử trực tiếp Document ID chuẩn user_<id>
    const safeDocId = `user_${clean.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const directSnap = await getDoc(doc(db, 'users', safeDocId));
    if (directSnap.exists()) {
      return { id: directSnap.id, ...directSnap.data() };
    }

    // 2. Thử Document ID thô
    const rawSnap = await getDoc(doc(db, 'users', clean));
    if (rawSnap.exists()) {
      return { id: rawSnap.id, ...rawSnap.data() };
    }

    // 3. Query theo trường email
    const emailQuery = query(collection(db, 'users'), where('email', '==', clean));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const d = emailSnap.docs[0];
      return { id: d.id, ...d.data() };
    }

    // 4. Query theo trường username
    const userQuery = query(collection(db, 'users'), where('username', '==', clean));
    const userSnap = await getDocs(userQuery);
    if (!userSnap.empty) {
      const d = userSnap.docs[0];
      return { id: d.id, ...d.data() };
    }
  } catch (err) {
    console.warn('[Firestore] Lỗi tìm user:', err.message);
  }
  return null;
}

// Cập nhật vai trò (Role) cho người dùng trong Firestore
export async function updateUserRoleInFirestore(uid, newRole) {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('[Firestore] Lỗi cập nhật role:', err.message);
    return false;
  }
}

// Lấy danh sách toàn bộ người dùng cho AdminScreen
export async function getAllUsersFromFirestore() {
  if (!isFirebaseConfigured() || !db) return [];
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[Firestore] Lỗi lấy danh sách user:', err.message);
    return [];
  }
}

/* ===================================================================
 * 3. CLOUD FIRESTORE: QUẢN LÝ CÔNG TẮC TÍNH NĂNG (FEATURE TOGGLES)
 * =================================================================== */

// Lưu trạng thái công tắc tính năng lên Firestore
export async function saveFeatureToggleToFirestore(toolId, isEnabled) {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    const docRef = doc(db, 'feature_toggles', 'status');
    await setDoc(docRef, { [toolId]: isEnabled }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Lỗi lưu feature toggle:', err.message);
    return false;
  }
}

// Lấy trạng thái công tắc tính năng từ Firestore
export async function getFeatureTogglesFromFirestore() {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'feature_toggles', 'status');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firestore] Lỗi đọc feature toggles:', err.message);
  }
  return null;
}

// Lưu cấu hình phân quyền VIP của tiện ích lên Cloud Firestore
export async function saveToolTierToFirestore(toolId, tier) {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    const docRef = doc(db, 'system_config', 'tool_tiers');
    await setDoc(docRef, { [toolId]: tier }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Lỗi lưu tool tier:', err.message);
    return false;
  }
}

// Lấy cấu hình phân quyền VIP của các tiện ích từ Cloud Firestore
export async function getToolTiersFromFirestore() {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const docRef = doc(db, 'system_config', 'tool_tiers');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firestore] Lỗi đọc tool tiers:', err.message);
  }
  return null;
}
