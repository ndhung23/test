# Snap Video backend: URL cố định

Ảnh hiện tại chứng minh iPhone không truy cập được `http://192.168.1.165:4000`: địa chỉ LAN chỉ hoạt động khi PC đang bật, không ngủ, cùng Wi‑Fi và firewall cho phép cổng 4000. TikTok vẫn chạy vì dùng API bên thứ ba trong app; YouTube/Facebook/Instagram cần backend này.

## Cách ổn định miễn phí: Cloudflare Tunnel có domain cố định

1. Có một domain trong Cloudflare, cài `cloudflared` trên PC/VPS chạy backend.
2. Tạo tunnel có tên: `cloudflared tunnel create toolkit-snap`.
3. Route domain: `cloudflared tunnel route dns toolkit-snap snap.example.com`.
4. Tạo cấu hình tunnel trỏ `http://localhost:4000`, rồi cài service: `cloudflared service install`.
5. Chạy backend bền vững bằng PM2: `npm i -g pm2`; `pm2 start scripts/snap-server.js --name toolkit-snap`; `pm2 save`; `pm2 startup`.
6. Đặt `EXPO_PUBLIC_SNAP_SERVER_URL=https://snap.example.com` trong môi trường build, tạo lại Expo development build/APK. Không dùng quick tunnel vì URL đổi sau mỗi lần restart.

Kiểm tra bằng Safari iPhone: mở `https://snap.example.com/health`. Kết quả phải có `status: ok`, `ytDlpVersion`, `ffmpegAvailable: true` và `ffprobeAvailable: true` trước khi thử YouTube.
