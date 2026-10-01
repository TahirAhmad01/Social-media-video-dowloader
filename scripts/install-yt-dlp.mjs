import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'bin');

async function installYtDlp() {
  // Only auto-download during install if in CI/Vercel or Linux environment
  const isVercel = Boolean(process.env.VERCEL || process.env.NOW_BUILDER);
  const isLinux = process.platform === 'linux';

  if (!isVercel && !isLinux) {
    console.log('[install-yt-dlp] Local non-Linux environment detected; skipping pre-build download (will use system yt-dlp or runtime download).');
    return;
  }

  const binaryName = 'yt-dlp_linux';
  const targetBinary = path.join(binDir, 'yt-dlp');

  if (fs.existsSync(targetBinary)) {
    try {
      const stat = fs.statSync(targetBinary);
      if (stat.size > 10000000) {
        console.log('[install-yt-dlp] yt-dlp binary already exists in bin/');
        fs.chmodSync(targetBinary, 0o755);
        return;
      }
    } catch {
      // re-download if corrupt
    }
  }

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binaryName}`;
  console.log(`[install-yt-dlp] Downloading ${binaryName} from ${downloadUrl}...`);

  const tmpPath = `${targetBinary}.tmp.${Date.now()}`;
  try {
    const res = await fetch(downloadUrl, { redirect: 'follow' });
    if (!res.ok) {
      console.warn(`[install-yt-dlp] Warning: Failed to download yt-dlp binary (HTTP ${res.status}). Will fall back to runtime downloader.`);
      return;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);
    fs.chmodSync(tmpPath, 0o755);
    fs.renameSync(tmpPath, targetBinary);
    console.log(`[install-yt-dlp] Successfully installed yt-dlp binary to ${targetBinary}`);
  } catch (err) {
    console.warn('[install-yt-dlp] Warning during download:', err.message, '- will use runtime download.');
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

installYtDlp().catch((err) => {
  console.warn('[install-yt-dlp] Non-fatal error:', err.message);
});
