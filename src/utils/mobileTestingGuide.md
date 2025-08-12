# Mobile Testing Guide

This guide helps you test the mobile optimizations implemented in the team availability tracker application.

## Quick Testing Checklist

### 1. Touch Target Validation ✅

All interactive elements should meet minimum touch target requirements:
- **Minimum size**: 44x44 pixels (iOS/Android standard)
- **Visual feedback**: Active/pressed states
- **Touch responsiveness**: No delays or missed touches

**Test locations:**
- Sprint table day cells
- Modal buttons (work options, close buttons)
- Navigation buttons (back, menu, tabs)
- Dashboard cards and action buttons
- Form buttons and inputs

### 2. Mobile Layout Testing 📱

**Breakpoints to test:**
- Mobile: 375px (iPhone), 414px (iPhone Plus)
- Tablet: 768px (iPad portrait), 1024px (iPad landscape)
- Desktop: 1200px+ (standard desktop)

**Test scenarios:**
1. Sprint table mobile view (collapsible sections)
2. Modal positioning and sizing
3. Navigation drawer functionality
4. Dashboard card stacking
5. Form layouts and input fields

### 3. Touch Interaction Testing 👆

**Gestures to test:**
- Tap: All buttons and interactive elements
- Long press: Context menus (if implemented)
- Scroll: Table content, modal content, page scrolling
- Pinch zoom: Should be allowed for accessibility

**Performance indicators:**
- No 300ms tap delay
- Smooth scrolling
- Responsive touch feedback
- No accidental touches

## Browser Testing Tools

### Chrome DevTools
1. Open DevTools (F12)
2. Click device icon (Ctrl+Shift+M)
3. Test different device profiles:
   - iPhone 12/13/14 (390x844)
   - Samsung Galaxy S20 (360x800)
   - iPad (768x1024)

### Console Testing
Run this in browser console for automated validation:
```javascript
// Quick mobile optimization check
quickMobileTest();

// Detailed report generation
const report = mobileOptimizationReport();
console.log(report);
```

## Manual Testing Checklist

### Sprint Table Mobile View
- [ ] Day cells are at least 44px touch targets
- [ ] Modal opens properly on mobile
- [ ] Work option buttons are touch-friendly
- [ ] Table scrolls horizontally on narrow screens
- [ ] Member cards expand/collapse smoothly

### Navigation
- [ ] Mobile header shows/hides properly
- [ ] Back button is large enough (44px)
- [ ] Navigation drawer opens smoothly
- [ ] All menu items are touch-friendly
- [ ] Close button is accessible

### Modals
- [ ] Modal sizing adapts to screen size
- [ ] Close button is 44px minimum
- [ ] Content scrolls if needed
- [ ] Backdrop dismissal works
- [ ] Footer buttons are stacked on mobile

### Dashboard
- [ ] Cards stack properly on mobile
- [ ] Interactive cards have touch feedback
- [ ] Metrics are readable on small screens
- [ ] Action buttons meet size requirements
- [ ] Refresh button is touch-friendly

## Real Device Testing

For critical validation, test on actual devices:

### iOS Testing
- Safari on iPhone (iOS 15+)
- Test in both portrait and landscape
- Verify touch targets with thumb navigation
- Check for iOS-specific issues

### Android Testing  
- Chrome on Android (Android 10+)
- Test different screen densities
- Verify touch responsiveness
- Check keyboard interaction

## Common Issues to Watch For

### Touch Target Issues ❌
- Buttons smaller than 44px
- Links too close together
- Small tap targets in dense layouts

### Viewport Issues ❌
- Content too small or too large
- Horizontal scrolling required
- Text too small to read

### Performance Issues ❌
- Touch delays (300ms problem)
- Unresponsive scrolling
- Laggy animations

### Accessibility Issues ❌
- No focus indicators
- Poor color contrast
- Missing touch feedback

## Optimization Validation

### Automated Checks
```javascript
// Run in browser console
const report = generateMobileOptimizationReport();

// Check specific areas
const touchTargets = validateTouchTargets();
const viewportHandling = validateViewportHandling();
const touchInteractions = validateTouchInteractions();
```

### Success Criteria
- ✅ 90%+ of interactive elements meet touch target requirements
- ✅ All modals work properly on mobile devices
- ✅ Navigation is smooth and responsive
- ✅ Content is readable without horizontal scrolling
- ✅ Touch interactions feel native and responsive

## Browser Support

### Minimum Requirements
- iOS Safari 14+
- Chrome/Edge 90+
- Firefox 88+
- Samsung Internet 14+

### Progressive Enhancement
- Basic functionality works on older browsers
- Enhanced touch features on modern browsers
- Graceful degradation for unsupported features

## Performance Testing

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1

### Mobile-Specific Metrics
- Touch response time: < 50ms
- Scroll performance: 60fps
- Animation smoothness: No jank

## Troubleshooting

### Common Problems

**Touch targets too small:**
```css
/* Add to affected elements */
.button {
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;
}
```

**Modal not mobile-friendly:**
```css
/* Mobile modal adjustments */
@media (max-width: 768px) {
  .modal {
    margin: 8px;
    max-height: 90vh;
  }
}
```

**Touch delays:**
```css
/* Remove 300ms tap delay */
.interactive {
  touch-action: manipulation;
}
```

## Next Steps

After implementing and testing:
1. Run automated validation script
2. Test on real devices
3. Gather user feedback
4. Monitor analytics for mobile usage patterns
5. Iterate based on findings

---

For questions or issues, check the mobile optimization validator utility at:
`src/utils/mobileOptimizationValidator.ts`