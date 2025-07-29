#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * Generates all required PWA icon sizes from the base SVG.
 * Requires 'sharp' package for image processing.
 * 
 * Usage: npm run generate:icons
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required for PWA
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Shortcut icon sizes
const SHORTCUT_SIZES = [
  { size: 96, name: 'shortcut-schedule.png' },
  { size: 96, name: 'shortcut-analytics.png' },
  { size: 96, name: 'shortcut-teams.png' }
];

const FAVICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' }
];

async function generateIcons() {
  try {
    // Check if sharp is available
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.log('⚠️  Sharp not installed. Installing sharp...');
      console.log('Run: npm install sharp --save-dev');
      console.log('Then run this script again.');
      return;
    }

    const iconsDir = path.join(__dirname, '..', 'public', 'icons');
    const baseIconPath = path.join(iconsDir, 'icon-base.svg');

    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Check if base SVG exists
    if (!fs.existsSync(baseIconPath)) {
      console.error('❌ Base icon SVG not found at:', baseIconPath);
      return;
    }

    console.log('🎨 Generating PWA icons from SVG...');

    // Generate main app icons
    for (const icon of ICON_SIZES) {
      const outputPath = path.join(iconsDir, icon.name);
      
      await sharp(baseIconPath)
        .resize(icon.size, icon.size)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size})`);
    }

    // Generate shortcut icons with different colors/variations
    await generateShortcutIcons(sharp, iconsDir, baseIconPath);

    // Generate favicon sizes
    for (const favicon of FAVICON_SIZES) {
      const outputPath = path.join(iconsDir, favicon.name);
      
      await sharp(baseIconPath)
        .resize(favicon.size, favicon.size)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`✅ Generated ${favicon.name} (${favicon.size}x${favicon.size})`);
    }

    // Generate Apple Touch icons
    const appleTouchSizes = [180, 167, 152, 120];
    for (const size of appleTouchSizes) {
      const outputPath = path.join(iconsDir, `apple-touch-icon-${size}x${size}.png`);
      
      await sharp(baseIconPath)
        .resize(size, size)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`✅ Generated apple-touch-icon-${size}x${size}.png`);
    }

    // Generate maskable icons (with safe area)
    await generateMaskableIcons(sharp, iconsDir, baseIconPath);

    console.log('🎉 All PWA icons generated successfully!');
    console.log('📁 Icons saved to:', iconsDir);

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

async function generateShortcutIcons(sharp, iconsDir, baseIconPath) {
  // Read the base SVG and create variations for shortcuts
  const baseSvg = fs.readFileSync(baseIconPath, 'utf8');
  
  // Schedule icon (calendar focused)
  const scheduleIcon = baseSvg.replace(
    'fill="#3b82f6"',
    'fill="#10b981"'
  );
  
  const scheduleIconPath = path.join(iconsDir, 'shortcut-schedule.svg');
  fs.writeFileSync(scheduleIconPath, scheduleIcon);
  
  await sharp(scheduleIconPath)
    .resize(96, 96)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'shortcut-schedule.png'));
  
  // Analytics icon (chart focused)
  const analyticsIcon = baseSvg.replace(
    'fill="#8b5cf6" opacity="0.7"',
    'fill="#f59e0b" opacity="1.0"'
  );
  
  const analyticsIconPath = path.join(iconsDir, 'shortcut-analytics.svg');
  fs.writeFileSync(analyticsIconPath, analyticsIcon);
  
  await sharp(analyticsIconPath)
    .resize(96, 96)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'shortcut-analytics.png'));
  
  // Teams icon (people focused)
  const teamsIcon = baseSvg.replace(
    'fill="#3b82f6"',
    'fill="#8b5cf6"'
  );
  
  const teamsIconPath = path.join(iconsDir, 'shortcut-teams.svg');
  fs.writeFileSync(teamsIconPath, teamsIcon);
  
  await sharp(teamsIconPath)
    .resize(96, 96)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'shortcut-teams.png'));
  
  console.log('✅ Generated shortcut icons');
}

async function generateMaskableIcons(sharp, iconsDir, baseIconPath) {
  // Create maskable versions with safe area padding
  const maskableSizes = [192, 512];
  
  for (const size of maskableSizes) {
    const safeAreaSize = Math.floor(size * 0.8); // 80% safe area
    const padding = Math.floor((size - safeAreaSize) / 2);
    
    // Create a larger canvas with padding
    const maskableIcon = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 } // Theme color background
      }
    })
    .composite([
      {
        input: await sharp(baseIconPath)
          .resize(safeAreaSize, safeAreaSize)
          .png()
          .toBuffer(),
        top: padding,
        left: padding
      }
    ])
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(path.join(iconsDir, `icon-${size}x${size}-maskable.png`));
    
    console.log(`✅ Generated maskable icon ${size}x${size}`);
  }
}

// Add to package.json scripts
function updatePackageJson() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    if (!packageJson.scripts['generate:icons']) {
      packageJson.scripts['generate:icons'] = 'node scripts/generate-pwa-icons.js';
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Added generate:icons script to package.json');
    }
  } catch (error) {
    console.log('⚠️  Could not update package.json');
  }
}

// Instructions for manual icon generation
function showInstructions() {
  console.log(`
📋 PWA Icon Generation Instructions:

1. Install Sharp for image processing:
   npm install sharp --save-dev

2. Run the icon generation script:
   npm run generate:icons

3. The script will generate all required PWA icons:
   - Main app icons (72x72 to 512x512)
   - Shortcut icons for quick actions
   - Favicon sizes
   - Apple Touch icons
   - Maskable icons with safe areas

4. Icons will be saved to /public/icons/

🎨 Icon Design Guidelines:
- The base SVG represents a calendar with team availability
- Icons are optimized for different contexts
- Maskable icons include safe areas for different platforms
- Shortcut icons have color variations for different functions

💡 Customization:
- Edit /public/icons/icon-base.svg to change the design
- Modify colors in the generation script
- Add new icon sizes as needed for specific platforms
`);
}

// Run the script
if (require.main === module) {
  updatePackageJson();
  generateIcons().catch(console.error);
  showInstructions();
}

module.exports = { generateIcons, ICON_SIZES, SHORTCUT_SIZES, FAVICON_SIZES };