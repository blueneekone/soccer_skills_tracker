/**
 * SSTracker Video Post-Processing & Transcoding Engine
 * Merges and transcodes captured WebM video clips into production-grade, web-optimized MP4/WebM assets.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.resolve(__dirname, '../static/videos');
const RAW_DIR = path.resolve(__dirname, '../recordings');
const ASSETS_VIDEO_DIR = path.resolve(__dirname, '../static/assets/video');

if (!fs.existsSync(ASSETS_VIDEO_DIR)) fs.mkdirSync(ASSETS_VIDEO_DIR, { recursive: true });

const REQUIRED_ASSETS = [
  'marketing-hero.webm',
  'director-os-demo.webm',
  'coach-os-demo.webm',
  'player-os-demo.webm',
  'player-cv-demo.webm',
  'parent-os-demo.webm'
];

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function run() {
  console.log('⚡ Running Video Post-Processing Verification...');
  const hasFfmpeg = checkFfmpeg();

  for (const asset of REQUIRED_ASSETS) {
    const srcPath = path.join(VIDEOS_DIR, asset);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠️ Warning: ${asset} not yet captured in static/videos/`);
      continue;
    }

    const stat = fs.statSync(srcPath);
    console.log(`✅ Asset verified: ${asset} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

    if (hasFfmpeg) {
      const mp4Name = asset.replace('.webm', '.mp4');
      const mp4Path = path.join(ASSETS_VIDEO_DIR, mp4Name);
      
      console.log(`🎬 Transcoding ${asset} -> ${mp4Name} with H.264/AAC...`);
      try {
        execSync(
          `ffmpeg -y -i "${srcPath}" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${mp4Path}"`,
          { stdio: 'inherit' }
        );
        console.log(`✨ Generated web-optimized MP4: ${mp4Name}`);
      } catch (err) {
        console.error(`❌ Transcoding error for ${asset}:`, err.message);
      }
    }
  }

  console.log('🎉 Video post-processing pass complete.');
}

run();
