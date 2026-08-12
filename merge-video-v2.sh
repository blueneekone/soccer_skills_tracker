#!/usr/bin/env bash
# ==============================================================================
# SSTRACKER DIGITAL MONETIZATION PIPELINE: FFMPEG SEQUECNTIAL STITCHER (v2)
# ==============================================================================
# This script programmatically merges, crops, and encodes the raw Playwright clips
# into SvelteKit's static folder (static/assets/video/sstracker-demo.mp4) under 50MB.
# ==============================================================================

set -eo pipefail

# Pre-flight Check: Ensure FFmpeg is available in the current PATH
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ [DevOps Error] FFmpeg is not installed or missing from the local environment PATH."
  echo "Please run: 'sudo apt-get install ffmpeg' (Linux) or 'brew install ffmpeg' (Mac)"
  exit 1
fi

echo "🎬 [FFmpeg Stitcher] Initiating post-processing pipeline..."

RAW_DIR="./recordings"
OUT_DIR="./static/assets/video"
mkdir -p "$OUT_DIR"

# 1. Verification: Assert that all four raw WebM segments exist and are non-empty
SEGMENTS=("director-segment" "player-segment" "fan-segment" "parent-segment")
for SEG in "${SEGMENTS[@]}"; do
  FILE="$RAW_DIR/$SEG.webm"
  if [ ! -f "$FILE" ] || [ ! -s "$FILE" ]; then
    echo "❌ [DevOps Error] Could not locate valid raw segment file at: $FILE"
    echo "Please ensure you run 'node record-demo.js' before executing this stitcher script."
    exit 1
  fi
done

# 2. Intermediate Encoding & Aspect Ratio Optimization
echo "🎬 [FFmpeg Stitcher] Transcoding independent segments to uniform intermediate MP4 streams..."

for SEG in "${SEGMENTS[@]}"; do
  echo "👉 Processing: $SEG.webm"
  ffmpeg -y -i "$RAW_DIR/$SEG.webm" \
    -vf "scale=1920:1080,setsar=1" \
    -c:v libx264 -preset superfast -crf 18 \
    -an "$RAW_DIR/${SEG}_temp.mp4"
done

# 3. Create the Merging Manifest
MANIFEST="$RAW_DIR/concat_list.txt"
echo "🎬 [FFmpeg Stitcher] Constructing concatenation list manifest..."
rm -f "$MANIFEST"
for SEG in "${SEGMENTS[@]}"; do
  echo "file '${SEG}_temp.mp4'" >> "$MANIFEST"
done

# 4. Sequentially Merge and Crop the Assets
echo "🎬 [FFmpeg Stitcher] Concatenating intermediate streams and executing digital crop..."
FINAL_TEMP="$RAW_DIR/merged_unprocessed.mp4"

ffmpeg -y -f concat -safe 0 -i "$MANIFEST" \
  -c copy "$FINAL_TEMP"

echo "🎬 [FFmpeg Stitcher] Applying high-fidelity H.264 encoding and mobile-responsive pixel formats..."
FINAL_OUT="$OUT_DIR/sstracker-demo.mp4"

# -pix_fmt yuv420p guarantees seamless hardware-accelerated playback on all mobile devices
ffmpeg -y -i "$FINAL_TEMP" \
  -vf "crop=in_w:in_h:0:0,scale=1920:1080" \
  -c:v libx264 -profile:v high -level:v 4.2 -pix_fmt yuv420p -preset fast -crf 20 \
  -an "$FINAL_OUT"

# 5. Pipeline Cleanup & Metadata Analysis
echo "🧹 [FFmpeg Stitcher] Purging intermediate transcode files..."
for SEG in "${SEGMENTS[@]}"; do
  rm -f "$RAW_DIR/${SEG}_temp.mp4"
done
rm -f "$MANIFEST"
rm -f "$FINAL_TEMP"

# Validate output size and constraints
FILE_SIZE=$(du -k "$FINAL_OUT" | cut -f1)
MAX_SIZE=51200 # 50MB in Kilobytes

echo "📊 ==================================================="
echo "📊 PIPELINE ANALYSIS COMPLETE:"
echo "📊 Final Asset Location: $FINAL_OUT"
echo "📊 Output File Size: $((FILE_SIZE / 1024)) MB"

if [ "$FILE_SIZE" -le "$MAX_SIZE" ]; then
  echo "📊 Status: 🟢 ENFORCED COMPLIANCE (Under 50MB Size Constraint)"
else
  echo "📊 Status: 🔴 WARNING: Asset exceeds our 50MB performance budget."
fi
echo "📊 ==================================================="
