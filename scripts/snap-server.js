// scripts/snap-server.js
// Micro-backend chạy yt-dlp + ffmpeg trên IP dân cư (Residential IP) để vượt qua chặn Botguard,
// hỗ trợ lựa chọn chất lượng video (1080p, 720p, 480p, 360p), ghép âm thanh bằng FFmpeg và đo ffprobe chuẩn xác
const http = require('http');
const tls = require('tls');
const { execFile, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = Number(process.env.SNAP_SERVER_PORT || 4000);
const YTDLP_PATH = path.join(__dirname, '..', 'yt-dlp.exe');
const FFMPEG_PATH = path.join(__dirname, '..', 'ffmpeg.exe');
const FFPROBE_PATH = path.join(__dirname, '..', 'ffprobe.exe');
const COOKIES_PATH = path.join(__dirname, '..', 'cookies.txt');
const DOWNLOADS_DIR = path.join(__dirname, '..', 'temp_downloads');
const DEBUG_DIR = path.join(DOWNLOADS_DIR, 'debug');
const outputMetadata = new Map();
const backendState = { lastUpdateAt: null, lastUpdateError: null, lastYoutubeSuccessAt: null, lastYoutubeError: null };

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

// Tự động dọn file giao cho app sau 30 phút, giữ raw/final debug trong 1 giờ.
function cleanOldDownloads() {
  try {
    const now = Date.now();
    for (const [directory, maxAge] of [[DOWNLOADS_DIR, 30 * 60 * 1000], [DEBUG_DIR, 60 * 60 * 1000]]) {
      for (const f of fs.readdirSync(directory)) {
        const fp = path.join(directory, f);
        const stat = fs.statSync(fp);
        if (stat.isFile() && now - stat.mtimeMs > maxAge) {
          fs.unlinkSync(fp);
        }
      }
    }
  } catch {
    // ignore
  }
}

function findGeneratedFile(prefix) {
  const files = fs.readdirSync(DEBUG_DIR)
    .filter((name) => name.startsWith(prefix))
    .map((name) => ({ name, stat: fs.statSync(path.join(DEBUG_DIR, name)) }))
    .filter(({ stat }) => stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  return files[0] ? path.join(DEBUG_DIR, files[0].name) : null;
}

function buildOutputName(mode, platform, title) {
  const extension = mode === 'audio' ? 'mp3' : 'mp4';
  const cleanTitle = String(title || (mode === 'audio' ? 'Audio' : 'Video'))
    .replace(/[Đđ]/g, (letter) => letter === 'Đ' ? 'D' : 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'Media';
  return `${cleanTitle}-${platform}.${extension}`;
}

function titleFromYtDlpOutput(stdout) {
  const line = stdout.split(/\r?\n/).find((item) => item.startsWith('__SNAP_TITLE__:'));
  return line ? line.slice('__SNAP_TITLE__:'.length).trim() : '';
}

let cachedYtDlpVersion = null;
function getYtDlpVersion() {
  if (cachedYtDlpVersion) return cachedYtDlpVersion;
  try {
    cachedYtDlpVersion = execFileSync(YTDLP_PATH, ['--version'], { encoding: 'utf8', timeout: 8000 }).trim();
    return cachedYtDlpVersion;
  } catch {
    return 'unavailable';
  }
}

function updateYtDlpIfDue() {
  const day = 24 * 60 * 60 * 1000;
  if (backendState.lastUpdateAt && Date.now() - new Date(backendState.lastUpdateAt).getTime() < day) return;
  backendState.lastUpdateAt = new Date().toISOString();
  execFile(YTDLP_PATH, ['-U'], { timeout: 30000 }, (error, stdout, stderr) => {
    if (!error && stdout) cachedYtDlpVersion = stdout.trim();
    backendState.lastUpdateError = error ? (stderr || error.message || 'update failed').toString().slice(0, 300) : null;
    console.log('[SnapServer] yt-dlp update:', backendState.lastUpdateError || stdout.trim());
  });
}

function normalizeInstagramUrl(rawUrl) {
  try {
    let clean = (rawUrl || '').trim();
    // Bỏ query parameters như ?igsh=...
    clean = clean.split('?')[0].split('&')[0];
    return clean;
  } catch {
    return rawUrl;
  }
}

function normalizeTrackingParams(rawUrl) {
  const url = new URL(rawUrl);
  for (const key of [...url.searchParams.keys()]) {
    if (key === 'igsh' || key === 'fbclid' || key === 'mibextid' || key === 'si' || key.startsWith('utm_')) url.searchParams.delete(key);
  }
  return url.toString();
}

function isSupportedMediaUrl(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
    return [
      'youtube.com', 'm.youtube.com', 'youtu.be',
      'tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
      'facebook.com', 'm.facebook.com', 'fb.watch',
      'instagram.com',
    ].includes(hostname) || hostname.endsWith('.tiktok.com') || hostname.endsWith('.facebook.com');
  } catch {
    return false;
  }
}

function probeVideoFile(filePath) {
  if (!fs.existsSync(FFPROBE_PATH)) {
    throw { code: 'FFPROBE_MISSING', message: 'Máy chủ thiếu ffprobe nên không thể xác minh video.' };
  }
  const output = execFileSync(FFPROBE_PATH, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', filePath], { encoding: 'utf8' });
  const probe = JSON.parse(output);
  const video = probe.streams?.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
  const duration = Number(probe.format?.duration || video?.duration || 0);
  if (!video || !video.width || !video.height || duration <= 0) {
    throw { code: 'INVALID_MEDIA', message: 'Backend tạo file không có luồng video hợp lệ; không gửi file này về iPhone.' };
  }
  return {
    width: video.width,
    height: video.height,
    vcodec: video.codec_name,
    acodec: audio?.codec_name || null,
    duration,
    format: probe.format?.format_name || null,
  };
}

function runFile(command, args, timeout = 120000) {
  return new Promise((resolve, reject) => execFile(command, args, { timeout }, (error, stdout, stderr) => error ? reject(Object.assign(error, { stderr })) : resolve({ stdout, stderr })));
}

function probeMediaFile(filePath) {
  const output = execFileSync(FFPROBE_PATH, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filePath], { encoding: 'utf8' });
  const probe = JSON.parse(output);
  const video = probe.streams?.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
  const duration = Number(probe.format?.duration || 0);
  const fd = fs.openSync(filePath, 'r');
  const sample = Buffer.alloc(Math.min(fs.statSync(filePath).size, 1024 * 1024));
  fs.readSync(fd, sample, 0, sample.length, 0);
  fs.closeSync(fd);
  const moovOffset = sample.indexOf(Buffer.from('moov'));
  const mdatOffset = sample.indexOf(Buffer.from('mdat'));
  return { duration, video, audio, format: probe.format, moovAtStart: moovOffset >= 0 && (mdatOffset < 0 || moovOffset < mdatOffset), raw: probe };
}

function decodedDuration(progress) {
  const matches = [...progress.matchAll(/out_time_us=(\d+)/g)];
  return matches.length ? Number(matches.at(-1)[1]) / 1000000 : 0;
}

async function verifyMediaFile(filePath, mode) {
  const decode = await runFile(FFMPEG_PATH, ['-v', 'error', '-progress', 'pipe:1', '-nostats', '-i', filePath, '-f', 'null', '-']);
  const probe = probeMediaFile(filePath);
  const actualDuration = decodedDuration(decode.stdout);
  if (!probe.duration || probe.duration <= 0 || (mode === 'video' && !probe.moovAtStart)) throw { code: 'INVALID_MEDIA', message: 'File thiếu duration hoặc moov atom ở đầu file.' };
  if (!actualDuration || Math.abs(actualDuration - probe.duration) > Math.max(0.5, probe.duration * 0.01)) throw { code: 'INVALID_DURATION', message: `Duration metadata (${probe.duration}s) không khớp duration giải mã (${actualDuration}s).` };
  if (mode === 'audio' && (!probe.audio || probe.audio.codec_name !== 'aac' || probe.video)) throw { code: 'INVALID_AUDIO', message: 'Audio đầu ra không phải AAC/M4A hợp lệ.' };
  if (mode === 'video' && (!probe.video || !['h264', 'hevc'].includes(probe.video.codec_name) || probe.video.pix_fmt !== 'yuv420p' || !probe.audio || probe.audio.codec_name !== 'aac')) throw { code: 'INVALID_VIDEO', message: 'Video đầu ra không tương thích iPhone (cần H.264/HEVC yuv420p + AAC).' };
  const stat = fs.statSync(filePath);
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => fs.createReadStream(filePath).on('data', (chunk) => hash.update(chunk)).on('end', resolve).on('error', reject));
  return { size: stat.size, sha256: hash.digest('hex'), duration: probe.duration, decodedDuration: actualDuration, codec: mode === 'audio' ? probe.audio.codec_name : probe.video.codec_name, resolution: probe.video ? `${probe.video.width}x${probe.video.height}` : null };
}

async function assertAudioOnlyMp3(filePath) {
  const decode = await runFile(FFMPEG_PATH, ['-v', 'error', '-progress', 'pipe:1', '-nostats', '-i', filePath, '-f', 'null', '-']);
  const probe = probeMediaFile(filePath);
  const actualDuration = decodedDuration(decode.stdout);
  const streams = probe.raw.streams || [];
  const audio = streams[0];
  const bitrate = Number(audio?.bit_rate || probe.format?.bit_rate || 0);
  if (streams.length !== 1 || audio?.codec_type !== 'audio' || audio.codec_name !== 'mp3' || !String(probe.format?.format_name || '').split(',').includes('mp3')) {
    throw { code: 'INVALID_AUDIO', message: 'Audio đầu ra không phải MP3 audio-only hợp lệ.' };
  }
  if (!probe.duration || !actualDuration || Math.abs(actualDuration - probe.duration) > 0.5 || Math.abs(bitrate - 128000) > 4000) {
    throw { code: 'INVALID_AUDIO_DURATION', message: 'MP3 có duration hoặc bitrate CBR không hợp lệ.' };
  }
  const stat = fs.statSync(filePath);
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => fs.createReadStream(filePath).on('data', (chunk) => hash.update(chunk)).on('end', resolve).on('error', reject));
  return { size: stat.size, sha256: hash.digest('hex'), duration: probe.duration, decodedDuration: actualDuration, codec: 'mp3', resolution: null, ext: 'mp3', mime: 'audio/mpeg' };
}

