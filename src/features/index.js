// src/features/index.js
// Export tập trung toàn bộ các module tính năng (1 feature = 1 folder)

// 1. FPT FAP (Lịch thi, Thời khóa biểu & Điểm danh)
export * from './fap';

// 2. Thời gian sử dụng & Tập trung Pomodoro
export * from './screentime';

// 3. Xác thực người dùng & Phân quyền
export * from './auth';

// 4. Tiện ích PDF
export * from './image-to-pdf';

// 5. Tiện ích dọn ảnh trùng lặp
export * from './clean-photos';

// 6. Quản lý đa tài khoản (Zalo, Messenger, Facebook, v.v.)
export * from './multi';

// 7. AI Gợi ý trả lời tin nhắn
export * from './ai-reply';

// 8. Quản trị hệ thống (Admin)
export * from './admin';

// 9. Cài đặt & Tài khoản (Settings & Profile)
export * from './settings';

// 10. Trang chủ & Danh mục công cụ (Home & Tools)
export * from './home';

// 11. Tải video từ mạng xã hội (Snap Video)
export * from './snap-video';


// 13. Theo dõi việc vặt & Chu kỳ sinh hoạt (Micro-Habit & Refill Tracker)
export * from './micro-habit';
