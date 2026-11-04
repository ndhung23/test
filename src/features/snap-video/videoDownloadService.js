// src/features/snap-video/videoDownloadService.js
// Service xử lý tải video từ 4 nền tảng MXH: TikTok, YouTube, Facebook, Instagram
// Tích hợp multi-source resolver và hỗ trợ hủy tải video bất kỳ lúc nào

import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const REQUEST_TIMEOUT_MS = 75000;
let cachedActiveServerUrl = null;

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function verifyDownloadedHash(uri, expectedHash) {
  if (!expectedHash) return null;
  let bytes; try { bytes = await new File(uri).arrayBuffer(); } catch(e) { console.warn(e); return null; }
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const actualHash = bytesToHex(digest);
  if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new Error('SHA-256 của file tải về không khớp máy chủ. File có thể bị hỏng; vui lòng tải lại.');
  }
  return actualHash;
}

// Endpoint resolver đồng bộ dựa trên URL máy chủ đã nhận diện hoặc mặc định
export function getSnapServerEndpoints() {
  if (cachedActiveServerUrl) return [`${cachedActiveServerUrl}/api/resolve`];
  const envUrl = process.env.EXPO_PUBLIC_SNAP_SERVER_URL?.replace(/\/$/, '');
  const base = envUrl || 'http://10.33.93.212:4000';
  return [`${base}/api/resolve`];
}

// Danh sách candidate backend URL: tự động tìm endpoint hoạt động tốt nhất
export async function getWorkingSnapServerUrl() {
  if (cachedActiveServerUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${cachedActiveServerUrl}/health`, {
        signal: controller.signal,
        headers: getSnapHeaders(),
      });
      clearTimeout(timer);
      if (res.ok) return cachedActiveServerUrl;
    } catch {
      cachedActiveServerUrl = null;
    }
  }

  const candidates = [];
  const envUrl = process.env.EXPO_PUBLIC_SNAP_SERVER_URL?.replace(/\/$/, '');
  if (envUrl) candidates.push(envUrl);
  candidates.push('http://10.33.93.212:4000');
  candidates.push('http://192.168.137.1:4000');
  candidates.push('http://localhost:4000');
  candidates.push('http://127.0.0.1:4000');

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  for (const url of uniqueCandidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
        headers: getSnapHeaders(),
      });
      clearTimeout(timer);
      const data = await response.json().catch(() => null);
      if (response.ok && data?.status === 'ok') {
        cachedActiveServerUrl = url;
        return url;
      }
    } catch {}
  }
  return null;
}

// Thêm header bypass cho localtunnel (tránh trang xác nhận khi dùng tunnel)
function getSnapHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': '1',
    ...extra,
  };
}

export async function getSnapServerHealth() {
  const serverUrl = await getWorkingSnapServerUrl();
  if (!serverUrl) return { ok: false, code: 'SERVER_UNREACHABLE' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${serverUrl}/health`, {
      signal: controller.signal,
      headers: getSnapHeaders(),
    });
    clearTimeout(timer);
    const data = await response.json().catch(() => null);
    return response.ok && data?.status === 'ok' ? { ok: true, serverUrl, ...data } : { ok: false, code: 'SERVER_UNHEALTHY' };
  } catch {
    return { ok: false, code: 'SERVER_UNREACHABLE' };
  }
}

async function resolveWithSnapBackend(url, mode, quality, signal) {
  const serverUrl = await getWorkingSnapServerUrl();
  if (!serverUrl) {
    const error = new Error('Không kết nối được máy chủ tải. Hãy kiểm tra kết nối mạng (cùng Wi-Fi hoặc Hotspot).');
    error.code = 'SERVER_UNREACHABLE';
    throw error;
  }
  const endpoint = `${serverUrl}/api/resolve`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getSnapHeaders(),
    body: JSON.stringify({ url, mode, quality }),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (response.ok && data?.success && data?.url) {
    try {
      const parsed = new URL(data.url);
      const serverParsed = new URL(serverUrl);
      data.url = `${serverParsed.origin}${parsed.pathname}${parsed.search}`;
    } catch {}
    return data;
  }
  const error = new Error(data?.message || 'Máy chủ không thể tạo file tải hợp lệ.');
  error.code = data?.code || 'SERVER_ERROR';
  throw error;
}

