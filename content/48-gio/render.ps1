# Render short "48 gio": ghep hinh + tieng + do thi + phu de thanh mot file.
#
# Dau vao (dat cung thu muc nay):
#   master.mp4  - ban quay, KHONG chua chu, KHONG chua tieng noi
#   vo.wav      - voice-over
#   curve.png   - do thi nen trong suot (tao bang: ..\svg2png.ps1 curve.svg)
#   sub.ass     - phu de
# Dau ra:
#   out.mp4     - 1080x1920, H.264, san sang upload
#
# Vi sao tach roi: chu, tieng va do thi deu nam NGOAI master. Sua mot dong phu de
# hay xe dich do thi thi chi can chay lai script nay - khong mo lai project dung phim.
#
# CAN ffmpeg trong PATH:  winget install Gyan.FFmpeg
# (neu ID doi: winget search ffmpeg)
#
# Chay:  .\render.ps1
#        .\render.ps1 -CurveStart 13 -CurveEnd 38 -CurveY 380
#        .\render.ps1 -Master take3.mp4 -Out out-v2.mp4

param(
  [string]$Master     = 'master.mp4',
  [string]$Vo         = 'vo.wav',
  [string]$Curve      = 'curve.png',
  [string]$Out        = 'out.mp4',
  [double]$CurveStart = 13.0,   # do thi hien tu giay may (beat 0:13)
  [double]$CurveEnd   = 38.0,   # den giay may (het beat 0:31-0:38)
  [int]   $CurveY     = 380,    # vi tri doc trong khung 1920px
  [double]$Fade       = 0.35,   # fade vao/ra cua do thi, giay
  [int]   $Crf        = 18,
  [switch]$NoCurve              # render khong do thi, de xem nhanh
)

$ErrorActionPreference = 'Stop'

# Chay trong thu muc script: duong dan tuong doi trong filtergraph cua ffmpeg.
# Duong dan Windows tuyet doi (C:\...) rat kho escape trong filter 'ass'.
Push-Location $PSScriptRoot
try {
  if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw "Khong tim thay ffmpeg trong PATH. Cai: winget install Gyan.FFmpeg"
  }

  $need = @($Master, $Vo, 'sub.ass')
  if (-not $NoCurve) { $need += $Curve }
  foreach ($f in $need) { if (-not (Test-Path $f)) { throw "Thieu file: $f" } }

  Write-Host "Dang render $Out ..." -ForegroundColor Cyan

  if ($NoCurve) {
    $inputs = @('-i', $Master, '-i', $Vo)
    $fc     = "[0:v]ass=sub.ass[vout]"
  } else {
    # -loop 1 la BAT BUOC: mot file PNG vao ffmpeg chi la MOT khung, va filter
    # 'fade' lam viec tren timestamp - voi mot khung duy nhat thi fade khong dien
    # ra, overlay se lap lai dung khung do (trong suot hoan toan) suot ca video.
    # -loop 1 bien anh thanh mot luong lien tuc; -shortest o duoi cat theo master.
    $inputs = @('-i', $Master, '-i', $Vo, '-loop', '1', '-framerate', '30', '-i', $Curve)
    $fOut   = $CurveEnd - $Fade
    # format=rgba giu alpha; fade alpha=1 chi lam mo kenh alpha, khong lam den hinh.
    # overlay chi bat trong khoang [CurveStart, CurveEnd] de khong de hinh dinh ca video.
    $fc = @(
      "[2:v]format=rgba,fade=t=in:st=$CurveStart`:d=$Fade`:alpha=1,fade=t=out:st=$fOut`:d=$Fade`:alpha=1[cv]"
      "[0:v][cv]overlay=x=(W-w)/2:y=$CurveY`:enable='between(t,$CurveStart,$CurveEnd)'[ov]"
      "[ov]ass=sub.ass[vout]"
    ) -join ';'
  }

  $args = @(
    '-y', '-hide_banner', '-loglevel', 'warning', '-stats'
  ) + $inputs + @(
    '-filter_complex', $fc,
    '-map', '[vout]', '-map', '1:a:0',
    '-c:v', 'libx264', '-crf', "$Crf", '-preset', 'slow', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-shortest',
    $Out
  )

  # KHONG them 2>&1 vao dong duoi. ffmpeg ghi progress ra stderr, va PowerShell 5.1
  # boc tung dong stderr cua exe thanh ErrorRecord khi bi redirect - script se chet
  # du ffmpeg tra ve 0. De nguyen khong redirect thi stderr di thang ra console.
  & ffmpeg @args
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg that bai voi ma loi $LASTEXITCODE" }

  $size = [math]::Round((Get-Item $Out).Length / 1MB, 1)
  Write-Host "Xong: $Out ($size MB)" -ForegroundColor Green
  Write-Host "Kiem tren dien thoai that truoc khi dang:" -ForegroundColor Yellow
  Write-Host "  - phu de co nam TREN vung UI cua Shorts khong (MarginV 430 la uoc luong)" -ForegroundColor Yellow
  Write-Host "  - do thi o CurveY=$CurveY co che mat khong" -ForegroundColor Yellow
}
finally {
  Pop-Location
}
