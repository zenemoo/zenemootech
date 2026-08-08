Add-Type -AssemblyName System.Drawing
$imgPath = "frontend/public/assets/logo.png"
$outputPath = "frontend/public/assets/logo-email.png"
$img = [System.Drawing.Image]::FromFile((Resolve-Path $imgPath))
$bmp = New-Object System.Drawing.Bitmap(128, 128)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 128, 128)
$bmp.Save((Join-Path (Get-Location) $outputPath), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "Resized logo successfully"