// 4 Nền tảng được hỗ trợ theo yêu cầu
export const SUPPORTED_PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000000', patterns: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'] },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000', patterns: ['youtube.com', 'youtu.be', 'youtube.com/shorts'] },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2', patterns: ['facebook.com', 'fb.watch', 'fb.com'] },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E1306C', patterns: ['instagram.com'] },
];

/**
 * Nhận diện nền tảng từ URL
 */
export function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  const lower = url.toLowerCase();
  for (const platform of SUPPORTED_PLATFORMS) {
    for (const pattern of platform.patterns) {
      if (lower.includes(pattern)) return platform;
    }
  }
  return null;
}

/**
 * Kiểm tra URL hợp lệ
 */
export function isValidUrl(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed);
  }
}

/**
 * Giải quyết link rút gọn (redirect)
 */
async function expandShortUrl(rawUrl, signal) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const combinedSignal = signal || controller.signal;
    const res = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      },
      signal: combinedSignal,
    });
    clearTimeout(timeout);
    return res.url || rawUrl;
  } catch {
    return rawUrl;
  }
}

/**
 * Tách Video ID của YouTube
 */
function extractYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Tách Shortcode của Instagram
 */
function extractInstagramShortcode(url) {
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

// ============================================================
// 1. TIKTOK RESOLVER (TikWM API không watermark + Fallback)
// ============================================================
async function resolveTikTok(url, mode, signal) {
  const targetUrl = await expandShortUrl(url, signal);

  // Thử TikWM API chính thức
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}&hd=1`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal,
    });

    if (response.ok) {
      const json = await response.json();
      if (json.code === 0 && json.data) {
        const data = json.data;
        let downloadUrl = '';
        if (mode === 'audio') {
          downloadUrl = data.music || data.music_info?.play || data.play;
        } else {
          downloadUrl = data.play || data.wmplay || data.hdplay;
        }

        if (downloadUrl) {
          return {
            url: downloadUrl,
            filename: `tiktok_${data.id || Date.now()}.${mode === 'audio' ? 'mp3' : 'mp4'}`,
          };
        }
      }
    }
  } catch {
    // Fallback sang Tikwm v2
  }

  // Fallback qua Tikmate
  try {
    const fallbackRes = await fetch(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(targetUrl)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal,
    });
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json();
      if (fbData.token && fbData.id) {
        return {
          url: `https://tikmate.app/download/${fbData.token}/${fbData.id}.mp4?hd=1`,
          filename: `tiktok_${fbData.id}.mp4`,
        };
      }
    }
  } catch {
    // ignore
  }

  throw new Error('Không thể lấy video TikTok. Hãy đảm bảo video ở chế độ công khai.');
}

