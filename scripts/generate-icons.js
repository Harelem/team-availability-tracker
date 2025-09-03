#!/usr/bin/env node

/**
 * Generate PWA icons from SVG base
 * Creates placeholder icons until proper icons are designed
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Simple SVG template for placeholder icons
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white" opacity="0.9"/>
  <text x="${size/2}" y="${size/2}" 
        font-family="Arial, sans-serif" 
        font-size="${size/4}px" 
        font-weight="bold" 
        fill="#3b82f6" 
        text-anchor="middle" 
        dominant-baseline="middle">TAT</text>
</svg>`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate placeholder icons as SVG (will be converted to PNG later)
sizes.forEach(size => {
  const svgContent = createSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Created ${filename}`);
});

// Create a simple HTML file to display icons for manual PNG conversion
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>PWA Icons</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px;
      background: #f5f5f5;
    }
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }
    .icon-item {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .icon-item img {
      max-width: 100%;
      height: auto;
      margin-bottom: 10px;
    }
    .instructions {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>PWA Icons - Placeholder</h1>
  <div class="instructions">
    <h3>Note:</h3>
    <p>These are placeholder SVG icons. For production, convert them to PNG format using an image editor or online tool.</p>
    <p>The icons use the app's primary blue color (#3b82f6) with "TAT" (Team Availability Tracker) text.</p>
  </div>
  <div class="icon-grid">
    ${sizes.map(size => `
      <div class="icon-item">
        <img src="icon-${size}x${size}.svg" alt="${size}x${size} icon">
        <div>${size}x${size}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(iconsDir, 'preview.html'), htmlContent);

console.log('\n✅ Placeholder icons created successfully!');
console.log('📝 Note: These are SVG placeholders. For production use:');
console.log('   1. Convert SVGs to PNG format');
console.log('   2. Or use a proper icon generation tool');
console.log(`   3. Preview icons at: ${path.join(iconsDir, 'preview.html')}`);

// For now, create empty PNG files to prevent 404 errors
sizes.forEach(size => {
  const pngFilename = `icon-${size}x${size}.png`;
  const pngFilepath = path.join(iconsDir, pngFilename);
  
  // Create a minimal valid PNG file (1x1 pixel transparent)
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk size
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk size
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0xE5, 0x27, 0xDE, 0xFC, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk size
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(pngFilepath, minimalPng);
  console.log(`Created placeholder ${pngFilename}`);
});