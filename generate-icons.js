const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generate() {
  const opt1Path = path.join(__dirname, 'public', 'icon-opt1.svg');
  const iconSvgPath = path.join(__dirname, 'public', 'icon.svg');
  
  // 1. Overwrite public/icon.svg with selected Option 1 design
  fs.copyFileSync(opt1Path, iconSvgPath);
  console.log('✓ Overwritten public/icon.svg with Option 1');

  const svgBuffer = fs.readFileSync(iconSvgPath);

  // 192x192 PWA Icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, 'public', 'icon-192.png'));
  console.log('✓ Generated icon-192.png');

  // 512x512 PWA Icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, 'public', 'icon-512.png'));
  console.log('✓ Generated icon-512.png');

  // 180x180 Apple Touch Icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, 'public', 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');

  // 32x32 Favicon PNG
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, 'public', 'favicon.png'));
  console.log('✓ Generated favicon.png');

  // 48x48 Favicon PNG / ICO fallback
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(__dirname, 'public', 'favicon.ico'));
  console.log('✓ Generated favicon.ico');
}

generate().catch(console.error);