// ============================================================
// 2. YOUTUBE PARALLEL MULTI-INSTANCE RESOLVER (Tốc độ cao & Xử lý song song)
// ============================================================
async function resolveYouTube(url, mode, quality = 'best', signal = null) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Không nhận dạng được ID video YouTube từ liên kết này.');
  }

  // 1. Thử qua Snap Resolver Server nội bộ (chạy yt-dlp trên residential IP của máy tính để vượt Botguard)
  const devEndpoints = getSnapServerEndpoints();

  if (devEndpoints.length === 0) {
    const error = new Error('Máy chủ tải Snap Video chưa được cấu hình. Cần đặt EXPO_PUBLIC_SNAP_SERVER_URL tới backend yt-dlp rồi tạo lại development build.');
    error.code = 'SERVER_NOT_CONFIGURED';
    throw error;
  }
  const health = await getSnapServerHealth();
  if (!health.ok) {
    const error = new Error('Không kết nối được máy chủ Snap Video. Kiểm tra máy chủ đang chạy, URL cấu hình và mạng Wi‑Fi.');
    error.code = health.code;
    throw error;
  }

  for (const endpoint of devEndpoints) {
    try {
      const c = new AbortController();
      const timeout = setTimeout(() => c.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getSnapHeaders(),
        body: JSON.stringify({ url, mode, quality }),
        signal: signal || c.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.url) {
        return {
          url: data.url,
          filename: data.filename || `youtube_${videoId}.${mode === 'audio' ? 'mp3' : 'mp4'}`,
          qualityInfo: data.qualityInfo || (mode === 'audio' ? 'Audio 128kbps' : quality),
          durationSec: data.durationSec,
        };
      }
      if (data?.message) {
        const error = new Error(data.message);
        error.code = data.code || 'SERVER_ERROR';
        throw error;
      }
    } catch (err) {
      if (err.code && err.code !== 'ABORT_ERR') throw err;
    }
  }
  const error = new Error('Máy chủ Snap Video không phản hồi khi xử lý YouTube. Kiểm tra log backend để phân biệt timeout, Botguard hoặc lỗi ghép file.');
  error.code = 'SERVER_TIMEOUT';
  throw error;
}

// ============================================================
// 3. FACEBOOK RESOLVER (FDown Engine + Fallback)
// ============================================================
async function resolveFacebook(url, mode, signal) {
  const expanded = await expandShortUrl(url, signal);
  const endpoints = getSnapServerEndpoints();
  if (endpoints.length) {
    const health = await getSnapServerHealth();
    if (!health.ok) {
      const error = new Error('Không kết nối được máy chủ tải Facebook.');
      error.code = health.code;
      throw error;
    }
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: 'POST', headers: getSnapHeaders(),
        body: JSON.stringify({ url: expanded, mode, quality: 'best' }), signal,
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data?.url) return data;
      if (data?.message) {
        const error = new Error(`${data.message}\nMã lỗi: ${data.code || 'FACEBOOK_ERROR'}`);
        error.code = data.code || 'FACEBOOK_ERROR';
        throw error;
      }
    }
  }

  // Fallback only when no backend is configured; these public scrapers are inherently unstable.
  try {
    const response = await fetch('https://fdown.co.in/ajax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://fdown.co.in',
        'Referer': 'https://fdown.co.in/',
      },
      body: JSON.stringify({ url: expanded }),
      signal,
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.success && data.links) {
        const links = data.links;
        const downloadUrl = links['Download Video in HD Quality'] || links['Download Video'] || Object.values(links)[0];
        if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.startsWith('http')) {
          return {
            url: downloadUrl,
            filename: `facebook_${Date.now()}.${mode === 'audio' ? 'mp3' : 'mp4'}`,
          };
        }
      }
    }
  } catch {
    // Fallback tiếp theo
  }

  // Máy chủ 2: SnapSave API
  try {
    const snapRes = await fetch('https://snapsave.app/action.php?lang=vn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: `url=${encodeURIComponent(expanded)}`,
      signal,
    });
    if (snapRes.ok) {
      const html = await snapRes.text();
      const match = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
      if (match && match[1]) {
        return {
          url: match[1],
          filename: `facebook_${Date.now()}.${mode === 'audio' ? 'mp3' : 'mp4'}`,
        };
      }
    }
  } catch {
    // ignore
  }

  const error = new Error('Không thể lấy video Facebook từ nguồn dự phòng. Mã lỗi: FACEBOOK_RESOLVER_UNAVAILABLE');
  error.code = 'FACEBOOK_RESOLVER_UNAVAILABLE';
  throw error;
}

