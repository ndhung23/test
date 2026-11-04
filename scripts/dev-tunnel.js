// scripts/dev-tunnel.js
// Giữ kết nối Expo Metro Tunnel và Snap Video Resolver Server liên tục.
// Tự động tạo Localtunnel cho Snap Server port 4000 và cấp URL cho Metro.
// => App trên iPhone có thể dùng Snap Video mượt mà trên mọi mạng (Wi-Fi khác, 4G, 5G).

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ENV_LOCAL_PATH = path.join(__dirname, '..', '.env.local');
const SNAP_PORT = 4000;

let metroStarted = false;

// ─── Helpers ────────────────────────────────────────────────────────────────

function readEnvLocal() {
  try { return fs.existsSync(ENV_LOCAL_PATH) ? fs.readFileSync(ENV_LOCAL_PATH, 'utf8') : ''; }
  catch { return ''; }
}

function writeSnapUrl(url) {
  let content = readEnvLocal();
  const line = `EXPO_PUBLIC_SNAP_SERVER_URL=${url}`;
  if (content.includes('EXPO_PUBLIC_SNAP_SERVER_URL=')) {
    content = content.replace(/EXPO_PUBLIC_SNAP_SERVER_URL=.*/g, line);
  } else {
    content = content.trim() ? content.trim() + '\n' + line : line;
  }
  fs.writeFileSync(ENV_LOCAL_PATH, content, 'utf8');
  console.log(`[DEV-TUNNEL] Đã lưu vào .env.local: EXPO_PUBLIC_SNAP_SERVER_URL=${url}`);
}

// ─── 1. Snap Server (port 4000) ──────────────────────────────────────────────

function startSnapServer() {
  console.log('[SNAP-SERVER] Đang khởi chạy Snap Video Backend Resolver (Port 4000)...');
  const snapProcess = spawn('node', [path.join(__dirname, 'snap-server.js')], {
    stdio: 'inherit',
    env: process.env,
  });

  snapProcess.on('close', (code) => {
    console.warn(`[SNAP-SERVER] Snap Server kết thúc (code ${code}). Tự động chạy lại sau 2s...`);
    setTimeout(startSnapServer, 2000);
  });

  snapProcess.on('error', (err) => {
    console.error('[SNAP-SERVER] Lỗi Snap Server:', err.message);
    setTimeout(startSnapServer, 2000);
  });
}

// ─── 2. Localtunnel cho Snap Server (port 4000) ────────────────────────────

function startLocalTunnel() {
  console.log('[SNAP-TUNNEL] Đang khởi tạo Localtunnel cho port 4000...');
  const isWindows = process.platform === 'win32';
  const npx = isWindows ? 'npx.cmd' : 'npx';

  const ltProcess = spawn(npx, ['--yes', 'localtunnel', '--port', String(SNAP_PORT), '--local-host', '127.0.0.1', '--subdomain', 'mma301-snap-tuananh'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
  });

  function handleOutput(data) {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);
    if (match) {
      const publicUrl = match[0];
      console.log(`[SNAP-TUNNEL] ✅ Localtunnel Public URL: ${publicUrl}`);
      writeSnapUrl(publicUrl);

      if (!metroStarted) {
        metroStarted = true;
        startMetroTunnel(publicUrl);
      }
    }
  }

  ltProcess.stdout.on('data', handleOutput);
  ltProcess.stderr.on('data', handleOutput);

  ltProcess.on('close', (code) => {
    console.warn(`[SNAP-TUNNEL] Localtunnel kết thúc (code ${code}). Khởi động lại sau 3s...`);
    setTimeout(startLocalTunnel, 3000);
  });

  ltProcess.on('error', (err) => {
    console.error('[SNAP-TUNNEL] Lỗi Localtunnel:', err.message);
    setTimeout(startLocalTunnel, 3000);
  });
}

// ─── 3. Expo Metro Tunnel ────────────────────────────────────────────────────

function startMetroTunnel(snapPublicUrl) {
  console.log('[WATCHDOG] Đang khởi chạy Expo Metro Tunnel với Snap Server URL:', snapPublicUrl);
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'npx.cmd' : 'npx';

  const child = spawn(cmd, ['expo', 'start', '--tunnel', '-c'], {
    stdio: 'inherit',
    shell: isWindows,
    env: {
      ...process.env,
      EXPO_PUBLIC_SNAP_SERVER_URL: snapPublicUrl,
      NODE_OPTIONS: '--dns-result-order=ipv4first',
    },
  });

  child.on('close', (code) => {
    console.warn(`[WATCHDOG] Expo Tunnel kết thúc (code ${code}). Tự động kết nối lại sau 2s...`);
    setTimeout(() => startMetroTunnel(snapPublicUrl), 2000);
  });

  child.on('error', (err) => {
    console.error('[WATCHDOG] Lỗi khởi chạy Metro:', err.message);
    setTimeout(() => startMetroTunnel(snapPublicUrl), 2000);
  });
}

// ─── Khởi động tuần tự ───────────────────────────────────────────────────────
startSnapServer();
startLocalTunnel();
