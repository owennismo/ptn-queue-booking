const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 🌟 OPTION 1: Smart Medical Logistics (3D Truck + Glowing Cross + Queue Clock)
const opt1Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="40%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="truckBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.35" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect width="512" height="512" rx="128" fill="url(#bg1)" />
  
  <!-- Subtle Lighting Ring -->
  <rect x="8" y="8" width="496" height="496" rx="120" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.2" />
  <circle cx="120" cy="100" r="180" fill="#34d399" opacity="0.15" filter="url(#glow)" />

  <g filter="url(#shadow1)">
    <!-- Delivery Truck Cabin & Container -->
    <!-- Container Body -->
    <rect x="90" y="160" width="220" height="170" rx="24" fill="url(#truckBody)" />
    <!-- Truck Cabin -->
    <path d="M310 200 L380 200 C395 200 410 215 415 230 L425 275 C430 290 425 330 405 330 L310 330 Z" fill="url(#truckBody)" />
    <!-- Cabin Window -->
    <path d="M325 215 L375 215 C385 215 395 225 398 238 L405 270 L325 270 Z" fill="#0f172a" opacity="0.85" />
    
    <!-- Medical Cross on Container -->
    <g transform="translate(200, 245)">
      <rect x="-14" y="-42" width="28" height="84" rx="10" fill="url(#crossGrad)" />
      <rect x="-42" y="-14" width="84" height="28" rx="10" fill="url(#crossGrad)" />
    </g>

    <!-- Truck Wheels -->
    <circle cx="160" cy="335" r="32" fill="#0f172a" />
    <circle cx="160" cy="335" r="16" fill="#94a3b8" />
    <circle cx="360" cy="335" r="32" fill="#0f172a" />
    <circle cx="360" cy="335" r="16" fill="#94a3b8" />
  </g>

  <!-- Speed & Queue Pulse Badge (Top Right) -->
  <g transform="translate(370, 140)" filter="url(#shadow1)">
    <circle cx="0" cy="0" r="46" fill="url(#goldGrad)" stroke="#ffffff" stroke-width="4" />
    <!-- Clock Hands -->
    <circle cx="0" cy="0" r="36" fill="#ffffff" />
    <path d="M0 -22 L0 0 L14 10" stroke="#d97706" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="0" cy="0" r="4" fill="#d97706" />
  </g>

  <!-- Bottom Brand Typography -->
  <text x="256" y="425" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">PTN PHARMA</text>
  <text x="256" y="465" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#6ee7b7" text-anchor="middle" letter-spacing="1">ระบบจองคิวขนส่ง</text>
</svg>`;

// 🌟 OPTION 2: Modern Monogram PTN + Medical Shield & Speed Wing
const opt2Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="50%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
    <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <rect width="512" height="512" rx="128" fill="url(#bg2)" />
  <rect x="8" y="8" width="496" height="496" rx="120" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.15" />

  <!-- Shield Base -->
  <g filter="url(#shadow2)" transform="translate(256, 215)">
    <!-- Outer Shield -->
    <path d="M0 -120 L110 -75 C110 50 70 125 0 155 C-70 125 -110 50 -110 -75 Z" fill="url(#shieldGrad)" stroke="#ffffff" stroke-width="6" />
    
    <!-- Inner Medical Cross & Wing -->
    <!-- Medical Cross in Center -->
    <path d="M-18 -65 L18 -65 L18 -25 L58 -25 L58 11 L18 11 L18 51 L-18 51 L-18 11 L-58 11 L-58 -25 L-18 -25 Z" fill="#ffffff" />
    
    <!-- Speed Wings Behind -->
    <path d="M-90 -20 L-130 -50 L-100 0 Z" fill="url(#gold2)" />
    <path d="M90 -20 L130 -50 L100 0 Z" fill="url(#gold2)" />
  </g>

  <!-- Typography -->
  <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">PTN PHARMA</text>
  <text x="256" y="462" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#a7f3d0" text-anchor="middle" letter-spacing="2">SMART QUEUE</text>
</svg>`;

// 🌟 OPTION 3: Smart Pharma Capsule & Fast Queue Route
const opt3Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="50%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="capsuleWhite" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="capsuleCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <filter id="shadow3" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <rect width="512" height="512" rx="128" fill="url(#bg3)" />
  <rect x="8" y="8" width="496" height="496" rx="120" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.25" />

  <!-- Diagonal 3D Capsule Merged with Checkmark -->
  <g filter="url(#shadow3)" transform="translate(256, 210) rotate(-40)">
    <!-- Top Half (Medical Cyan) -->
    <path d="M-55 -110 C-55 -145 55 -145 55 -110 L55 0 L-55 0 Z" fill="url(#capsuleCyan)" />
    <!-- Bottom Half (Pearl White) -->
    <path d="M-55 0 L55 0 L55 110 C55 145 -55 145 -55 110 Z" fill="url(#capsuleWhite)" />
    <!-- Capsule Seam -->
    <line x1="-55" y1="0" x2="55" y2="0" stroke="#cbd5e1" stroke-width="4" />
    
    <!-- White Medical Cross on Cyan side -->
    <rect x="-8" y="-85" width="16" height="50" rx="6" fill="#ffffff" />
    <rect x="-25" y="-68" width="50" height="16" rx="6" fill="#ffffff" />

    <!-- Green Pulse check on white side -->
    <circle cx="0" cy="55" r="24" fill="#10b981" />
    <path d="M-8 55 L-2 61 L10 49" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>

  <!-- Typography -->
  <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">PTN PHARMA</text>
  <text x="256" y="462" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#d1fae5" text-anchor="middle" letter-spacing="1">พัฒนาเภสัช • จองคิว</text>
</svg>`;

// 🌟 OPTION 4: Minimalist 3D Precision Queue Box (Apple Design Style)
const opt4Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22" />
      <stop offset="50%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="boxFront" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="boxTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <linearGradient id="boxSide" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="100%" stop-color="#065f46" />
    </linearGradient>
    <filter id="shadow4" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <rect width="512" height="512" rx="128" fill="url(#bg4)" />
  <rect x="8" y="8" width="496" height="496" rx="120" fill="none" stroke="#34d399" stroke-width="2" stroke-opacity="0.4" />

  <!-- 3D Isometric Warehouse / Medical Cargo Box -->
  <g filter="url(#shadow4)" transform="translate(256, 205)">
    <!-- Top Face -->
    <path d="M0 -100 L100 -45 L0 10 L-100 -45 Z" fill="url(#boxTop)" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" />
    <!-- Left Face -->
    <path d="M-100 -45 L0 10 L0 120 L-100 65 Z" fill="url(#boxFront)" />
    <!-- Right Face -->
    <path d="M0 10 L100 -45 L100 65 L0 120 Z" fill="url(#boxSide)" />

    <!-- Top Medical Cross -->
    <g transform="translate(0, -45) scale(0.65)">
      <path d="M-15 -45 L15 -45 L15 -15 L45 -15 L45 15 L15 15 L15 45 L-15 45 L-15 15 L-45 15 L-45 -15 L-15 -15 Z" fill="#ffffff" />
    </g>

    <!-- Fast Queue Arrow on Front Face -->
    <path d="M-60 10 L-25 30 L-25 65 L-60 45 Z" fill="#ffffff" opacity="0.9" />
  </g>

  <!-- Typography -->
  <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">PTN PHARMA</text>
  <text x="256" y="462" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#6ee7b7" text-anchor="middle" letter-spacing="2">LOGISTICS QUEUE</text>
</svg>`;

async function main() {
  const publicDir = path.join(__dirname, 'public');
  
  const options = [
    { name: 'opt1', svg: opt1Svg },
    { name: 'opt2', svg: opt2Svg },
    { name: 'opt3', svg: opt3Svg },
    { name: 'opt4', svg: opt4Svg },
  ];

  for (const opt of options) {
    const svgFile = path.join(publicDir, `icon-${opt.name}.svg`);
    const pngFile = path.join(publicDir, `icon-${opt.name}.png`);

    fs.writeFileSync(svgFile, opt.svg);
    await sharp(Buffer.from(opt.svg))
      .resize(512, 512)
      .png()
      .toFile(pngFile);
    console.log(`✓ Rendered ${opt.name} to SVG & PNG`);
  }
}

main().catch(console.error);