// ============================================================
// 4. INSTAGRAM RESOLVER (Snap Resolver Server + Embed Scraper)
// ============================================================
async function resolveInstagram(url, mode, quality = 'best', signal = null) {
  const shortcode = extractInstagramShortcode(url);
  const cleanUrl = (url || '').trim().split('?')[0];

  // 1. Thử qua Snap Resolver Server nội bộ (chạy yt-dlp)
  const devEndpoints = getSnapServerEndpoints();

  if (devEndpoints.length === 0) {
    const error = new Error('Máy chủ tải Snap Video chưa được cấu hình. Cần đặt EXPO_PUBLIC_SNAP_SERVER_URL tới backend yt-dlp rồi tạo lại development build.');
    error.code = 'SERVER_NOT_CONFIGURED';
    throw error;
  }

  for (const endpoint of devEndpoints) {
    try {
      const c = new AbortController();
      const timeout = setTimeout(() => c.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getSnapHeaders(),
        body: JSON.stringify({ url: cleanUrl, mode, quality }),
        signal: signal || c.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.url) {
        return {
          url: data.url,
          filename: data.filename || `instagram_${shortcode || Date.now()}.${mode === 'audio' ? 'mp3' : 'mp4'}`,
          qualityInfo: data.qualityInfo || (mode === 'audio' ? 'Audio MP3' : quality),
          durationSec: data.durationSec,
        };
      } else if (data?.message) {
        throw new Error(data.message);
      }
    } catch (err) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('abort')) {
        throw err;
      }
    }
  }

  // 2. Thử lấy link trực tiếp từ embed Instagram
  if (shortcode) {
    try {
      const embedRes = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        },
        signal,
      });

      if (embedRes.ok) {
        const html = await embedRes.text();
        const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
        const displayMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/);

        if (videoMatch && videoMatch[1]) {
          const cleanVideoUrl = videoMatch[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
          return {
            url: cleanVideoUrl,
            filename: `instagram_${shortcode}.${mode === 'audio' ? 'mp3' : 'mp4'}`,
            qualityInfo: 'Instagram HD',
          };
        }

        if (displayMatch && displayMatch[1]) {
          const cleanDisplayUrl = displayMatch[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
          return {
            url: cleanDisplayUrl,
            filename: `instagram_${shortcode}.jpg`,
            qualityInfo: 'Hình ảnh HD',
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  throw new Error('Không thể trích xuất Instagram từ backend. Hãy kiểm tra log yt-dlp để biết chính xác là LOGIN_REQUIRED, RATE_LIMIT hay link không hỗ trợ.');
}

/**
 * Điều hướng tải video theo nền tảng tương ứng
 * @param {string} rawUrl - URL video cần tải
 * @param {'video' | 'audio'} mode - Chế độ tải (video hoặc chỉ audio)
 * @param {string} quality - Mức chất lượng ('best' | '1080p' | '720p' | '480p' | '360p')
 * @param {AbortSignal} signal - Signal để hủy khi cần
 * @returns {Promise<{url: string, filename: string, qualityInfo?: string}>}
 */
export async function fetchDownloadLink(rawUrl, mode = 'video', quality = 'best', signal = null) {
  const url = (rawUrl || '').trim();
  const platform = detectPlatform(url);

  if (!platform) {
    throw new Error('Liên kết chưa được hỗ trợ. Snap Video hỗ trợ 4 nền tảng: TikTok, YouTube, Facebook, Instagram.');
  }

  // A configured backend is the only path that applies the common ffmpeg gate.
  // Do not fall back to a direct platform stream or iOS may receive fragmented media.
    if (getSnapServerEndpoints().length) {
    try {
      return await Promise.race([
        resolveWithSnapBackend(url, mode, quality, signal),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Quá thời gian kết nối (Timeout 75s). Vui lòng thử lại.')), REQUEST_TIMEOUT_MS)),
      ]);
    } catch (backendError) {
      if (mode === 'audio' || signal?.aborted) throw backendError;
      console.warn('[SnapVideo] Backend resolve failed, trying fallback resolvers:', backendError?.message);
    }
  }
  if (mode === 'audio') {
    const error = new Error('Audio MP3 cần máy chủ Snap Video để chuẩn hóa file.');
    error.code = 'AUDIO_BACKEND_REQUIRED';
    throw error;
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Quá thời gian kết nối (Timeout 75s). Vui lòng thử lại.')), REQUEST_TIMEOUT_MS)
  );

  let resolverPromise;

  if (platform.id === 'tiktok') {
    resolverPromise = resolveTikTok(url, mode, signal);
  } else if (platform.id === 'youtube') {
    resolverPromise = resolveYouTube(url, mode, quality, signal);
  } else if (platform.id === 'facebook') {
    resolverPromise = resolveFacebook(url, mode, signal);
  } else if (platform.id === 'instagram') {
    resolverPromise = resolveInstagram(url, mode, quality, signal);
  } else {
    throw new Error('Nền tảng chưa được hỗ trợ.');
  }

  return Promise.race([resolverPromise, timeoutPromise]);
}

/**
 * Bắt đầu tải video/audio về máy với khả năng HỦY TẢI (Cancelable)
 * Audio trên iOS không thể lưu vào Photos → dùng Share Sheet
 * @param {string} downloadUrl - URL trực tiếp để tải file
 * @param {string} filename - Tên file
 * @param {function} onProgress - Callback tiến trình (0-1)
 * @param {'video'|'audio'} mode - Chế độ tải
 * @returns {{ promise: Promise<{uri: string, savedToGallery: boolean, sharedViaSheet: boolean}>, cancel: () => Promise<void> }}
 */
export function startVideoDownload(downloadUrl, filename, onProgress, mode = 'video', expectedMetadata = null) {
  const isAudioMode = mode === 'audio';
  const defaultExt = isAudioMode ? 'mp3' : 'mp4';
  const defaultPrefix = isAudioMode ? 'audio_' : 'video_';
  const safeName = (filename || `${defaultPrefix}${Date.now()}.${defaultExt}`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  const fileUri = `${baseDir}${safeName}`;

  // Xác định loại file: audio nếu mode === 'audio' hoặc đuôi file audio
  const isAudioFile = isAudioMode || /\.mp3$/i.test(safeName);

  let cancelled = false;

  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    fileUri,
    {
      headers: {
        'bypass-tunnel-reminder': '1',
      },
    },
    (downloadProgress) => {
      if (cancelled) return;
      if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
        const progress = Math.min(
          1,
          Math.max(0, downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite)
        );
        onProgress(progress);
      }
    }
  );

  const promise = (async () => {
    const result = await downloadResumable.downloadAsync();
    if (cancelled) {
      await cleanupTempFile(fileUri);
      throw new Error(`Đã hủy tải ${isAudioMode ? 'audio' : 'video'}.`);
    }

    if (!result || !result.uri) {
      throw new Error('Tải file thất bại. Vui lòng thử lại.');
    }

    const contentType = result.mimeType || result.headers?.['content-type'] || result.headers?.['Content-Type'] || '';
    console.info('[SnapVideo] download response', {
      url: downloadUrl,
      status: result.status,
      contentType,
      contentLength: result.headers?.['content-length'] || result.headers?.['Content-Length'] || null,
    });
    if (result.status < 200 || result.status >= 300) {
      await cleanupTempFile(result.uri);
      throw new Error(`Máy chủ trả về HTTP ${result.status}; file chưa được lưu.`);
    }

    // Kiểm tra file tồn tại và có dung lượng > 0
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    if (!fileInfo || !fileInfo.exists) {
      throw new Error('File tải về không tồn tại. Vui lòng thử lại.');
    }
    if (fileInfo.size !== undefined && fileInfo.size === 0) {
      await cleanupTempFile(result.uri);
      throw new Error('File tải về rỗng (0 bytes). Link có thể đã hết hạn, vui lòng thử lại.');
    }
    const headerLength = Number(result.headers?.['content-length'] || result.headers?.['Content-Length'] || 0);
    const expectedSize = Number(expectedMetadata?.size || result.headers?.['x-snap-size'] || result.headers?.['X-Snap-Size'] || 0);
    if ((headerLength && fileInfo.size !== headerLength) || (expectedSize && fileInfo.size !== expectedSize)) {
      await cleanupTempFile(result.uri);
      throw new Error(`File tải về không đủ byte (nhận ${fileInfo.size}, cần ${expectedSize || headerLength}). Vui lòng tải lại.`);
    }
    const expectedHash = expectedMetadata?.sha256 || result.headers?.['x-snap-sha256'] || result.headers?.['X-Snap-Sha256'];
    let verifiedSha256 = null;
    try {
      verifiedSha256 = await verifyDownloadedHash(result.uri, expectedHash);
    } catch (error) {
      await cleanupTempFile(result.uri);
      throw error;
    }
    console.info('[SnapVideo] downloaded file', {
      uri: result.uri,
      exists: fileInfo.exists,
      size: fileInfo.size,
      extension: safeName.split('.').pop()?.toLowerCase() || '',
      sha256: verifiedSha256,
    });

    if (!isAudioFile && !/\.(mp4|m4v|mov)$/i.test(safeName)) {
      await cleanupTempFile(result.uri);
      throw new Error('Video không có định dạng MP4, M4V hoặc MOV tương thích với Ảnh trên iPhone.');
    }
    if (!isAudioFile && contentType && !/^video\//i.test(contentType)) {
      await cleanupTempFile(result.uri);
      throw new Error(`Máy chủ trả về ${contentType}, không phải video hợp lệ.`);
    }
    if (isAudioFile && contentType && contentType.split(';')[0].trim().toLowerCase() !== 'audio/mpeg') {
      await cleanupTempFile(result.uri);
      throw new Error(`Máy chủ trả về ${contentType}, không phải MP3 hợp lệ.`);
    }
    if (isAudioFile && !/\.mp3$/i.test(safeName)) {
      await cleanupTempFile(result.uri);
      throw new Error('Máy chủ không trả tên file MP3. File chưa được chia sẻ.');
    }

    // Xử lý lưu file
    let savedToGallery = false;
    let sharedViaSheet = false;
    let assetId = null;

    if (isAudioFile && Platform.OS === 'android') {
      // MediaStore accepts audio on Android; the album is the least-privilege Expo API available.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (permission.status !== 'granted') {
        const error = new Error('Chưa được cấp quyền thư viện để lưu audio. Hãy cấp quyền trong Cài đặt rồi thử lại.');
        error.code = 'MEDIA_PERMISSION_DENIED';
        error.manualShareUri = result.uri;
        throw error;
      }
      const asset = await MediaLibrary.createAssetAsync(result.uri);
      const verifiedAsset = await MediaLibrary.getAssetInfoAsync(asset.id);
      if (!verifiedAsset?.id || verifiedAsset.id !== asset.id) {
        throw new Error('Không thể xác minh audio sau khi lưu vào thư viện Android.');
      }
      const album = await MediaLibrary.getAlbumAsync('Snap Video');
      if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      else await MediaLibrary.createAlbumAsync('Snap Video', asset, false);
      assetId = asset.id;
      savedToGallery = true;
      console.info('[SnapVideo] Android audio asset verified', { assetId, filename: verifiedAsset.filename });
    } else if (isAudioFile) {
      // iOS has no audio Photos library: let the user choose Files through Share Sheet.
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        throw new Error('Thiết bị không hỗ trợ Share Sheet; audio vẫn nằm trong vùng lưu trữ của ứng dụng.');
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: expectedMetadata?.mime || contentType || 'audio/mpeg',
        dialogTitle: 'Chọn “Lưu vào Tệp” để lưu audio',
        UTI: 'public.mp3',
      });
      sharedViaSheet = true;
    } else {
      // Video → tạo asset và đọc lại asset. saveToLibraryAsync không trả asset nên không thể xác minh.
      try {
        const currentPermission = await MediaLibrary.getPermissionsAsync(false);
        const permission = currentPermission.status === 'granted'
          ? currentPermission
          : await MediaLibrary.requestPermissionsAsync(false);
        console.info('[SnapVideo] Photos permission', {
          status: permission.status,
          granted: permission.granted,
          canAskAgain: permission.canAskAgain,
          accessPrivileges: permission.accessPrivileges || null,
        });
        if (permission.status !== 'granted') {
          const error = new Error('Chưa được cấp quyền Thư viện ảnh. Hãy cấp quyền trong Cài đặt rồi thử lại.');
          error.code = 'PHOTOS_PERMISSION_DENIED';
          error.manualShareUri = result.uri;
          throw error;
        }

        const asset = await MediaLibrary.createAssetAsync(result.uri);
        const verifiedAsset = await MediaLibrary.getAssetInfoAsync(asset.id);
        if (!verifiedAsset?.id || verifiedAsset.id !== asset.id) {
          throw new Error('Không thể xác minh video sau khi lưu vào Thư viện ảnh.');
        }
        if (Platform.OS === 'android') {
          const album = await MediaLibrary.getAlbumAsync('Snap Video');
          if (album) await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          else await MediaLibrary.createAlbumAsync('Snap Video', asset, false);
        }
        assetId = asset.id;
        savedToGallery = true;
        console.info('[SnapVideo] Photos asset verified', { assetId, filename: verifiedAsset.filename });
      } catch (err) {
        console.warn('[SnapVideo] Photos save failed', { message: err?.message, code: err?.code || null });
        if (!err.manualShareUri) err.manualShareUri = result.uri;
        if (err.code !== 'PHOTOS_PERMISSION_DENIED') {
          const saveError = new Error(Platform.OS === 'android'
            ? 'Không thể lưu video vào thư viện Android: file không phải video hợp lệ hoặc Android không hỗ trợ định dạng này.'
            : 'Không thể lưu video vào Ảnh: file không phải video hợp lệ hoặc iPhone không hỗ trợ định dạng này.');
          saveError.code = 'PHOTOS_INVALID_MEDIA';
          saveError.manualShareUri = err.manualShareUri;
          throw saveError;
        }
        throw err;
      }
    }

    return {
      uri: result.uri,
      savedToGallery,
      sharedViaSheet,
      assetId,
    };
  })();

  const cancel = async () => {
    cancelled = true;
    try {
      await downloadResumable.cancelAsync();
    } catch {
      // ignore
    }
    await cleanupTempFile(fileUri);
  };

  return { promise, cancel };
}

export async function shareDownloadedFile(uri, mode = 'video') {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Thiết bị không hỗ trợ Share Sheet.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: mode === 'audio' ? 'audio/mpeg' : 'video/mp4',
    dialogTitle: mode === 'audio' ? 'Chọn “Lưu vào Tệp” để lưu audio' : 'Lưu hoặc chia sẻ video',
    UTI: mode === 'audio' ? 'public.mp3' : 'public.movie',
  });
}

/**
 * Giữ hàm downloadAndSaveVideo cũ để tương thích ngược
 */
export async function downloadAndSaveVideo(downloadUrl, filename, onProgress) {
  const handle = startVideoDownload(downloadUrl, filename, onProgress);
  return handle.promise;
}

/**
 * Xóa file tạm sau khi đã lưu
 */
export async function cleanupTempFile(uri) {
  try {
    if (!uri) return;
    const info = await FileSystem.getInfoAsync(uri);
    if (info && info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Bỏ qua lỗi cleanup
  }
}
