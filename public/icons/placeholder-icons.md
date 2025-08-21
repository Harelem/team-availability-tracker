# PWA Icons Placeholder

This directory contains PWA icons for the Team Availability Tracker application.

## Current Status

The base SVG icon has been created at `icon-base.svg`. 

## Generating Icons

To generate all required PNG icons, run:

```bash
npm install sharp --save-dev
npm run generate:icons
```

This will create all required icon sizes:

### Main App Icons
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Shortcut Icons
- shortcut-schedule.png
- shortcut-analytics.png
- shortcut-teams.png

### Favicon Icons
- favicon-16x16.png
- favicon-32x32.png
- favicon-48x48.png

### Apple Touch Icons
- apple-touch-icon-180x180.png
- apple-touch-icon-167x167.png
- apple-touch-icon-152x152.png
- apple-touch-icon-120x120.png

### Maskable Icons
- icon-192x192-maskable.png
- icon-512x512-maskable.png

## Icon Design

The base icon features:
- Team availability calendar
- People icons with status indicators
- Analytics chart elements
- Professional blue gradient background
- Accessibility-compliant colors

## Browser Support

These icons support:
- PWA installation on all major browsers
- iOS Safari Add to Home Screen
- Android Chrome Web App Banner
- Windows PWA installation
- macOS Safari pinned tabs