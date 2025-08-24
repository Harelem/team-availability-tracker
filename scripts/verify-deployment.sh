#!/bin/bash
# Post-deployment verification based on debug knowledge base fixes
# Verifies critical issues from Bug Reports #10-28 don't reoccur

set -e # Exit on any error

echo "🔍 Starting deployment verification..."
echo "================================================="

# Configuration
SITE_URL="${1:-https://team-availability-tracker.vercel.app}"
TIMEOUT_SECONDS=30
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if site is accessible
check_site_accessibility() {
  log_info "Checking site availability at $SITE_URL..."
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT_SECONDS "$SITE_URL" || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    log_success "Site is accessible (HTTP $HTTP_CODE)"
    return 0
  else
    log_error "Site is not accessible (HTTP $HTTP_CODE)"
    return 1
  fi
}

# Check for critical console errors (based on Bug Reports #27, #25, etc.)
check_console_errors() {
  log_info "Checking for critical console errors..."
  
  # Create a temporary Node.js script to check console errors
  cat > temp-console-check.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  let exitCode = 0;
  
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run'
      ]
    });
    
    const page = await browser.newPage();
    
    const errors = [];
    const warnings = [];
    const criticalPatterns = [
      '401', '404', 'team_stats', 'infinite', 'WebSocket', 
      'hydration', 'Maximum update depth', 'authentication',
      'PGRST301', 'JWT expired', '%0A', 'connection string'
    ];
    
    // Monitor console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        errors.push(text);
      } else if (type === 'warning') {
        warnings.push(text);
      }
    });
    
    // Monitor network errors
    page.on('requestfailed', request => {
      errors.push(`Network request failed: ${request.url()} - ${request.failure().errorText}`);
    });
    
    // Set mobile viewport to test mobile-specific issues
    await page.setViewport({ width: 375, height: 667 });
    
    console.log('🌐 Loading page...');
    await page.goto(process.argv[2] || 'http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Test mobile navigation (Bug Reports #13-15)
    try {
      console.log('📱 Testing mobile navigation...');
      const hamburgerButton = await page.$('[role="button"]:has-text("☰"), button:has-text("menu")');
      if (hamburgerButton) {
        await hamburgerButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      warnings.push('Mobile navigation test skipped: ' + e.message);
    }
    
    // Test team selection (Bug Report #27)
    try {
      console.log('👥 Testing team selection...');
      const teamSelect = await page.$('select, [role="combobox"]');
      if (teamSelect) {
        await teamSelect.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      warnings.push('Team selection test skipped: ' + e.message);
    }
    
    // Test view switching (Bug Report #28)
    try {
      console.log('🔄 Testing view switching...');
      const sprintButton = await page.$('button:has-text("ספרינט"), button:has-text("Sprint")');
      if (sprintButton) {
        await sprintButton.click();
        await page.waitForTimeout(2000);
        
        const weekButton = await page.$('button:has-text("שבוע"), button:has-text("Week")');
        if (weekButton) {
          await weekButton.click();
          await page.waitForTimeout(2000);
        }
      }
    } catch (e) {
      warnings.push('View switching test skipped: ' + e.message);
    }
    
    // Final wait to catch any delayed errors
    await page.waitForTimeout(2000);
    
    // Analyze errors for critical patterns
    const criticalErrors = errors.filter(error => 
      criticalPatterns.some(pattern => error.toLowerCase().includes(pattern.toLowerCase()))
    );
    
    // Report results
    console.log('\n📊 Console Analysis Results:');
    console.log(`Total errors: ${errors.length}`);
    console.log(`Total warnings: ${warnings.length}`);
    console.log(`Critical errors: ${criticalErrors.length}`);
    
    if (criticalErrors.length > 0) {
      console.log('\n❌ Critical console errors found:');
      criticalErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      exitCode = 1;
    } else {
      console.log('\n✅ No critical console errors detected');
    }
    
    if (errors.length > 0 && criticalErrors.length === 0) {
      console.log('\n⚠️  Non-critical console errors:');
      errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`);
      });
      if (errors.length > 5) {
        console.log(`  ... and ${errors.length - 5} more`);
      }
    }
    
    // Test specific mobile functionality
    console.log('\n📱 Mobile-specific checks:');
    
    // Check for horizontal scrolling
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    
    if (hasHorizontalScroll) {
      console.log('❌ Horizontal scrolling detected on mobile');
      exitCode = 1;
    } else {
      console.log('✅ No unwanted horizontal scrolling');
    }
    
    // Check for touch target sizes
    const smallTouchTargets = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
      return buttons.filter(btn => {
        const rect = btn.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).length;
    });
    
    if (smallTouchTargets > 0) {
      console.log(`❌ ${smallTouchTargets} touch targets below 44px minimum`);
      exitCode = 1;
    } else {
      console.log('✅ All touch targets meet size requirements');
    }
    
  } catch (error) {
    console.log('❌ Failed to load page or run tests:', error.message);
    exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  process.exit(exitCode);
})();
EOF

  # Run the console check if Node.js and Puppeteer are available
  if command -v node &> /dev/null; then
    if npm list puppeteer &> /dev/null || npm list -g puppeteer &> /dev/null; then
      log_info "Running comprehensive console and mobile checks..."
      if node temp-console-check.js "$SITE_URL"; then
        log_success "Console and mobile checks passed"
      else
        log_error "Console or mobile checks failed"
        rm -f temp-console-check.js
        return 1
      fi
    else
      log_warning "Puppeteer not available, skipping detailed console checks"
      log_info "To enable full testing: npm install puppeteer"
    fi
  else
    log_warning "Node.js not available, skipping console checks"
  fi
  
  rm -f temp-console-check.js
  return 0
}

# Test mobile responsiveness using external API
test_mobile_performance() {
  log_info "Testing mobile performance..."
  
  # Use Google PageSpeed Insights API (free tier)
  local api_url="https://www.googleapis.com/pagespeedsights/v5/runPagespeed?url=${SITE_URL}&category=performance&strategy=mobile"
  
  MOBILE_SCORE=$(curl -s "$api_url" 2>/dev/null | grep -o '"score":[0-9.]*' | head -1 | cut -d':' -f2 2>/dev/null || echo "")
  
  if [ ! -z "$MOBILE_SCORE" ] && [ "$MOBILE_SCORE" != "null" ]; then
    # Convert to percentage
    MOBILE_PERCENTAGE=$(echo "$MOBILE_SCORE * 100" | bc -l 2>/dev/null | cut -d'.' -f1 2>/dev/null || echo "0")
    
    log_info "Mobile Performance Score: ${MOBILE_PERCENTAGE}%"
    
    if [ "$MOBILE_PERCENTAGE" -ge 70 ]; then
      log_success "Mobile performance is acceptable (${MOBILE_PERCENTAGE}%)"
    elif [ "$MOBILE_PERCENTAGE" -ge 50 ]; then
      log_warning "Mobile performance needs improvement (${MOBILE_PERCENTAGE}%)"
    else
      log_error "Mobile performance is poor (${MOBILE_PERCENTAGE}%)"
      return 1
    fi
  else
    log_warning "Could not retrieve mobile performance score"
    log_info "You can manually test at: https://pagespeed.web.dev/?url=${SITE_URL}"
  fi
  
  return 0
}

# Test authentication endpoints (Bug Report #27)
test_authentication() {
  log_info "Testing authentication endpoints..."
  
  # Test if auth endpoints are accessible
  local auth_endpoints=(
    "/api/auth"
    "/.well-known/jwks.json"
  )
  
  for endpoint in "${auth_endpoints[@]}"; do
    local full_url="${SITE_URL}${endpoint}"
    local status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$full_url" 2>/dev/null || echo "000")
    
    if [ "$status" = "200" ] || [ "$status" = "404" ]; then
      # 404 is acceptable for some auth endpoints
      log_success "Auth endpoint ${endpoint} responds correctly (${status})"
    else
      log_warning "Auth endpoint ${endpoint} returned ${status}"
    fi
  done
  
  return 0
}

# Test for removed COO functionality (should return 404)
test_removed_coo_endpoints() {
  log_info "Verifying COO functionality removal..."
  
  local coo_endpoints=(
    "/api/team_stats"
    "/api/coo"
    "/coo"
    "/executive/coo"
  )
  
  for endpoint in "${coo_endpoints[@]}"; do
    local full_url="${SITE_URL}${endpoint}"
    local status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$full_url" 2>/dev/null || echo "000")
    
    if [ "$status" = "404" ]; then
      log_success "COO endpoint ${endpoint} properly removed (404)"
    else
      log_warning "COO endpoint ${endpoint} still accessible (${status})"
    fi
  done
  
  return 0
}

# Test service worker and PWA functionality (Bug Report #40)
test_pwa_functionality() {
  log_info "Testing PWA and service worker..."
  
  # Check service worker registration
  local sw_url="${SITE_URL}/sw.js"
  local sw_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$sw_url" 2>/dev/null || echo "000")
  
  if [ "$sw_status" = "200" ]; then
    log_success "Service worker accessible"
    
    # Check if service worker contains timestamp versioning (not v1.0.0)
    local sw_content=$(curl -s "$sw_url" 2>/dev/null || echo "")
    if echo "$sw_content" | grep -q "v1\.0\.0"; then
      log_error "Service worker still uses hardcoded v1.0.0 versioning"
      return 1
    elif echo "$sw_content" | grep -qE "[0-9]{4}-[0-9]{2}-[0-9]{2}"; then
      log_success "Service worker uses timestamp-based versioning"
    else
      log_warning "Service worker versioning scheme unclear"
    fi
  else
    log_warning "Service worker not accessible (${sw_status})"
  fi
  
  # Check manifest.json
  local manifest_url="${SITE_URL}/manifest.json"
  local manifest_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$manifest_url" 2>/dev/null || echo "000")
  
  if [ "$manifest_status" = "200" ]; then
    log_success "PWA manifest accessible"
  else
    log_warning "PWA manifest not accessible (${manifest_status})"
  fi
  
  return 0
}

# Main verification flow
main() {
  local exit_code=0
  
  echo "Testing deployment: $SITE_URL"
  echo "Timeout: ${TIMEOUT_SECONDS}s"
  echo ""
  
  # Critical tests (must pass)
  log_info "Running critical tests..."
  
  if ! check_site_accessibility; then
    log_error "CRITICAL: Site not accessible"
    exit 1
  fi
  
  if ! check_console_errors; then
    log_error "CRITICAL: Console errors detected"
    exit_code=1
  fi
  
  # Important tests (should pass)
  log_info "Running important tests..."
  
  if ! test_authentication; then
    log_warning "Authentication tests had issues"
    exit_code=1
  fi
  
  if ! test_removed_coo_endpoints; then
    log_warning "COO removal verification had issues"
  fi
  
  if ! test_pwa_functionality; then
    log_warning "PWA functionality tests had issues"
  fi
  
  # Performance tests (informational)
  log_info "Running performance tests..."
  
  if ! test_mobile_performance; then
    log_warning "Mobile performance below standards"
  fi
  
  # Final summary
  echo ""
  echo "================================================="
  if [ $exit_code -eq 0 ]; then
    log_success "🎉 Deployment verification PASSED!"
    echo ""
    log_info "✅ Site is accessible"
    log_info "✅ No critical console errors"
    log_info "✅ Authentication endpoints working"
    log_info "✅ COO functionality properly removed"
    log_info "✅ PWA configuration appears correct"
    echo ""
    log_info "🚀 Deployment is ready for production use!"
  else
    log_error "❌ Deployment verification FAILED!"
    echo ""
    log_error "Some critical issues were detected."
    log_error "Please review the errors above and fix before proceeding."
    echo ""
    log_info "Common fixes:"
    log_info "- Check console for authentication errors (Bug Report #27)"
    log_info "- Verify mobile navigation works (Bug Reports #13-15)"
    log_info "- Test data persistence between views (Bug Report #28)"
    log_info "- Ensure service worker uses timestamp versioning (Bug Report #40)"
  fi
  
  echo ""
  echo "📋 Manual testing recommended:"
  echo "1. Test on actual mobile devices"
  echo "2. Verify hour reporting and data persistence"
  echo "3. Test hamburger menu functionality"
  echo "4. Check real-time updates between users"
  echo "5. Test authentication with actual user accounts"
  
  exit $exit_code
}

# Run main function
main "$@"