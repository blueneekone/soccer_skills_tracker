# ==============================================================================
# SSTRACKER DIGITAL MONETIZATION PIPELINE: FFMPEG POWERSHELL STITCHER (v3)
# ==============================================================================
# This script programmatically merges, crops, and encodes the raw Playwright clips
# into SvelteKit's static folder (static/assets/video/sstracker-demo.mp4) under 50MB.
# Runs natively on Windows PowerShell systems.
# ==============================================================================

$ErrorActionPreference = "Stop"

# Pre-flight Check: Ensure FFmpeg is available in the current PATH
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Error "❌ [DevOps Error] FFmpeg is not installed or missing from the local environment PATH."
    Write-Host "Please install FFmpeg and ensure it is added to your Windows environment variables (System PATH)."
    exit 1
}

Write-Host "🎬 [FFmpeg Stitcher] Initiating Windows post-processing pipeline..."

$RawDir = "./recordings"
$OutDir = "./static/assets/video"

# Ensure output directory exists
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}

$Segments = @("director-segment", "player-segment", "fan-segment", "parent-segment")

# 1. Verification: Assert that all four raw WebM segments exist and are non-empty
foreach ($Seg in $Segments) {
    $File = Join-Path $RawDir "$Seg.webm"
    if (-not (Test-Path $File)) {
        Write-Error "❌ [DevOps Error] Could not locate valid raw segment file at: $File"
        Write-Host "Please ensure you run 'node scripts/record-demo-v2.js' before executing this stitcher script."
        exit 1
    }
    
    $FileInfo = Get-Item $File
    if ($FileInfo.Length -eq 0) {
        Write-Error "❌ [DevOps Error] Raw segment file is empty: $File"
        exit 1
    }
}

# 2. Intermediate Encoding & Aspect Ratio Optimization
Write-Host "🎬 [FFmpeg Stitcher] Transcoding independent segments to uniform intermediate MP4 streams..."

foreach ($Seg in $Segments) {
    Write-Host "👉 Processing: $Seg.webm"
    $InputFile = Join-Path $RawDir "$Seg.webm"
    $OutputFile = Join-Path $RawDir "${Seg}_temp.mp4"
    
    & ffmpeg -y -i $InputFile -vf "scale=1920:1080,setsar=1" -c:v libx264 -preset superfast -crf 18 -an $OutputFile
}

# 3. Create the Merging Manifest
Write-Host "🎬 [FFmpeg Stitcher] Constructing concatenation list manifest..."
$Manifest = Join-Path $RawDir "concat_list.txt"
if (Test-Path $Manifest) {
    Remove-Item $Manifest -Force
}

# Ensure standard ascii/utf8 formatting without BOM so FFmpeg doesn't choke on Windows encoding
[System.IO.File]::WriteAllLines($Manifest, [string[]]@("file 'director-segment_temp.mp4'"))

# Append remaining streams safely
for ($i = 1; $i -lt $Segments.Count; $i++) {
    $Seg = $Segments[$i]
    Add-Content -Path $Manifest -Value "file '${Seg}_temp.mp4'" -Encoding Ascii
}

# 4. Sequentially Merge and Crop the Assets
Write-Host "🎬 [FFmpeg Stitcher] Concatenating intermediate streams and executing digital crop..."
$FinalTemp = Join-Path $RawDir "merged_unprocessed.mp4"

& ffmpeg -y -f concat -safe 0 -i $Manifest -c copy $FinalTemp

Write-Host "🎬 [FFmpeg Stitcher] Applying high-fidelity H.264 encoding and mobile-responsive pixel formats..."
$FinalOut = Join-Path $OutDir "sstracker-demo.mp4"

# -pix_fmt yuv420p guarantees seamless hardware-accelerated playback on all mobile devices
& ffmpeg -y -i $FinalTemp -vf "crop=in_w:in_h:0:0,scale=1920:1080" -c:v libx264 -profile:v high -level:v 4.2 -pix_fmt yuv420p -preset fast -crf 20 -an $FinalOut

# 5. Pipeline Cleanup & Metadata Analysis
Write-Host "🧹 [FFmpeg Stitcher] Purging intermediate transcode files..."
foreach ($Seg in $Segments) {
    $TempFile = Join-Path $RawDir "${Seg}_temp.mp4"
    if (Test-Path $TempFile) {
        Remove-Item $TempFile -Force
    }
}
if (Test-Path $Manifest) { Remove-Item $Manifest -Force }
if (Test-Path $FinalTemp) { Remove-Item $FinalTemp -Force }

# Validate output size and constraints
$FileLength = (Get-Item $FinalOut).Length
$FileSizeKB = $FileLength / 1KB
$MaxSizeKB = 51200 # 50MB in Kilobytes
$FileSizeMB = [math]::Round($FileSizeKB / 1024, 2)

Write-Host "📊 ==================================================="
Write-Host "📊 PIPELINE ANALYSIS COMPLETE:"
Write-Host "📊 Final Asset Location: $FinalOut"
Write-Host "📊 Output File Size: $FileSizeMB MB"

if ($FileSizeKB -le $MaxSizeKB) {
    Write-Host "📊 Status: 🟢 ENFORCED COMPLIANCE (Under 50MB Size Constraint)"
} else {
    Write-Warning "📊 Status: 🔴 WARNING: Asset exceeds our 50MB performance budget."
}
Write-Host "📊 ==================================================="
