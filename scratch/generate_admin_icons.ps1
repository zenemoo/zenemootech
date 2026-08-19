Add-Type -AssemblyName System.Drawing

$sourcePath = "branding\Zenemoo_Admin.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image branding\Zenemoo_Admin.png not found!"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile((Get-Item $sourcePath).FullName)

$transparentBg = [System.Drawing.Color]::Transparent
$darkBgColor = [System.Drawing.ColorTranslator]::FromHtml("#050505")

function Resize-SquareImage {
    param (
        [System.Drawing.Image]$src,
        [int]$targetSize,
        [double]$logoPaddingRatio, # e.g. 0.85 means logo takes 85% of canvas
        [string]$outputPath,
        [System.Drawing.Color]$bgColor
    )

    $bitmap = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($bgColor.A -ne 0) {
        $brush = New-Object System.Drawing.SolidBrush($bgColor)
        $graphics.FillRectangle($brush, 0, 0, $targetSize, $targetSize)
    } else {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    }

    # Calculate centered logo box with aspect ratio preserved
    $maxLogoSize = [int]($targetSize * $logoPaddingRatio)
    $srcW = $src.Width
    $srcH = $src.Height

    $scale = [Math]::Min($maxLogoSize / $srcW, $maxLogoSize / $srcH)
    $drawW = [int]($srcW * $scale)
    $drawH = [int]($srcH * $scale)

    $drawX = [int](($targetSize - $drawW) / 2)
    $drawY = [int](($targetSize - $drawH) / 2)

    $graphics.DrawImage($src, $drawX, $drawY, $drawW, $drawH)

    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

function Resize-SplashImage {
    param (
        [System.Drawing.Image]$src,
        [int]$targetW,
        [int]$targetH,
        [string]$outputPath,
        [System.Drawing.Color]$bgColor
    )

    $bitmap = New-Object System.Drawing.Bitmap($targetW, $targetH)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark background #050505
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $graphics.FillRectangle($brush, 0, 0, $targetW, $targetH)

    # Logo takes up ~45% of shorter dimension
    $shorterDim = [Math]::Min($targetW, $targetH)
    $maxLogoSize = [int]($shorterDim * 0.45)

    $scale = [Math]::Min($maxLogoSize / $src.Width, $maxLogoSize / $src.Height)
    $drawW = [int]($src.Width * $scale)
    $drawH = [int]($src.Height * $scale)

    $drawX = [int](($targetW - $drawW) / 2)
    $drawY = [int](($targetH - $drawH) / 2)

    $graphics.DrawImage($src, $drawX, $drawY, $drawW, $drawH)

    $dir = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

# Generate standard Mipmap Launcher icons & Adaptive Foreground icons ONLY for android-admin
$mipmapConfigs = @(
    @{ name = "mipmap-mdpi";    iconSize = 48;  fgSize = 108 },
    @{ name = "mipmap-hdpi";    iconSize = 72;  fgSize = 162 },
    @{ name = "mipmap-xhdpi";   iconSize = 96;  fgSize = 216 },
    @{ name = "mipmap-xxhdpi";  iconSize = 144; fgSize = 288 },
    @{ name = "mipmap-xxxhdpi"; iconSize = 192; fgSize = 432 }
)

$resBase = "android-admin\app\src\main\res"

foreach ($cfg in $mipmapConfigs) {
    $folder = Join-Path $resBase $cfg.name
    
    # Standard launcher icon (icon with dark #050505 background)
    Resize-SquareImage -src $srcImg -targetSize $cfg.iconSize -logoPaddingRatio 0.85 -outputPath (Join-Path $folder "ic_launcher.png") -bgColor $darkBgColor
    Resize-SquareImage -src $srcImg -targetSize $cfg.iconSize -logoPaddingRatio 0.85 -outputPath (Join-Path $folder "ic_launcher_round.png") -bgColor $darkBgColor
    
    # Adaptive Foreground icon (logo inside 66% safe zone centered in canvas for Android 8+)
    Resize-SquareImage -src $srcImg -targetSize $cfg.fgSize -logoPaddingRatio 0.60 -outputPath (Join-Path $folder "ic_launcher_foreground.png") -bgColor $transparentBg
}

# Generate Notification icons for android-admin
$notificationConfigs = @(
    @{ name = "drawable-mdpi";    size = 24 },
    @{ name = "drawable-hdpi";    size = 36 },
    @{ name = "drawable-xhdpi";   size = 48 },
    @{ name = "drawable-xxhdpi";  size = 72 },
    @{ name = "drawable-xxxhdpi"; size = 96 }
)

foreach ($ncfg in $notificationConfigs) {
    $folder = Join-Path $resBase $ncfg.name
    Resize-SquareImage -src $srcImg -targetSize $ncfg.size -logoPaddingRatio 0.90 -outputPath (Join-Path $folder "ic_notification.png") -bgColor $transparentBg
}

# Generate Splash Screen images for android-admin
$splashConfigs = @(
    @{ name = "drawable";             w = 480;  h = 800 },
    @{ name = "drawable-port-mdpi";    w = 320;  h = 480 },
    @{ name = "drawable-port-hdpi";    w = 480;  h = 800 },
    @{ name = "drawable-port-xhdpi";   w = 720;  h = 1280 },
    @{ name = "drawable-port-xxhdpi";  w = 960;  h = 1600 },
    @{ name = "drawable-port-xxxhdpi"; w = 1280; h = 1920 },
    @{ name = "drawable-land-mdpi";    w = 480;  h = 320 },
    @{ name = "drawable-land-hdpi";    w = 800;  h = 480 },
    @{ name = "drawable-land-xhdpi";   w = 1280; h = 720 },
    @{ name = "drawable-land-xxhdpi";  w = 1600; h = 960 },
    @{ name = "drawable-land-xxxhdpi"; w = 1920; h = 1280 }
)

foreach ($scfg in $splashConfigs) {
    $folder = Join-Path $resBase $scfg.name
    Resize-SplashImage -src $srcImg -targetW $scfg.w -targetH $scfg.h -outputPath (Join-Path $folder "splash.png") -bgColor $darkBgColor
}

$srcImg.Dispose()
Write-Host "All Zenemoo Admin Android icons and splash screens generated successfully!"
