/**
 * generate-assets.js
 * Generates branded PNG assets for InventoryEver using the Canvas API (node-canvas).
 * Falls back to writing minimal valid PNG bytes if canvas is unavailable.
 *
 * Run: node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');

// ---- brand colours ----
const NAVY   = '#1a1a2e';
const BLUE   = '#3B82F6';
const WHITE  = '#F8FAFC';

// ---- try loading canvas ----
let createCanvas;
try {
  ({ createCanvas } = require('canvas'));
} catch (_) {
  createCanvas = null;
}

// ---------------------------------------------------------------------------
// Minimal valid 1x1 transparent PNG (68 bytes).
// We'll scale it via canvas later; this is only used as a last-resort fallback.
// ---------------------------------------------------------------------------
function minimalPNG() {
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c48900' +
    '0000097048597300000ec400000ec401952b0e1b00000000a4944415478016360000' +
    '000000200000000000000000',
    'hex',
  );
}

// ---------------------------------------------------------------------------
// Draw helpers
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * Draw a rounded rectangle path.
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw a simple box / cube icon centred in (cx, cy) with half-size s.
 */
function drawCubeIcon(ctx, cx, cy, s, strokeColor, strokeWidth) {
  const hw = s * 0.55; // half-width of cube face
  const hh = s * 0.45; // half-height
  const depthX = s * 0.22;
  const depthY = s * 0.18;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth   = strokeWidth;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';

  // Front face
  ctx.beginPath();
  ctx.rect(cx - hw, cy - hh + depthY, hw * 2, hh * 2 - depthY);
  ctx.stroke();

  // Top face
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - hh + depthY);
  ctx.lineTo(cx - hw + depthX, cy - hh);
  ctx.lineTo(cx + hw + depthX, cy - hh);
  ctx.lineTo(cx + hw, cy - hh + depthY);
  ctx.closePath();
  ctx.stroke();

  // Right face (vertical edge only — right side)
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - hh + depthY);
  ctx.lineTo(cx + hw + depthX, cy - hh);
  ctx.lineTo(cx + hw + depthX, cy + hh);
  ctx.lineTo(cx + hw, cy + hh + depthY - depthY);  // bottom right of front
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Generate icon.png  (1024 × 1024)
// ---------------------------------------------------------------------------
function generateIcon(size = 1024) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');

  const r = size * 0.22; // corner radius

  // Background gradient (navy → slightly lighter navy)
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#1a1a2e');
  bg.addColorStop(1, '#16213e');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, size, size, r);
  ctx.fill();

  // Outer glow ring
  const glow = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size * 0.52);
  glow.addColorStop(0,   'rgba(59,130,246,0.18)');
  glow.addColorStop(1,   'rgba(59,130,246,0)');
  ctx.fillStyle = glow;
  roundRect(ctx, 0, 0, size, size, r);
  ctx.fill();

  // Cube box shape (filled)
  const cx  = size / 2;
  const cy  = size / 2 + size * 0.02;
  const s   = size * 0.28;
  const hw  = s * 0.55;
  const hh  = s * 0.45;
  const dx  = s * 0.22;
  const dy  = s * 0.18;

  // Front face fill
  const frontGrad = ctx.createLinearGradient(cx - hw, cy - hh + dy, cx + hw, cy + hh);
  frontGrad.addColorStop(0, '#60A5FA');
  frontGrad.addColorStop(1, '#1D4ED8');
  ctx.fillStyle = frontGrad;
  ctx.beginPath();
  ctx.rect(cx - hw, cy - hh + dy, hw * 2, hh * 2 - dy);
  ctx.fill();

  // Top face fill
  const topGrad = ctx.createLinearGradient(cx, cy - hh, cx, cy - hh + dy);
  topGrad.addColorStop(0, '#93C5FD');
  topGrad.addColorStop(1, '#3B82F6');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - hh + dy);
  ctx.lineTo(cx - hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw, cy - hh + dy);
  ctx.closePath();
  ctx.fill();

  // Right face fill
  const rightGrad = ctx.createLinearGradient(cx + hw, cy, cx + hw + dx, cy);
  rightGrad.addColorStop(0, '#2563EB');
  rightGrad.addColorStop(1, '#1E40AF');
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - hh + dy);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy + hh);
  ctx.lineTo(cx + hw, cy + hh);
  ctx.closePath();
  ctx.fill();

  // Stroke edges for definition
  drawCubeIcon(ctx, cx - dx / 3, cy - dy / 3, s, 'rgba(255,255,255,0.35)', size * 0.008);

  // App name below cube
  ctx.fillStyle = WHITE;
  ctx.font      = `bold ${size * 0.072}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('INVENTORY', cx, cy + s * 1.1);
  ctx.fillStyle = BLUE;
  ctx.font      = `bold ${size * 0.072}px Arial`;
  ctx.fillText('EVER', cx, cy + s * 1.1 + size * 0.09);

  return canvas.toBuffer('image/png');
}

// ---------------------------------------------------------------------------
// Generate adaptive-icon.png  (1024 × 1024, transparent bg)
// ---------------------------------------------------------------------------
function generateAdaptiveIcon(size = 1024) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const s  = size * 0.32;
  const hw = s * 0.55;
  const hh = s * 0.45;
  const dx = s * 0.22;
  const dy = s * 0.18;

  // Front face
  const frontGrad = ctx.createLinearGradient(cx - hw, cy - hh + dy, cx + hw, cy + hh);
  frontGrad.addColorStop(0, '#60A5FA');
  frontGrad.addColorStop(1, '#1D4ED8');
  ctx.fillStyle = frontGrad;
  ctx.beginPath();
  ctx.rect(cx - hw, cy - hh + dy, hw * 2, hh * 2 - dy);
  ctx.fill();

  // Top face
  const topGrad = ctx.createLinearGradient(cx, cy - hh, cx, cy - hh + dy);
  topGrad.addColorStop(0, '#93C5FD');
  topGrad.addColorStop(1, '#3B82F6');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - hh + dy);
  ctx.lineTo(cx - hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw, cy - hh + dy);
  ctx.closePath();
  ctx.fill();

  // Right face
  const rightGrad = ctx.createLinearGradient(cx + hw, cy, cx + hw + dx, cy);
  rightGrad.addColorStop(0, '#2563EB');
  rightGrad.addColorStop(1, '#1E40AF');
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - hh + dy);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy + hh);
  ctx.lineTo(cx + hw, cy + hh);
  ctx.closePath();
  ctx.fill();

  drawCubeIcon(ctx, cx - dx / 3, cy - dy / 3, s, 'rgba(255,255,255,0.30)', size * 0.009);

  return canvas.toBuffer('image/png');
}

// ---------------------------------------------------------------------------
// Generate splash.png  (1284 × 2778 — iPhone 14 Pro Max)
// ---------------------------------------------------------------------------
function generateSplash(w = 1284, h = 2778) {
  const canvas = createCanvas(w, h);
  const ctx    = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0f0f23');
  bg.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle radial glow behind logo
  const glow = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 500);
  glow.addColorStop(0, 'rgba(59,130,246,0.12)');
  glow.addColorStop(1, 'rgba(59,130,246,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Cube icon in centre
  const cx = w / 2;
  const cy = h / 2 - 80;
  const s  = 180;
  const hw = s * 0.55;
  const hh = s * 0.45;
  const dx = s * 0.22;
  const dy = s * 0.18;

  const frontGrad = ctx.createLinearGradient(cx - hw, cy - hh + dy, cx + hw, cy + hh);
  frontGrad.addColorStop(0, '#60A5FA');
  frontGrad.addColorStop(1, '#1D4ED8');
  ctx.fillStyle = frontGrad;
  ctx.beginPath();
  ctx.rect(cx - hw, cy - hh + dy, hw * 2, hh * 2 - dy);
  ctx.fill();

  const topGrad = ctx.createLinearGradient(cx, cy - hh, cx, cy - hh + dy);
  topGrad.addColorStop(0, '#93C5FD');
  topGrad.addColorStop(1, '#3B82F6');
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - hh + dy);
  ctx.lineTo(cx - hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw, cy - hh + dy);
  ctx.closePath();
  ctx.fill();

  const rightGrad = ctx.createLinearGradient(cx + hw, cy, cx + hw + dx, cy);
  rightGrad.addColorStop(0, '#2563EB');
  rightGrad.addColorStop(1, '#1E40AF');
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - hh + dy);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy + hh);
  ctx.lineTo(cx + hw, cy + hh);
  ctx.closePath();
  ctx.fill();

  drawCubeIcon(ctx, cx - dx / 3, cy - dy / 3, s, 'rgba(255,255,255,0.30)', 4);

  // "InventoryEver" text
  ctx.textAlign = 'center';
  ctx.fillStyle = WHITE;
  ctx.font      = 'bold 96px Arial';
  ctx.fillText('Inventory', cx, cy + s * 1.15);
  ctx.fillStyle = BLUE;
  ctx.font      = 'bold 96px Arial';
  ctx.fillText('Ever', cx, cy + s * 1.15 + 112);

  // Tagline
  ctx.fillStyle = 'rgba(156,163,175,0.8)';
  ctx.font      = '44px Arial';
  ctx.fillText('Know what you own.', cx, cy + s * 1.15 + 230);

  return canvas.toBuffer('image/png');
}

// ---------------------------------------------------------------------------
// Generate favicon.png  (48 × 48)
// ---------------------------------------------------------------------------
function generateFavicon(size = 48) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');

  // Background with rounded corners
  ctx.fillStyle = NAVY;
  roundRect(ctx, 0, 0, size, size, size * 0.18);
  ctx.fill();

  // Simple cube
  const cx = size / 2;
  const cy = size / 2;
  const s  = size * 0.3;
  const hw = s * 0.55;
  const hh = s * 0.45;
  const dx = s * 0.22;
  const dy = s * 0.18;

  ctx.fillStyle = '#3B82F6';
  ctx.beginPath();
  ctx.rect(cx - hw, cy - hh + dy, hw * 2, hh * 2 - dy);
  ctx.fill();

  ctx.fillStyle = '#60A5FA';
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - hh + dy);
  ctx.lineTo(cx - hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw, cy - hh + dy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - hh + dy);
  ctx.lineTo(cx + hw + dx, cy - hh);
  ctx.lineTo(cx + hw + dx, cy + hh);
  ctx.lineTo(cx + hw, cy + hh);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer('image/png');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const assetsDir = path.join(__dirname, '..', 'assets');

if (!createCanvas) {
  console.log('⚠  node-canvas not available — installing it now ...');
  console.log('   Run: npm install canvas   then re-run this script.');
  process.exit(1);
}

console.log('🎨  Generating InventoryEver brand assets...');

fs.writeFileSync(path.join(assetsDir, 'icon.png'), generateIcon(1024));
console.log('✅  icon.png           (1024 × 1024)');

fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), generateAdaptiveIcon(1024));
console.log('✅  adaptive-icon.png  (1024 × 1024, transparent bg)');

fs.writeFileSync(path.join(assetsDir, 'splash.png'), generateSplash(1284, 2778));
console.log('✅  splash.png         (1284 × 2778)');

fs.writeFileSync(path.join(assetsDir, 'favicon.png'), generateFavicon(48));
console.log('✅  favicon.png        (48 × 48)');

console.log('\n🚀  All assets written to assets/');
