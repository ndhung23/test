# Android test checklist

Trạng thái hiện tại: **chưa có máy Android để chạy**. Expo Go chỉ dùng engine tải foreground; không khẳng định tải nền native cho tới khi có development build/APK.

## Cài đặt và quyền

1. Cài APK preview, mở lần đầu và từ chối rồi cấp lại quyền thông báo trong Cài đặt.
   - Mong đợi: không crash; nhắc việc nói rõ khi chưa có quyền và chỉ lên lịch sau khi được cấp.
2. Vào Snap Video, tải một video MP4 công khai.
   - Mong đợi: video xuất hiện trong thư viện/album `Snap Video` hoặc MediaStore và lịch sử chỉ có dấu xanh khi asset xác minh được.
3. Tải audio M4A/MP3.
   - Mong đợi: hộp chia sẻ cho phép chọn Downloads/Music hoặc app khác; không ghi là đã lưu vào Ảnh.

## Thông báo

1. Tạo việc có giờ nhắc sau 2 phút; thử khi app mở, nền, vuốt tắt và sau khi khởi động lại máy.
   - Mong đợi: một notification kênh `Nhắc nhở việc vặt`, tiêu đề ngắn và thân chứa tên việc + ghi chú.
2. Bấm notification ở ba trạng thái trên.
   - Mong đợi: mở Chu kỳ việc vặt, bỏ bộ lọc và cuộn tới việc được tô sáng.
3. Sửa giờ, tắt chuông rồi xóa việc.
   - Mong đợi: notification cũ bị hủy, không còn nhắc ma hay nhắc trùng.
4. Trên Android 12+, kiểm tra quyền báo thức chính xác và tắt tối ưu pin (đặc biệt Xiaomi/Oppo/Samsung).
   - Mong đợi: hệ điều hành có thể vẫn trì hoãn khi quyền/tối ưu pin bị chặn; ghi nhận hãng và phiên bản Android.

## Tải và giao diện

1. Tải video 720p/1080p, chuyển app sang nền 30 giây rồi quay lại.
   - Mong đợi: Expo Go có thể bị hệ điều hành dừng; khi quay lại không báo thành công nếu file chưa xác minh.
2. Test iPhone-size nhỏ, Android thường và font lớn: header, chip, thẻ việc, lịch sử tải, form và bàn phím.
   - Mong đợi: không tràn/cắt chữ, thao tác Back vật lý đóng modal trước.
