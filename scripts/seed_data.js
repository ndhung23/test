// scripts/seed_data.js
// Khởi tạo dữ liệu mẫu lên Cloud Firestore

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, addDoc, collection } = require('firebase/firestore');

// Đọc file .env
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('[LỖI] Không tìm thấy file .env!');
  console.log('Vui lòng sao chép file .env.example thành .env và điền các API key Firebase.');
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"]|['"]$/g, '');
    env[match[1]] = value;
  }
});

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log('[FIREBASE SEED] Cấu hình từ .env:');
console.log('Project ID:', firebaseConfig.projectId);
console.log('Auth Domain:', firebaseConfig.authDomain);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Danh sách người dùng mẫu
const SEED_USERS = [
  {
    id: 'admin_toolkit',
    email: 'admin@toolkit.com',
    name: 'Admin Quản Trị',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vip_toolkit',
    email: 'vip@toolkit.com',
    name: 'Người dùng VIP Gold',
    role: 'vip',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_toolkit',
    email: 'user@toolkit.com',
    name: 'Người dùng Thường',
    role: 'free',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_nguyenvana',
    email: 'nguyenvana@gmail.com',
    name: 'Nguyễn Văn A',
    role: 'free',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_tranvanb',
    email: 'tranvanb@vip.com',
    name: 'Trần Văn B',
    role: 'vip',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_lethic',
    email: 'lethic@gmail.com',
    name: 'Lê Thị C',
    role: 'free',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_phamduyd',
    email: 'phamduyd@vip.com',
    name: 'Phạm Duy D',
    role: 'vip',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_hoangminhe',
    email: 'hoangminhe@toolkit.com',
    name: 'Hoàng Minh E',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

// 2. Trạng thái các tiện ích
const SEED_TOGGLES = {
  fap_exam: true,
  pdf: true,
  screentime: true,
  clean_photos: true,
  fb_multi: true,
  ai_reply: true,
};

// 3. Nhật ký sử dụng mẫu
const SEED_LOGS = [
  { toolId: 'pdf', userEmail: 'user@toolkit.com', role: 'free', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { toolId: 'ai_reply', userEmail: 'vip@toolkit.com', role: 'vip', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { toolId: 'fb_multi', userEmail: 'vip@toolkit.com', role: 'vip', createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },
  { toolId: 'screentime', userEmail: 'admin@toolkit.com', role: 'admin', createdAt: new Date().toISOString() },
];

async function seed() {
  console.log('\n--- BẮT ĐẦU ĐẨY DỮ LIỆU LÊN FIRESTORE ---');

  // Ghi users
  console.log('1. Đang ghi danh sách người dùng vào collection "users"...');
  for (const u of SEED_USERS) {
    const userRef = doc(db, 'users', u.id);
    await setDoc(userRef, u, { merge: true });
    console.log(`   + Đã ghi user: ${u.email} [${u.role.toUpperCase()}]`);
  }

  // Ghi feature toggles
  console.log('2. Đang ghi trạng thái 8 tiện ích vào collection "feature_toggles"...');
  const toggleRef = doc(db, 'feature_toggles', 'status');
  await setDoc(toggleRef, SEED_TOGGLES, { merge: true });
  console.log('   + Đã ghi trạng thái 8 tiện ích.');

  // Ghi usage logs
  console.log('3. Đang ghi nhật ký sử dụng vào collection "usage_logs"...');
  const logsCol = collection(db, 'usage_logs');
  for (const log of SEED_LOGS) {
    await addDoc(logsCol, log);
    console.log(`   + Log: ${log.toolId} bởi ${log.userEmail}`);
  }

  console.log('\n=== HOÀN TẤT SEED DỮ LIỆU LÊN CLOUD FIRESTORE THÀNH CÔNG! ===\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n[LỖI SEED DATA]:', err.message);
  console.error('Chi tiết:', err);
  process.exit(1);
});
