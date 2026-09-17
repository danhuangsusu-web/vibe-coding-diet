param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'assets')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null

function New-Canvas([int]$Width, [int]$Height, [System.Drawing.Color]$Color) {
  $bitmap = [System.Drawing.Bitmap]::new($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear($Color)
  return @($bitmap, $graphics)
}

function New-Brush([string]$Hex) {
  return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Hex))
}

function Draw-Text($Graphics, [string]$Text, [float]$Size, [float]$X, [float]$Y, [string]$Hex = '#2C2925', [bool]$Bold = $false) {
  $style = if ($Bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = [System.Drawing.Font]::new('Microsoft YaHei UI', $Size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Brush $Hex
  $Graphics.DrawString($Text, $font, $brush, $X, $Y)
  $brush.Dispose()
  $font.Dispose()
}

function Draw-Plate($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height) {
  $shadow = New-Brush '#CFC5B8'
  $plate = New-Brush '#FFFDF9'
  $rim = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#DED6CC'), 4)
  $Graphics.FillEllipse($shadow, $X + 8, $Y + 12, $Width, $Height)
  $Graphics.FillEllipse($plate, $X, $Y, $Width, $Height)
  $Graphics.DrawEllipse($rim, $X, $Y, $Width, $Height)
  $shadow.Dispose(); $plate.Dispose(); $rim.Dispose()
}

function Draw-Rice($Graphics, [float]$X, [float]$Y, [float]$Scale = 1) {
  $bowl = New-Brush '#D9E5E8'
  $rice = New-Brush '#FFFDF1'
  $outline = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#B7C7CC'), 3)
  $Graphics.FillEllipse($bowl, $X, $Y + 28 * $Scale, 150 * $Scale, 95 * $Scale)
  $Graphics.FillEllipse($rice, $X + 10 * $Scale, $Y, 130 * $Scale, 72 * $Scale)
  $Graphics.DrawEllipse($outline, $X + 10 * $Scale, $Y, 130 * $Scale, 72 * $Scale)
  $bowl.Dispose(); $rice.Dispose(); $outline.Dispose()
}

function Draw-Greens($Graphics, [float]$X, [float]$Y, [int]$Count = 12) {
  $leaf = New-Brush '#3E8F53'
  $stem = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#87B566'), 6)
  for ($index = 0; $index -lt $Count; $index++) {
    $dx = ($index % 4) * 38
    $dy = [math]::Floor($index / 4) * 35
    $Graphics.DrawLine($stem, $X + $dx + 18, $Y + $dy + 8, $X + $dx + 12, $Y + $dy + 38)
    $Graphics.FillEllipse($leaf, $X + $dx, $Y + $dy, 42, 26)
  }
  $leaf.Dispose(); $stem.Dispose()
}

function Draw-Tofu($Graphics, [float]$X, [float]$Y, [int]$Count = 8) {
  $tofu = New-Brush '#EBCB8A'
  $edge = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#B8793B'), 3)
  for ($index = 0; $index -lt $Count; $index++) {
    $dx = ($index % 4) * 62
    $dy = [math]::Floor($index / 4) * 58
    $Graphics.FillRectangle($tofu, $X + $dx, $Y + $dy, 48, 44)
    $Graphics.DrawRectangle($edge, $X + $dx, $Y + $dy, 48, 44)
  }
  $tofu.Dispose(); $edge.Dispose()
}

function Draw-BraisedPork($Graphics, [float]$X, [float]$Y, [int]$Count = 8) {
  $pork = New-Brush '#9F4E32'
  $shine = New-Brush '#D88955'
  for ($index = 0; $index -lt $Count; $index++) {
    $dx = ($index % 4) * 58
    $dy = [math]::Floor($index / 4) * 55
    $Graphics.FillRectangle($pork, $X + $dx, $Y + $dy, 48, 42)
    $Graphics.FillRectangle($shine, $X + $dx + 7, $Y + $dy + 5, 28, 7)
  }
  $pork.Dispose(); $shine.Dispose()
}

function Draw-TomatoEgg($Graphics, [float]$X, [float]$Y) {
  $egg = New-Brush '#F2C94C'
  $tomato = New-Brush '#D84E3F'
  for ($index = 0; $index -lt 8; $index++) {
    $dx = ($index % 4) * 48
    $dy = [math]::Floor($index / 4) * 42
    $Graphics.FillEllipse($egg, $X + $dx, $Y + $dy, 52, 36)
    $Graphics.FillEllipse($tomato, $X + $dx + 20, $Y + $dy + 8, 30, 26)
  }
  $egg.Dispose(); $tomato.Dispose()
}

function Save-Jpeg($Bitmap, [string]$Name) {
  $path = Join-Path $OutputDirectory $Name
  $Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
}

function Save-Png($Bitmap, [string]$Name) {
  $path = Join-Path $OutputDirectory $Name
  $Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

# Deterministic synthetic meal scene 1: steamed fish and rice.
$canvas = New-Canvas 900 900 ([System.Drawing.ColorTranslator]::FromHtml('#D5B48B'))
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-Plate $graphics 80 120 560 480
$fish = New-Brush '#C6B59B'; $fishEdge = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#756B5C'), 6)
$graphics.FillEllipse($fish, 180, 270, 350, 130); $graphics.DrawEllipse($fishEdge, 180, 270, 350, 130)
$tailPoints = [System.Drawing.Point[]]@([System.Drawing.Point]::new(530,335), [System.Drawing.Point]::new(620,270), [System.Drawing.Point]::new(620,400))
$graphics.FillPolygon($fish, $tailPoints)
$graphics.FillEllipse((New-Brush '#252525'), 220, 310, 14, 14)
$greenPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#4D8B55'), 8)
$graphics.DrawLine($greenPen, 240, 245, 500, 410)
Draw-Rice $graphics 670 310 1.1
Draw-Text $graphics '确定性合成评测素材' 22 24 842 '#5C4732'
Save-Jpeg $bitmap 'img-photo-001-steamed-fish-rice.jpg'
$fish.Dispose(); $fishEdge.Dispose(); $greenPen.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

# Scene 2: fried chicken and rice.
$canvas = New-Canvas 900 900 ([System.Drawing.ColorTranslator]::FromHtml('#B89368'))
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-Plate $graphics 70 130 600 500
$chicken = New-Brush '#A85F29'; $crust = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#6D351C'), 7)
foreach ($rect in @(@(150,260,170,120), @(340,230,180,135), @(270,390,190,130))) {
  $graphics.FillEllipse($chicken, $rect[0], $rect[1], $rect[2], $rect[3]); $graphics.DrawEllipse($crust, $rect[0], $rect[1], $rect[2], $rect[3])
}
Draw-Rice $graphics 675 320 1.05
Draw-Text $graphics '确定性合成评测素材' 22 24 842 '#4A3524'
Save-Jpeg $bitmap 'img-photo-002-fried-chicken-rice.jpg'
$chicken.Dispose(); $crust.Dispose(); $graphics.Dispose(); $bitmap.Dispose()

# Scene 3: tofu and greens.
$canvas = New-Canvas 900 900 ([System.Drawing.ColorTranslator]::FromHtml('#C9B99D'))
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-Plate $graphics 65 145 370 420; Draw-Tofu $graphics 120 285 8
Draw-Plate $graphics 470 145 370 420; Draw-Greens $graphics 560 285 12
Draw-Text $graphics '确定性合成评测素材' 22 24 842 '#4A4035'
Save-Jpeg $bitmap 'img-photo-003-tofu-greens.jpg'
$graphics.Dispose(); $bitmap.Dispose()

# Scene 4: three dishes and rice.
$canvas = New-Canvas 1000 900 ([System.Drawing.ColorTranslator]::FromHtml('#CBAA7A'))
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-Plate $graphics 40 80 410 320; Draw-BraisedPork $graphics 115 195 8
Draw-Plate $graphics 530 80 410 320; Draw-TomatoEgg $graphics 630 205
Draw-Plate $graphics 40 470 410 320; Draw-Greens $graphics 145 590 12
Draw-Plate $graphics 530 470 410 320; Draw-Rice $graphics 665 570 1.25
Draw-Text $graphics '确定性合成评测素材' 22 24 842 '#4A3524'
Save-Jpeg $bitmap 'img-photo-004-three-dishes-rice.jpg'
$graphics.Dispose(); $bitmap.Dispose()

# Low-quality derivative 1: aggressive downscale/upscale of scene 4.
$source = [System.Drawing.Bitmap]::FromFile((Join-Path $OutputDirectory 'img-photo-004-three-dishes-rice.jpg'))
$tiny = [System.Drawing.Bitmap]::new(35, 32)
$tinyGraphics = [System.Drawing.Graphics]::FromImage($tiny); $tinyGraphics.DrawImage($source, 0, 0, 35, 32)
$blurred = [System.Drawing.Bitmap]::new(1000, 900)
$blurGraphics = [System.Drawing.Graphics]::FromImage($blurred)
$blurGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$blurGraphics.DrawImage($tiny, 0, 0, 1000, 900)
Save-Jpeg $blurred 'img-lowq-001-heavy-blur.jpg'
$source.Dispose(); $tinyGraphics.Dispose(); $tiny.Dispose(); $blurGraphics.Dispose(); $blurred.Dispose()

# Low-quality derivative 2: dark and occluded scene 2.
$source = [System.Drawing.Bitmap]::FromFile((Join-Path $OutputDirectory 'img-photo-002-fried-chicken-rice.jpg'))
$dark = [System.Drawing.Bitmap]::new($source.Width, $source.Height)
$darkGraphics = [System.Drawing.Graphics]::FromImage($dark); $darkGraphics.DrawImage($source, 0, 0)
$overlay = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(145, 0, 0, 0))
$occlusion = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(225, 32, 29, 27))
$darkGraphics.FillRectangle($overlay, 0, 0, $dark.Width, $dark.Height)
$darkGraphics.FillRectangle($occlusion, 40, 150, 540, 520)
Save-Jpeg $dark 'img-lowq-002-occluded-dark.jpg'
$source.Dispose(); $overlay.Dispose(); $occlusion.Dispose(); $darkGraphics.Dispose(); $dark.Dispose()

function New-Menu([string]$Title) {
  $canvas = New-Canvas 750 1200 ([System.Drawing.ColorTranslator]::FromHtml('#F7F7F4'))
  $bitmap = $canvas[0]; $graphics = $canvas[1]
  $header = New-Brush '#E85D3F'; $graphics.FillRectangle($header, 0, 0, 750, 120); $header.Dispose()
  Draw-Text $graphics $Title 34 34 36 '#FFFFFF' $true
  return @($bitmap, $graphics)
}

function Draw-MenuRow($Graphics, [int]$Y, [string]$Name, [string]$Meta, [string]$Quantity = '') {
  $white = New-Brush '#FFFFFF'; $line = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#E5E2DD'), 2)
  $Graphics.FillRectangle($white, 24, $Y, 702, 130); $Graphics.DrawLine($line, 40, $Y + 128, 710, $Y + 128)
  $thumb = New-Brush '#E8C89A'; $Graphics.FillEllipse($thumb, 45, $Y + 25, 80, 80)
  Draw-Text $Graphics $Name 28 150 ($Y + 24) '#272522' $true; Draw-Text $Graphics $Meta 20 150 ($Y + 72) '#8B8580'
  if ($Quantity) {
    $badge = New-Brush '#E85D3F'; $Graphics.FillEllipse($badge, 650, $Y + 43, 44, 44); Draw-Text $Graphics $Quantity 22 664 ($Y + 50) '#FFFFFF' $true; $badge.Dispose()
  }
  $white.Dispose(); $line.Dispose(); $thumb.Dispose()
}

$canvas = New-Menu '购物车'
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-MenuRow $graphics 150 '红烧肉' '¥32  已加入购物车' '1'; Draw-MenuRow $graphics 290 '白米饭' '¥3  已加入购物车' '1'
Draw-Text $graphics '为你推荐' 26 34 470 '#635D57' $true; Draw-MenuRow $graphics 520 '炸鸡块' '热销推荐 · 未选择'; Draw-MenuRow $graphics 660 '麻婆豆腐' '本店推荐 · 未选择'
Save-Png $bitmap 'img-menu-001-cart-two-items.png'; $graphics.Dispose(); $bitmap.Dispose()

$canvas = New-Menu '订单详情'
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-MenuRow $graphics 150 '宫保鸡丁' 'x1  ¥28'; Draw-MenuRow $graphics 290 '白灼青菜' 'x1  ¥16'; Draw-MenuRow $graphics 430 '白米饭' 'x1  ¥3'
Draw-Text $graphics '配送费  ¥3' 23 40 620 '#66615C'; Draw-Text $graphics '满减优惠  -¥8' 23 40 670 '#D04D37'; Draw-Text $graphics '已下单' 30 580 1050 '#E85D3F' $true
Save-Png $bitmap 'img-menu-002-order-detail.png'; $graphics.Dispose(); $bitmap.Dispose()

$canvas = New-Menu '餐厅菜单'
$bitmap = $canvas[0]; $graphics = $canvas[1]
$menuRows = @('红烧肉','番茄炒蛋','宫保鸡丁','白灼青菜','麻婆豆腐','白米饭')
for ($index = 0; $index -lt $menuRows.Count; $index++) { Draw-MenuRow $graphics (140 + $index * 145) $menuRows[$index] ("¥" + (12 + $index * 3) + '  月售100+') }
Draw-Text $graphics '当前未选择任何菜品' 23 240 1060 '#8B8580'
Save-Png $bitmap 'img-menu-003-full-menu-no-selection.png'; $graphics.Dispose(); $bitmap.Dispose()

$canvas = New-Menu '点餐'
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-MenuRow $graphics 150 '红烧肉' '¥32'; Draw-MenuRow $graphics 290 '番茄炒蛋' '¥22  已选' '1'; Draw-MenuRow $graphics 430 '宫保鸡丁' '¥28'; Draw-MenuRow $graphics 570 '白灼青菜' '¥16'
Save-Png $bitmap 'img-menu-004-single-quantity-badge.png'; $graphics.Dispose(); $bitmap.Dispose()

$canvas = New-Menu '今日优惠'
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-Text $graphics '满 50 减 12 · 热销推荐' 30 38 145 '#D04D37' $true
Draw-MenuRow $graphics 220 '炸鸡套餐' '限时折扣 · 月售300'; Draw-MenuRow $graphics 360 '红烧肉盖饭' '店长推荐 · 月售500'; Draw-MenuRow $graphics 500 '麻婆豆腐' '招牌菜 · 月售200'
Draw-Text $graphics '促销展示页，没有已选或数量标记' 22 120 850 '#8B8580'
Save-Png $bitmap 'img-menu-005-promotion-no-selection.png'; $graphics.Dispose(); $bitmap.Dispose()

$canvas = New-Menu '购物车'
$bitmap = $canvas[0]; $graphics = $canvas[1]
Draw-MenuRow $graphics 150 '水煮蛋' '¥3  已加入购物车' '2'; Draw-MenuRow $graphics 290 '白米饭' '¥3  已加入购物车' '1'; Draw-MenuRow $graphics 430 '凉拌豆腐' '¥14  已加入购物车' '1'
Draw-Text $graphics '数量仅表示已选择，不进入餐食输出字段' 21 95 760 '#77716B'
Save-Png $bitmap 'img-menu-006-cart-quantities.png'; $graphics.Dispose(); $bitmap.Dispose()

Get-ChildItem -LiteralPath $OutputDirectory -File | Sort-Object Name | Select-Object Name, Length
