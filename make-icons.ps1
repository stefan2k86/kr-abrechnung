# Erzeugt die App-Icons aus assets/logo_usv_src.png.
# Aufruf:  powershell -NoProfile -ExecutionPolicy Bypass -File .\make-icons.ps1
Add-Type -AssemblyName System.Drawing
$assets = Join-Path $PSScriptRoot "assets"
$src = Join-Path $assets "logo_usv_src.png"
$img = [System.Drawing.Image]::FromFile($src)
Write-Host "Quelle: $($img.Width) x $($img.Height)"

function Make-Icon([int]$size, [string]$outFile, [double]$pad) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'HighQuality'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::White)   # weisser Hintergrund (fuer "maskable")
  $inner = $size * (1.0 - 2.0 * $pad)
  $scale = [Math]::Min($inner / $img.Width, $inner / $img.Height)
  $w = $img.Width * $scale; $h = $img.Height * $scale
  $g.DrawImage($img, ($size - $w) / 2.0, ($size - $h) / 2.0, $w, $h)
  $g.Dispose()
  $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "geschrieben: $outFile"
}

Make-Icon 192 (Join-Path $assets "icon-192.png") 0.10
Make-Icon 512 (Join-Path $assets "icon-512.png") 0.10
Make-Icon 180 (Join-Path $assets "apple-touch-icon.png") 0.06

# logo.png: verkleinerte Fassung mit transparentem Hintergrund fuer die Anzeige in der App
$maxH = 200.0
$s = [Math]::Min(1.0, $maxH / $img.Height)
$lw = [int][Math]::Round($img.Width * $s); $lh = [int][Math]::Round($img.Height * $s)
$lb = New-Object System.Drawing.Bitmap($lw, $lh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$lg = [System.Drawing.Graphics]::FromImage($lb)
$lg.SmoothingMode = 'HighQuality'; $lg.InterpolationMode = 'HighQualityBicubic'; $lg.PixelOffsetMode = 'HighQuality'
$lg.DrawImage($img, 0, 0, $lw, $lh)
$lg.Dispose()
$lb.Save((Join-Path $assets "logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$lb.Dispose()
Write-Host "geschrieben: $(Join-Path $assets 'logo.png') ($lw x $lh)"

$img.Dispose()