async function normalizeAudioToMp3(inputPath, outputPath, platform, title) {
  await runFile(FFMPEG_PATH, [
    '-y', '-fflags', '+genpts', '-i', inputPath, '-map', '0:a:0', '-vn',
    '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-write_xing', '1',
    '-id3v2_version', '3', '-metadata', `title=${title || 'Audio'}`, '-metadata', `artist=${platform}`,
    outputPath,
  ]);
  const metadata = await assertAudioOnlyMp3(outputPath);
  outputMetadata.set(path.basename(outputPath), metadata);
  return metadata;
}

async function normalizeAndVerify(inputPath, mode, outputPath) {
  if (mode === 'video') {
    try {
      const metadata = await verifyMediaFile(inputPath, mode);
      try { fs.linkSync(inputPath, outputPath); } catch { fs.copyFileSync(inputPath, outputPath); }
      outputMetadata.set(path.basename(outputPath), metadata);
      console.log('[SnapServer Video] source already iPhone-compatible; skipped transcode');
      return metadata;
    } catch (error) {
      console.warn('[SnapServer Video] source needs transcode:', error.code || error.message);
    }
  }
  const ffmpegArgs = mode === 'audio'
    ? ['-y', '-fflags', '+genpts', '-i', inputPath, '-vn', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-avoid_negative_ts', 'make_zero', outputPath]
    : ['-y', '-fflags', '+genpts', '-i', inputPath, '-map', '0:v:0?', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-avoid_negative_ts', 'make_zero', outputPath];
  await runFile(FFMPEG_PATH, ffmpegArgs);
  const metadata = await verifyMediaFile(outputPath, mode);
  outputMetadata.set(path.basename(outputPath), metadata);
  return metadata;
}

/**
 * Phân tích và tải video/audio với chất lượng chỉ định
 * @param {string} rawUrl 
 * @param {'video' | 'audio'} mode 
 * @param {string} quality 'best' | '1080p' | '720p' | '480p' | '360p'
 * @param {string} host 
 */
function processMediaRequest(rawUrl, mode = 'video', quality = 'best', host = 'localhost:4000', proto = 'http') {
  return new Promise((resolve, reject) => {
    cleanOldDownloads();

    const isYt = rawUrl.includes('youtu.be') || rawUrl.includes('youtube.com');
    const isIg = rawUrl.includes('instagram.com');
    const cookiesArgs = fs.existsSync(COOKIES_PATH) ? ['--cookies', COOKIES_PATH] : [];

    let targetUrl = isIg ? normalizeInstagramUrl(rawUrl) : normalizeTrackingParams(rawUrl);
    console.log('[SnapServer Request]', { platform: isYt ? 'youtube' : isIg ? 'instagram' : rawUrl.includes('facebook') || rawUrl.includes('fb.watch') ? 'facebook' : 'other', url: rawUrl, normalizedUrl: targetUrl, mode, quality });

    const tStart = Date.now();
    updateYtDlpIfDue();
    const youtubeRuntimeArgs = isYt ? ['--js-runtimes', 'node', '--extractor-args', 'youtube:player_client=visionos,web_creator'] : [];

    // ==========================================
    // 1. XỬ LÝ CHẾ ĐỘ AUDIO (Tốc độ cao)
    // ==========================================
    if (mode === 'audio') {
      const id = Date.now().toString();
      const rawPrefix = `raw_${id}`;
      const rawTemplate = path.join(DEBUG_DIR, `${rawPrefix}.%(ext)s`);
      const platformName = isYt ? 'youtube' : isIg ? 'instagram' : targetUrl.includes('facebook') || targetUrl.includes('fb.watch') ? 'facebook' : 'media';
      const audioArgs = [...youtubeRuntimeArgs, ...cookiesArgs, '-f', isYt ? '140/bestaudio' : 'bestaudio/best', '--print', 'after_move:__SNAP_TITLE__:%(title)s', '-o', rawTemplate, targetUrl];
      console.log(`[SnapServer Audio] Downloading and normalizing ${isYt ? 'YouTube' : 'media'} audio`);

      execFile(YTDLP_PATH, audioArgs, { timeout: 60000 }, (error, stdout, stderr) => {
        const tEnd = Date.now();
        const durationSec = ((tEnd - tStart) / 1000).toFixed(2);

        if (error) {
          const errText = (stderr || error.message || '').toString();
          if (isYt) backendState.lastYoutubeError = { at: new Date().toISOString(), error: errText.slice(0, 300) };
          console.error('[SnapServer Audio Error]:', errText);
          return reject(parseError(errText));
        }

        const rawPath = findGeneratedFile(rawPrefix);
        if (!rawPath) return reject({ code: 'FILE_NOT_FOUND', message: 'Tải audio hoàn tất nhưng không tạo được file nguồn.' });
        const title = titleFromYtDlpOutput(stdout);
        const filename = buildOutputName('audio', platformName, title);
        const finalPath = path.join(DOWNLOADS_DIR, filename);
        normalizeAudioToMp3(rawPath, finalPath, platformName, title).then((metadata) => {
          if (isYt) backendState.lastYoutubeSuccessAt = new Date().toISOString();
          console.log('[SnapServer Audio Success] normalized', { rawPath, finalPath, metadata });
          resolve({ success: true, mode: 'audio', url: `${proto}://${host}/download/${encodeURIComponent(filename)}`, filename, qualityInfo: `MP3 128kbps • ${(metadata.size / (1024 * 1024)).toFixed(2)}MB`, durationSec, metadata });
        }).catch((normalizeError) => {
          console.error('[SnapServer Audio Normalize Error]', normalizeError.stderr || normalizeError.message || normalizeError);
          reject(normalizeError.code ? normalizeError : { code: 'INVALID_AUDIO', message: 'Không thể chuẩn hóa audio thành MP3 hợp lệ.' });
        });
      });
      return;
    }

    // ==========================================
    // 2. XỬ LÝ CHẾ ĐỘ VIDEO (Ghép HD + ffprobe)
    // ==========================================
    let targetHeight = 0;
    if (quality === '1080p') targetHeight = 1080;
    else if (quality === '720p') targetHeight = 720;
    else if (quality === '480p') targetHeight = 480;
    else if (quality === '360p') targetHeight = 360;

    const id = Date.now().toString();
    const platformName = isYt ? 'youtube' : isIg ? 'instagram' : targetUrl.includes('facebook') || targetUrl.includes('fb.watch') ? 'facebook' : 'media';
    const rawPrefix = `raw_${id}`;
    const rawTemplate = path.join(DEBUG_DIR, `${rawPrefix}.%(ext)s`);
    const outFilename = `${platformName}_video_${id}.mp4`;
    const outFilePath = path.join(DOWNLOADS_DIR, outFilename);

    let formatSelector = '';
    const isFacebook = targetUrl.includes('facebook.com') || targetUrl.includes('fb.watch');
    if (isFacebook) {
      formatSelector = 'bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*[vcodec^=avc1]+ba/bv*+ba/b/best';
    } else if (targetHeight > 0) {
      formatSelector = `bv*[height<=${targetHeight}][vcodec^=avc1]+ba[acodec^=mp4a]/bv*[height<=${targetHeight}]+ba/b[height<=${targetHeight}]/best`;
    } else {
      formatSelector = `bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*+ba/b/best`;
    }

    const videoArgs = [
      ...(fs.existsSync(FFMPEG_PATH) ? ['--ffmpeg-location', FFMPEG_PATH] : []),
      ...youtubeRuntimeArgs,
      ...cookiesArgs,
      '-f', formatSelector,
      '--merge-output-format', 'mp4',
      ...(isIg ? ['--recode-video', 'mp4', '--postprocessor-args', 'ffmpeg:-c:v libx264 -crf 20 -preset veryfast -c:a aac -movflags +faststart'] : []),
      '-o', rawTemplate,
      targetUrl,
    ];

    console.log(`[SnapServer Video] Downloading ${isYt ? 'YouTube' : isFacebook ? 'Facebook' : 'media'} at ${quality}`, { formatSelector, targetUrl });

    execFile(YTDLP_PATH, videoArgs, { timeout: 120000 }, (error, stdout, stderr) => {
      const tEnd = Date.now();
      const durationSec = ((tEnd - tStart) / 1000).toFixed(2);

      if (error) {
        const errText = (stderr || error.message || '').toString();
        if (isYt) backendState.lastYoutubeError = { at: new Date().toISOString(), error: errText.slice(0, 300) };
        console.error('[SnapServer Video Error]:', errText);
        return reject(parseError(errText));
      }

      const rawFilePath = findGeneratedFile(rawPrefix);
      if (!rawFilePath) {
        return reject({ code: 'FILE_NOT_FOUND', message: 'Tải video hoàn tất nhưng không tạo được file đầu ra.' });
      }

      // Xác minh file trước khi trả về app. Photos iOS sẽ từ chối MP4 không có video (PHPhotos 3302).
      let realHeight = targetHeight || 720;
      let realWidth = 1280;
      let codec = 'h264';
      let sizeMB = '0.00';

      normalizeAndVerify(rawFilePath, 'video', outFilePath).then((metadata) => {
        sizeMB = (metadata.size / (1024 * 1024)).toFixed(2);
        const media = probeVideoFile(outFilePath);
        realHeight = media.height;
        realWidth = media.width;
        codec = media.vcodec;
        console.log('[SnapServer] normalized ffprobe verified', { rawFilePath, media, metadata });
        const qualityInfo = `${realHeight}p • ${sizeMB}MB (${durationSec}s)`;
        const serveUrl = `${proto}://${host}/download/${outFilename}`;
        if (isYt) backendState.lastYoutubeSuccessAt = new Date().toISOString();
        resolve({ success: true, mode: 'video', url: serveUrl, filename: outFilename, quality: `${realHeight}p`, resolution: `${realWidth}x${realHeight}`, codec, sizeMB, qualityInfo, durationSec, metadata });
      }).catch((normalizeError) => {
        console.error('[SnapServer Video Normalize Error]', normalizeError.stderr || normalizeError.message || normalizeError);
        reject(normalizeError.code ? normalizeError : { code: 'INVALID_MEDIA', message: 'Không thể chuẩn hóa video thành MP4 tương thích iPhone.' });
      });
    });
  });
}

function parseError(errText) {
  let code = 'ERROR';
  let message = 'Không thể tải nội dung từ liên kết này.';

  if (errText.includes('Cannot parse data')) {
    code = 'EXTRACTOR_CHANGED';
    message = 'Facebook đã thay đổi dữ liệu trang; yt-dlp hiện chưa trích xuất được video này.';
  } else if (errText.includes('Sign in to confirm you’re not a bot') || errText.includes('Botguard')) {
    code = 'BOT_CHECK';
    message = 'YouTube đang yêu cầu xác minh Botguard trên máy chủ. Cần PO Token hoặc cookies của tài khoản phụ ở backend.';
  } else if (errText.includes('login') || errText.includes('empty media response') || errText.includes('requires authentication')) {
    code = 'LOGIN_REQUIRED';
    message = 'Nền tảng yêu cầu đăng nhập đối với nội dung này. Máy chủ chưa có cookies của tài khoản phụ.';
  } else if (errText.includes('Private') || errText.includes('this account is private')) {
    code = 'PRIVATE_ACCOUNT';
    message = 'Nội dung hoặc tài khoản này đang ở chế độ riêng tư.';
  } else if (errText.includes('Requested format is not available') || errText.includes('No video formats found')) {
    code = 'FORMAT_UNAVAILABLE';
    message = 'Định dạng stream yêu cầu không khả dụng.';
  } else if (errText.includes('Video unavailable') || errText.includes('404')) {
    code = 'NOT_FOUND';
    message = 'Video không tồn tại hoặc đã bị xóa.';
  } else if (errText.includes('429') || errText.includes('rate limit')) {
    code = 'RATE_LIMIT';
    message = 'Nền tảng đang giới hạn số lượt tải. Hãy thử lại sau.';
  }

  return { code, message, raw: errText };
}


function sendOtpEmail(toEmail, otpCode) {
  return new Promise((resolve, reject) => {
    let envContent = '';
    try {
      envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    } catch {}

    const envVars = {};
    envContent.split('\n').forEach((line) => {
      const [k, ...v] = line.trim().split('=');
      if (k) envVars[k] = v.join('=');
    });

    const user = process.env.SMTP_USER || envVars.SMTP_USER || 'eyeposture@gmail.com';
    const pass = (process.env.SMTP_PASS || envVars.SMTP_PASS || '').replace(/\s+/g, '');

    const socket = tls.connect(465, 'smtp.gmail.com', () => {});
    let step = 0;
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        socket.destroy();
        reject(new Error('SMTP timeout sau 12 giây'));
      }
    }, 12000);

    socket.setEncoding('utf8');
    socket.on('data', (data) => {
      if (finished) return;
      if (data.startsWith('220') && step === 0) {
        step = 1;
        socket.write('EHLO localhost\r\n');
      } else if (data.includes('250') && step === 1) {
        step = 2;
        socket.write('AUTH LOGIN\r\n');
      } else if (data.startsWith('334') && step === 2) {
        step = 3;
        socket.write(Buffer.from(user).toString('base64') + '\r\n');
      } else if (data.startsWith('334') && step === 3) {
        step = 4;
        socket.write(Buffer.from(pass).toString('base64') + '\r\n');
      } else if (data.startsWith('235') && step === 4) {
        step = 5;
        socket.write('MAIL FROM:<' + user + '>\r\n');
      } else if (data.startsWith('250') && step === 5) {
        step = 6;
        socket.write('RCPT TO:<' + toEmail + '>\r\n');
      } else if (data.startsWith('250') && step === 6) {
        step = 7;
        socket.write('DATA\r\n');
      } else if (data.startsWith('354') && step === 7) {
        step = 8;
        const emailContent = [
          'From: "ToolKit Assistant" <' + user + '>',
          'To: ' + toEmail,
          'Subject: =?UTF-8?B?' + Buffer.from('Mã OTP đặt lại mật khẩu ToolKit: ' + otpCode).toString('base64') + '?=',
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          '<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #eaeaea;">',
          '  <h2 style="color: #121214; margin-top: 0;">Xin chào,</h2>',
          '  <p style="color: #555; font-size: 15px; line-height: 1.6;">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản <strong>ToolKit</strong>. Dưới đây là mã xác thực OTP của bạn:</p>',
          '  <div style="background: #121214; color: #FFD000; font-size: 32px; font-weight: 800; letter-spacing: 8px; text-align: center; padding: 18px; border-radius: 10px; margin: 24px 0;">',
          '    ' + otpCode,
          '  </div>',
          '  <p style="color: #666; font-size: 13.5px; line-height: 1.5;">Mã OTP có hiệu lực trong <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</p>',
          '  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />',
          '  <p style="color: #999; font-size: 12px; margin-bottom: 0;">Đội ngũ phát triển ToolKit App</p>',
          '</div>',
          '.\r\n',
        ].join('\r\n');
        socket.write(emailContent);
      } else if (data.startsWith('250') && step === 8) {
        finished = true;
        clearTimeout(timer);
        socket.end('QUIT\r\n');
        resolve(true);
      } else if (data.startsWith('535')) {
        finished = true;
        clearTimeout(timer);
        socket.end();
        reject(new Error('Xác thực tài khoản gửi email thất bại'));
      }
    });

    socket.on('error', (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health check
  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      engine: 'yt-dlp + ffmpeg',
      ffmpegAvailable: fs.existsSync(FFMPEG_PATH),
      ffprobeAvailable: fs.existsSync(FFPROBE_PATH),
      ytDlpVersion: getYtDlpVersion(),
      lastUpdateAt: backendState.lastUpdateAt,
      lastUpdateError: backendState.lastUpdateError,
      lastYoutubeSuccessAt: backendState.lastYoutubeSuccessAt,
      lastYoutubeError: backendState.lastYoutubeError,
      cookiesConfigured: fs.existsSync(COOKIES_PATH),
      port: PORT,
    }));
    return;
  }

  // API Gửi mã OTP về email
  if (req.method === 'POST' && parsedUrl.pathname === '/api/send-otp') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { email, otp } = payload;
        if (!email || !otp) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Thiếu email hoặc mã OTP.' }));
          return;
        }

        console.log('[SnapServer] Đang gửi mã OTP đến email:', email);
        await sendOtpEmail(email, otp);
        console.log('[SnapServer] Đã gửi mã OTP thành công đến:', email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Đã gửi mã OTP thành công.' }));
      } catch (err) {
        console.error('[SnapServer] Lỗi gửi OTP:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message || 'Không thể gửi email OTP.' }));
      }
    });
    return;
  }


  // Phục vụ tải file trực tiếp từ temp_downloads
  if (req.method === 'GET' && parsedUrl.pathname.startsWith('/download/')) {
    const filename = path.basename(decodeURIComponent(parsedUrl.pathname));
    const filePath = path.join(DOWNLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const isAudio = filename.endsWith('.mp3');
      const metadata = outputMetadata.get(filename);
      const mediaHeaders = {
        'Content-Type': isAudio ? 'audio/mpeg' : 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': isAudio
          ? `attachment; filename="download.mp3"; filename*=UTF-8''${encodeURIComponent(filename)}`
          : `attachment; filename="${filename}"`,
        ...(metadata ? { 'X-Snap-Size': metadata.size, 'X-Snap-Sha256': metadata.sha256, 'X-Snap-Duration': metadata.duration } : {}),
      };
      const range = req.headers.range;
      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        const start = match ? Number(match[1]) : 0;
        const end = match?.[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
        if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return; }
        res.writeHead(206, { ...mediaHeaders, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stat.size}` });
        fs.createReadStream(filePath, { start, end }).pipe(res); return;
      }
      res.writeHead(200, { ...mediaHeaders, 'Content-Length': stat.size });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File không tồn tại hoặc đã hết hạn.' }));
      return;
    }
  }

  // API Resolve Media
  if (req.method === 'POST' && parsedUrl.pathname === '/api/resolve') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { url, mode, quality } = payload;
        if (!url || !isSupportedMediaUrl(url)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, code: 'UNSUPPORTED', message: 'Liên kết không thuộc nền tảng được hỗ trợ.' }));
          return;
        }

        let host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
        let proto = req.headers['x-forwarded-proto'] || (host.includes('trycloudflare.com') || host.includes('loca.lt') ? 'https' : 'http');

        if (host.startsWith('127.0.0.1') || host.startsWith('localhost')) {
          try {
            const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
            const match = envContent.match(/EXPO_PUBLIC_SNAP_SERVER_URL=(.*)/);
            if (match && match[1]) {
              const publicParsed = new URL(match[1].trim());
              host = publicParsed.host;
              proto = publicParsed.protocol.replace(':', '');
            }
          } catch {
            // fallback giữ nguyên
          }
        }

        const result = await processMediaRequest(url, mode || 'video', quality || 'best', host, proto);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          code: err.code || 'UNKNOWN',
          message: err.message || 'Lỗi xử lý video.',
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SnapServer] Đang lắng nghe tại http://0.0.0.0:${PORT}`);
  console.log(`[SnapServer] Engine yt-dlp: ${YTDLP_PATH}`);
  console.log(`[SnapServer] FFmpeg: ${fs.existsSync(FFMPEG_PATH) ? 'Có sẵn' : 'Không tìm thấy'}`);
  console.log(`[SnapServer] FFprobe: ${fs.existsSync(FFPROBE_PATH) ? 'Có sẵn' : 'Không tìm thấy'}`);
  if (fs.existsSync(COOKIES_PATH)) {
    console.log(`[SnapServer] Đã tải cookies từ ${COOKIES_PATH}`);
  } else {
    console.log(`[SnapServer] Chưa có cookies.txt`);
  }
});
