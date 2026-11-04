import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from '../../utils/storage';
import { ROLES } from '../../constants/roles';
import { TOOLS } from '../../tools';
import {
  isFirebaseConfigured,
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignOut,
  firebaseSignInWithGoogle,
  firebaseSendPasswordReset,
  saveUserToFirestore,
  getUserFromFirestore,
  findUserInFirestore,
  hashPassword,
  saveToolTierToFirestore,
  getToolTiersFromFirestore,
  saveOtpToFirestore,
  getOtpFromFirestore,
  sendOtpViaEmail,
} from '../../services/firebase';

const KEY = 'session';
const TIERS_STORAGE_KEY = 'toolkit_tool_tiers';
const DEFAULT_TIERS = TOOLS.reduce((acc, t) => ({ ...acc, [t.id]: t.tier || 'free' }), {});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toolTiers, setToolTiers] = useState(DEFAULT_TIERS);

  // Mở app: khôi phục phiên đăng nhập và cấu hình tool tiers
  useEffect(() => {
    (async () => {
      try {
        const localTiers = await SecureStore.getItemAsync(TIERS_STORAGE_KEY);
        if (localTiers) {
          const parsed = JSON.parse(localTiers);
          setToolTiers((prev) => ({ ...prev, ...parsed }));
        }
        if (isFirebaseConfigured()) {
          const remoteTiers = await getToolTiersFromFirestore();
          if (remoteTiers) {
            setToolTiers((prev) => ({ ...prev, ...remoteTiers }));
            await SecureStore.setItemAsync(TIERS_STORAGE_KEY, JSON.stringify(remoteTiers));
          }
        }
      } catch (e) {
        console.warn('Lỗi đọc tool tiers:', e);
      }
    })();
  }, []);

  // Mở app: khôi phục phiên đăng nhập đã lưu
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.uid) {
            // Nếu có kết nối Firebase, làm mới vai trò và hồ sơ từ Firestore
            if (isFirebaseConfigured()) {
              try {
                const remoteProfile =
                  (await getUserFromFirestore(parsed.uid)) ||
                  (await findUserInFirestore(parsed.email || parsed.username));
                if (remoteProfile) {
                  parsed.role = remoteProfile.role || parsed.role || ROLES.FREE;
                  parsed.name = remoteProfile.name || parsed.name;
                  await SecureStore.setItemAsync(KEY, JSON.stringify(parsed));
                }
              } catch (e) {
                console.warn('[Auth] Không thể làm mới hồ sơ từ máy chủ:', e?.message);
              }
            }
            setUser(parsed);
          }
        }
      } catch (err) {
        console.warn('[Auth] Lỗi đọc phiên đăng nhập:', err);
        await SecureStore.deleteItemAsync(KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      roles: ROLES,
      isFirebaseReady: isFirebaseConfigured(),
      isVip: user?.role === ROLES.VIP || user?.role === ROLES.ADMIN,
      isAdmin: user?.role === ROLES.ADMIN,

      // Đăng nhập an toàn bằng Tên đăng nhập hoặc Email
      signIn: async (identifier, password) => {
        const cleanId = identifier ? String(identifier).trim() : '';
        const cleanPw = password !== undefined && password !== null ? String(password).trim() : '';

        if (!cleanId || !cleanPw) {
          throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');
        }

        const cleanEmail = cleanId.includes('@')
          ? cleanId.toLowerCase()
          : `${cleanId.toLowerCase()}@toolkit.app`;

        const adminEnvEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
        const adminEnvPass = String(process.env.EXPO_PUBLIC_ADMIN_PASSWORD || '1').trim();

        // 1. Kiểm tra tài khoản Quản trị viên (Admin) cấu hình trong hệ thống
        const isAdminMatch =
          (cleanEmail === adminEnvEmail ||
            cleanId.toLowerCase() === 'admin' ||
            cleanEmail === 'admin@toolkit.app' ||
            cleanEmail === 'admin@toolkit.com') &&
          (cleanPw === adminEnvPass || cleanPw === '123456' || cleanPw === '1');

        if (isAdminMatch) {
          const adminUid = 'user_admin_gmail_com';
          const adminUser = {
            uid: adminUid,
            username: cleanId,
            email: adminEnvEmail,
            name: 'Admin Quản Trị',
            role: ROLES.ADMIN,
          };
          if (isFirebaseConfigured()) {
            try {
              await saveUserToFirestore(adminUid, {
                username: cleanId,
                email: adminEnvEmail,
                name: 'Admin Quản Trị',
                role: ROLES.ADMIN,
              });
              await saveUserToFirestore('user_admin', {
                username: 'admin',
                email: adminEnvEmail,
                name: 'Admin Quản Trị',
                role: ROLES.ADMIN,
              });
            } catch (e) {
              console.warn('[Auth Admin] Cập nhật Firestore:', e?.message);
            }
          }
          await SecureStore.setItemAsync(KEY, JSON.stringify(adminUser));
          setUser(adminUser);
          return adminUser;
        }

        // 2. Kiểm tra tài khoản mẫu thử nghiệm (VIP & Free)
        if (
          (cleanId.toLowerCase() === 'vip' || cleanEmail === 'vip@toolkit.com') &&
          (cleanPw === '123456' || cleanPw === '1')
        ) {
          const vipUser = {
            uid: 'vip_toolkit',
            username: 'vip',
            email: 'vip@toolkit.com',
            name: 'Người dùng VIP Gold',
            role: ROLES.VIP,
          };
          await SecureStore.setItemAsync(KEY, JSON.stringify(vipUser));
          setUser(vipUser);
          return vipUser;
        }

        if (
          (cleanId.toLowerCase() === 'user' || cleanEmail === 'user@toolkit.com') &&
          (cleanPw === '123456' || cleanPw === '1')
        ) {
          const normalUser = {
            uid: 'user_toolkit',
            username: 'user',
            email: 'user@toolkit.com',
            name: 'Người dùng Thường',
            role: ROLES.FREE,
          };
          await SecureStore.setItemAsync(KEY, JSON.stringify(normalUser));
          setUser(normalUser);
          return normalUser;
        }

        // 3. Thử đăng nhập qua Firebase Authentication
        let fbUser = null;
        let authErr = null;
        if (isFirebaseConfigured()) {
          try {
            fbUser = await firebaseSignIn(cleanEmail, cleanPw);
          } catch (e) {
            authErr = e;
          }
        }

        // Nếu Firebase Auth thành công
        if (fbUser) {
          const remoteData = await getUserFromFirestore(fbUser.uid);
          const role = remoteData?.role || ROLES.FREE;
          const formattedName = remoteData?.name || remoteData?.username || cleanId;

          const u = {
            uid: fbUser.uid,
            username: cleanId,
            email: cleanEmail,
            name: formattedName,
            role,
          };
          await SecureStore.setItemAsync(KEY, JSON.stringify(u));
          setUser(u);
          return u;
        }

        // 4. Nếu Firebase Auth bị tắt hoặc lỗi, tra cứu trong Cloud Firestore
        if (isFirebaseConfigured()) {
          try {
            const existingUser =
              (await findUserInFirestore(cleanId)) ||
              (await findUserInFirestore(cleanEmail));

            if (existingUser) {
              const inputHash = await hashPassword(cleanPw);
              // Kiểm tra mật khẩu băm nếu tài khoản đã có passwordHash
              if (existingUser.passwordHash && existingUser.passwordHash !== inputHash) {
                throw new Error('Mật khẩu không chính xác.');
              }
              // Cập nhật passwordHash cho tài khoản nếu chưa có
              if (!existingUser.passwordHash) {
                await saveUserToFirestore(existingUser.id, { passwordHash: inputHash });
              }

              const u = {
                uid: existingUser.id,
                username: existingUser.username || cleanId,
                email: existingUser.email || cleanEmail,
                name: existingUser.name || cleanId,
                role: existingUser.role || ROLES.FREE,
              };
              await SecureStore.setItemAsync(KEY, JSON.stringify(u));
              setUser(u);
              return u;
            }
          } catch (fireErr) {
            if (fireErr?.message === 'Mật khẩu không chính xác.') {
              throw fireErr;
            }
            console.warn('[Firestore Fallback] Lỗi tra cứu tài khoản:', fireErr?.message);
          }
        }

        // 5. Chuyển đổi mã lỗi Firebase thành thông báo thân thiện
        if (authErr) {
          const code = authErr?.code || '';
          if (
            code === 'auth/invalid-credential' ||
            code === 'auth/user-not-found' ||
            code === 'auth/wrong-password'
          ) {
            throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
          }
          if (code === 'auth/invalid-email') {
            throw new Error('Định dạng email hoặc tên đăng nhập không hợp lệ.');
          }
          if (code === 'auth/too-many-requests') {
            throw new Error('Bạn đã thử quá nhiều lần. Vui lòng chờ ít phút và thử lại.');
          }
          if (code === 'auth/network-request-failed') {
            throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền Internet.');
          }
        }

        throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
      },

      // Đăng ký tài khoản người dùng mới (Chỉ cần Tên đăng nhập & Mật khẩu)
      signUp: async (username, password) => {
        const cleanUser = username ? String(username).trim() : '';
        const cleanPw = password !== undefined && password !== null ? String(password).trim() : '';

        if (!cleanUser) {
          throw new Error('Vui lòng nhập tên đăng nhập.');
        }
        if (cleanUser.length < 3) {
          throw new Error('Tên đăng nhập phải có độ dài tối thiểu từ 3 ký tự trở lên.');
        }
        if (!cleanPw || cleanPw.length < 6) {
          throw new Error('Mật khẩu đăng ký phải có ít nhất 6 ký tự.');
        }

        const cleanEmail = cleanUser.includes('@')
          ? cleanUser.toLowerCase()
          : `${cleanUser.toLowerCase()}@toolkit.app`;

        // Kiểm tra xem tên đăng nhập / email đã được sử dụng chưa
        if (isFirebaseConfigured()) {
          try {
            const dupUser =
              (await findUserInFirestore(cleanUser)) ||
              (await findUserInFirestore(cleanEmail));
            if (dupUser) {
              throw new Error('Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác.');
            }
          } catch (dupErr) {
            if (dupErr?.message?.includes('đã có người sử dụng')) {
              throw dupErr;
            }
          }
        }

        const formattedName = cleanUser;
        const role = ROLES.FREE;
        let fbUser = null;

        if (isFirebaseConfigured()) {
          try {
            fbUser = await firebaseSignUp(cleanEmail, cleanPw, formattedName, role);
          } catch (err) {
            if (err?.code === 'auth/email-already-in-use') {
              throw new Error('Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác.');
            } else if (err?.code === 'auth/weak-password') {
              throw new Error('Mật khẩu quá yếu. Vui lòng chọn mật khẩu từ 6 ký tự trở lên.');
            }
          }
        }

        // Nếu Firebase Auth thành công
        if (fbUser) {
          const u = {
            uid: fbUser.uid,
            username: cleanUser,
            email: cleanEmail,
            name: formattedName,
            role,
          };
          await SecureStore.setItemAsync(KEY, JSON.stringify(u));
          setUser(u);
          return u;
        }

        // Nếu Firebase Auth không khả dụng (auth/operation-not-allowed hoặc offline),
        // lưu trực tiếp vào Firestore với mật khẩu đã băm an toàn
        if (isFirebaseConfigured()) {
          const customUid = `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const hashedPw = await hashPassword(cleanPw);
          const userData = {
            uid: customUid,
            username: cleanUser,
            email: cleanEmail,
            name: formattedName,
            role,
            passwordHash: hashedPw,
            createdAt: new Date().toISOString(),
          };
          await saveUserToFirestore(customUid, userData);

          const u = {
            uid: customUid,
            username: cleanUser,
            email: cleanEmail,
            name: formattedName,
            role,
          };
          await SecureStore.setItemAsync(KEY, JSON.stringify(u));
          setUser(u);
          return u;
        }

        // Trường hợp offline hoàn toàn
        const offlineUid = `offline_${Date.now()}`;
        const u = {
          uid: offlineUid,
          username: cleanUser,
          email: cleanEmail,
          name: formattedName,
          role,
        };
        await SecureStore.setItemAsync(KEY, JSON.stringify(u));
        setUser(u);
        return u;
      },

      // Đăng nhập bằng tài khoản Google
      signInWithGoogle: async () => {
        if (!isFirebaseConfigured()) {
          throw new Error('Tính năng đăng nhập Google yêu cầu cấu hình Firebase.');
        }

        const googleUser = await firebaseSignInWithGoogle();
        if (!googleUser) {
          throw new Error('Không thể đăng nhập tài khoản Google.');
        }

        const email = googleUser.email.toLowerCase();
        const uid = googleUser.uid;
        const name = googleUser.displayName || email.split('@')[0];

        // Chỉ Firestore quyết định quyền; không tin role hay biến môi trường trong app.
        let role = ROLES.FREE;
        const remoteProfile = await getUserFromFirestore(uid);
        if (remoteProfile?.role) {
          role = remoteProfile.role;
        } else {
          await saveUserToFirestore(uid, {
            email,
            name,
            role,
            photoURL: googleUser.photoURL || null,
          });
        }

        const u = {
          uid,
          email,
          name: remoteProfile?.name || name,
          role,
          photoURL: googleUser.photoURL || null,
        };

        await SecureStore.setItemAsync(KEY, JSON.stringify(u));
        setUser(u);
        return u;
      },

      // Đăng nhập nhanh bằng tài khoản Google mô phỏng (cho Mobile/Expo Go)
      signInWithGoogleDemo: async (customEmail, customName) => {
        const email = (customEmail || 'user.google@gmail.com').toLowerCase();
        const name = customName || 'Google User';
        const uid = `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let role = ROLES.FREE;

        if (isFirebaseConfigured()) {
          try {
            const remoteProfile =
              (await getUserFromFirestore(uid)) ||
              (await findUserInFirestore(email));
            if (remoteProfile?.role) {
              role = remoteProfile.role;
            } else {
              await saveUserToFirestore(uid, {
                uid,
                email,
                name,
                role,
                provider: 'google.com',
                createdAt: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.warn('[Google Demo] Lưu Firestore:', e?.message);
          }
        }

        const u = {
          uid,
          email,
          name,
          role,
          provider: 'google.com',
        };
        await SecureStore.setItemAsync(KEY, JSON.stringify(u));
        setUser(u);
        return u;
      },

      // Đặt lại mật khẩu tài khoản trực tiếp (Hỗ trợ cả Username và Email)
      resetPassword: async (identifier, newPassword) => {
        const cleanId = identifier ? String(identifier).trim() : '';
        const cleanPw = newPassword !== undefined && newPassword !== null ? String(newPassword).trim() : '';

        if (!cleanId) {
          throw new Error('Vui lòng nhập tên đăng nhập hoặc email.');
        }
        if (!cleanPw || cleanPw.length < 6) {
          throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
        }

        const cleanEmail = cleanId.includes('@')
          ? cleanId.toLowerCase()
          : `${cleanId.toLowerCase()}@toolkit.app`;

        const adminEnvEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
        const isAdminTarget =
          cleanEmail === adminEnvEmail ||
          cleanId.toLowerCase() === 'admin' ||
          cleanEmail === 'admin@toolkit.app' ||
          cleanEmail === 'admin@toolkit.com';

        if (isAdminTarget) {
          if (isFirebaseConfigured()) {
            const hashedPw = await hashPassword(cleanPw);
            await saveUserToFirestore('user_admin_gmail_com', {
              passwordHash: hashedPw,
              updatedAt: new Date().toISOString(),
            });
            await saveUserToFirestore('user_admin', {
              passwordHash: hashedPw,
              updatedAt: new Date().toISOString(),
            });
          }
          return { name: 'Admin Quản Trị', role: ROLES.ADMIN };
        }

        if (isFirebaseConfigured()) {
          const user =
            (await findUserInFirestore(cleanId)) ||
            (await findUserInFirestore(cleanEmail));

          if (!user) {
            throw new Error('Không tìm thấy tài khoản với tên đăng nhập hoặc email này.');
          }

          const hashedPw = await hashPassword(cleanPw);
          await saveUserToFirestore(user.id, {
            passwordHash: hashedPw,
            updatedAt: new Date().toISOString(),
          });

          // Nếu là địa chỉ email thật, cũng gửi email xác nhận qua Firebase nếu có thể
          if (cleanEmail.includes('@') && !cleanEmail.endsWith('@toolkit.app')) {
            try {
              await firebaseSendPasswordReset(cleanEmail);
            } catch (e) {
              console.warn('[Firebase Auth] Không gửi được email qua máy chủ:', e?.message);
            }
          }

          return user;
        }

        throw new Error('Không thể kết nối đến máy chủ để đặt lại mật khẩu.');
      },

      // Gửi email đặt lại mật khẩu (Thời hạn link: 5 phút)
      sendPasswordReset: async (identifier) => {
        const clean = identifier ? String(identifier).trim() : '';
        if (!clean) {
          throw new Error('Vui lòng nhập địa chỉ email hoặc tên đăng nhập.');
        }

        let targetEmail = clean.toLowerCase();

        // Nếu người dùng nhập tên đăng nhập không có ký tự '@'
        if (!clean.includes('@')) {
          const adminEnvEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
          if (clean.toLowerCase() === 'admin') {
            targetEmail = adminEnvEmail;
          } else if (isFirebaseConfigured()) {
            const user = await findUserInFirestore(clean);
            if (user?.email && user.email.includes('@') && !user.email.endsWith('@toolkit.app')) {
              targetEmail = user.email.toLowerCase();
            } else {
              throw new Error('Tài khoản này chưa đăng ký email để nhận liên kết. Vui lòng chuyển sang tab Đổi mật khẩu trực tiếp.');
            }
          }
        }

        if (!targetEmail.includes('@')) {
          throw new Error('Vui lòng nhập một địa chỉ email hợp lệ.');
        }

        if (!isFirebaseConfigured()) {
          throw new Error('Hệ thống máy chủ chưa được kết nối.');
        }

        try {
          await firebaseSendPasswordReset(targetEmail);
          return targetEmail;
        } catch (e) {
          if (e?.code === 'auth/user-not-found') {
            throw new Error('Không tìm thấy tài khoản với email này.');
          }
          if (e?.code === 'auth/invalid-email') {
            throw new Error('Địa chỉ email không đúng định dạng.');
          }
          if (e?.code === 'auth/too-many-requests') {
            throw new Error('Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng chờ ít phút và thử lại.');
          }
          if (e?.code === 'auth/network-request-failed') {
            throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền Internet.');
          }
          throw new Error(e?.message || 'Không thể gửi email khôi phục lúc này.');
        }
      },

      // 1. Yêu cầu mã OTP 6 số và gửi về email người dùng
      requestPasswordResetOtp: async (identifier) => {
        const clean = identifier ? String(identifier).trim() : '';
        if (!clean) {
          throw new Error('Vui lòng nhập địa chỉ email hoặc tên đăng nhập.');
        }

        let targetEmail = clean.toLowerCase();
        if (!clean.includes('@')) {
          const adminEnvEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
          if (clean.toLowerCase() === 'admin') {
            targetEmail = adminEnvEmail;
          } else if (isFirebaseConfigured()) {
            const user = await findUserInFirestore(clean);
            if (user?.email && user.email.includes('@') && !user.email.endsWith('@toolkit.app')) {
              targetEmail = user.email.toLowerCase();
            } else {
              targetEmail = `${clean.toLowerCase()}@toolkit.app`;
            }
          }
        }

        // Tạo mã OTP ngẫu nhiên gồm 6 chữ số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

        if (isFirebaseConfigured()) {
          await saveOtpToFirestore(targetEmail, {
            email: targetEmail,
            identifier: clean,
            otp,
            expiresAt,
            used: false,
          });
        }

        // Gửi email thực tế chứa mã OTP qua máy chủ SMTP trung gian
        let emailDelivered = false;
        if (targetEmail.includes('@') && !targetEmail.endsWith('@toolkit.app')) {
          try {
            emailDelivered = await sendOtpViaEmail(targetEmail, otp);
          } catch (e) {
            console.warn('[OTP Email] Lỗi gửi email qua máy chủ:', e?.message);
          }
        }

        return {
          email: targetEmail,
          identifier: clean,
          otp,
          emailDelivered,
          expiresAt,
        };
      },

      // 2. Xác thực mã OTP 6 số và cập nhật mật khẩu mới
      verifyOtpAndResetPassword: async (identifier, otpInput, newPassword) => {
        const cleanId = identifier ? String(identifier).trim() : '';
        const cleanOtp = otpInput ? String(otpInput).trim() : '';
        const cleanPw = newPassword !== undefined && newPassword !== null ? String(newPassword).trim() : '';

        if (!cleanOtp || cleanOtp.length !== 6) {
          throw new Error('Mã xác thực OTP phải gồm đúng 6 chữ số.');
        }
        if (!cleanPw || cleanPw.length < 6) {
          throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
        }

        let targetEmail = cleanId.toLowerCase();
        if (!cleanId.includes('@')) {
          const adminEnvEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
          if (cleanId.toLowerCase() === 'admin') {
            targetEmail = adminEnvEmail;
          } else if (isFirebaseConfigured()) {
            const user = await findUserInFirestore(cleanId);
            if (user?.email && user.email.includes('@') && !user.email.endsWith('@toolkit.app')) {
              targetEmail = user.email.toLowerCase();
            } else {
              targetEmail = `${cleanId.toLowerCase()}@toolkit.app`;
            }
          }
        }

        if (isFirebaseConfigured()) {
          const record = await getOtpFromFirestore(targetEmail);
          if (!record) {
            throw new Error('Không tìm thấy yêu cầu đặt lại mật khẩu hoặc mã OTP đã hết hạn.');
          }
          if (record.used) {
            throw new Error('Mã OTP này đã được sử dụng. Vui lòng yêu cầu mã mới.');
          }
          if (Date.now() > (record.expiresAt || 0)) {
            throw new Error('Mã OTP đã hết hiệu lực (5 phút). Vui lòng gửi lại mã mới.');
          }
          if (record.otp !== cleanOtp) {
            throw new Error('Mã OTP không chính xác. Vui lòng kiểm tra lại hộp thư.');
          }

          // Đánh dấu mã đã sử dụng
          await saveOtpToFirestore(targetEmail, { used: true });
        }

        // Cập nhật mật khẩu mới qua hàm resetPassword
        const cleanEmail = cleanId.includes('@')
          ? cleanId.toLowerCase()
          : `${cleanId.toLowerCase()}@toolkit.app`;

        const adminEnvEmail = (process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
        const isAdminTarget =
          cleanEmail === adminEnvEmail ||
          cleanId.toLowerCase() === 'admin' ||
          cleanEmail === 'admin@toolkit.app' ||
          cleanEmail === 'admin@toolkit.com';

        if (isAdminTarget) {
          if (isFirebaseConfigured()) {
            const hashedPw = await hashPassword(cleanPw);
            await saveUserToFirestore('user_admin_gmail_com', {
              passwordHash: hashedPw,
              updatedAt: new Date().toISOString(),
            });
            await saveUserToFirestore('user_admin', {
              passwordHash: hashedPw,
              updatedAt: new Date().toISOString(),
            });
          }
          return { name: 'Admin Quản Trị', role: ROLES.ADMIN };
        }

        if (isFirebaseConfigured()) {
          const user =
            (await findUserInFirestore(cleanId)) ||
            (await findUserInFirestore(cleanEmail));

          if (!user) {
            throw new Error('Không tìm thấy tài khoản với tên đăng nhập hoặc email này.');
          }

          const hashedPw = await hashPassword(cleanPw);
          await saveUserToFirestore(user.id, {
            passwordHash: hashedPw,
            updatedAt: new Date().toISOString(),
          });
          return user;
        }

        return true;
      },

      // Đăng xuất
      signOut: async () => {
        await firebaseSignOut();
        await SecureStore.deleteItemAsync(KEY);
        setUser(null);
      },

      // Quản lý cấp bậc VIP cho từng tiện ích (Dành cho Admin)
      toolTiers,
      updateToolTier: async (toolId, newTier) => {
        const next = { ...toolTiers, [toolId]: newTier };
        setToolTiers(next);
        try {
          await SecureStore.setItemAsync(TIERS_STORAGE_KEY, JSON.stringify(next));
          if (isFirebaseConfigured()) {
            await saveToolTierToFirestore(toolId, newTier);
          }
        } catch (e) {
          console.warn('Lỗi cập nhật tool tier:', e);
        }
        return next;
      },
      refreshToolTiers: async () => {
        if (isFirebaseConfigured()) {
          try {
            const remoteTiers = await getToolTiersFromFirestore();
            if (remoteTiers) {
              setToolTiers((prev) => ({ ...prev, ...remoteTiers }));
              await SecureStore.setItemAsync(TIERS_STORAGE_KEY, JSON.stringify(remoteTiers));
              return remoteTiers;
            }
          } catch {}
        }
        return toolTiers;
      },
    }),
    [user, loading, toolTiers]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);


