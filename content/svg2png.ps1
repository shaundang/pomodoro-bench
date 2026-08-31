# SVG -> PNG nen trong suot, dung Chrome co san tren may. KHONG can cai gi.
#
# Vi sao Chrome: may nay khong co inkscape / imagemagick / rsvg-convert / cairosvg,
# va ffmpeg KHONG doc duoc SVG. Chrome headless render SVG dung chuan va xuat
# duoc alpha that (Format32bppArgb, goc A=0).
#
# Luu y: PHAI dung --headless=new va --user-data-dir. Voi --headless cu (khong
# co user-data-dir) Chrome thoat im lang, khong tao file, khong bao loi.
#
# Chay:  .\svg2png.ps1 48-gio\curve.svg
#        .\svg2png.ps1 48-gio\curve.svg -Width 1080 -Height 880 -Scale 2

param(
  [Parameter(Mandatory = $true)][string]$Svg,
  [string]$Out,
  [int]$Width  = 0,   # 0 = doc tu viewBox cua SVG
  [int]$Height = 0,
  [int]$Scale  = 1    # 2 = xuat gap doi kich thuoc, dung khi can phong to trong editor
)

$ErrorActionPreference = 'Stop'

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) { throw "Khong tim thay Chrome hoac Edge." }

$svgPath = (Resolve-Path $Svg).Path
if (-not $Out) { $Out = [IO.Path]::ChangeExtension($svgPath, '.png') }

# Doc viewBox neu chua truyen kich thuoc
if ($Width -eq 0 -or $Height -eq 0) {
  # -Raw va -TotalCount khong dung chung duoc: doc 5 dong dau roi noi lai.
  $head = (Get-Content $svgPath -TotalCount 5) -join "`n"
  if ($head -match 'viewBox\s*=\s*"[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"') {
    if ($Width  -eq 0) { $Width  = [int][math]::Ceiling([double]$Matches[1]) }
    if ($Height -eq 0) { $Height = [int][math]::Ceiling([double]$Matches[2]) }
  } else {
    throw "Khong doc duoc viewBox tu $Svg - truyen -Width va -Height."
  }
}

$tmpProfile = Join-Path $env:TEMP "svg2png-$(Get-Random)"
$uri = 'file:///' + ($svgPath -replace '\\', '/')

try {
  # BAY CUA POWERSHELL 5.1: khi stderr cua mot exe bi redirect, PS boc TUNG DONG
  # thanh ErrorRecord (NativeCommandError). Chrome ghi "N bytes written to file"
  # ra stderr khi thanh cong, nen voi $ErrorActionPreference='Stop' o dau file
  # thi script chet DU ANH DA XUAT XONG. Ha EAP quanh dung loi goi nay.
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $chrome --headless=new --disable-gpu --no-sandbox `
      --user-data-dir="$tmpProfile" --hide-scrollbars `
      --default-background-color=00000000 `
      --force-device-scale-factor=$Scale `
      --window-size="$Width,$Height" `
      --screenshot="$Out" $uri 2>&1 | Out-Null
  } finally {
    $ErrorActionPreference = $prevEAP
  }

  if (-not (Test-Path $Out)) { throw "Chrome khong tao duoc $Out" }

  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap($Out)
  $corner = $bmp.GetPixel(2, 2)
  Write-Host ("{0}  {1}x{2}  {3}  {4} KB" -f (Split-Path $Out -Leaf),
    $bmp.Width, $bmp.Height, $bmp.PixelFormat,
    [math]::Round((Get-Item $Out).Length / 1KB, 1)) -ForegroundColor Green
  if ($corner.A -eq 0) {
    Write-Host "Nen trong suot: OK (goc A=0)" -ForegroundColor Green
  } else {
    Write-Warning "Nen KHONG trong suot (goc A=$($corner.A)) - kiem lai --default-background-color"
  }
  $bmp.Dispose()
}
finally {
  if (Test-Path $tmpProfile) { Remove-Item $tmpProfile -Recurse -Force -ErrorAction SilentlyContinue }
}
