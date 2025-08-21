/**
 * Global Test Setup
 * 
 * Runs once before all tests to set up the testing environment
 * for design system tests.
 */

const fs = require('fs').promises;
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up Design System test environment...');
  
  try {
    // Ensure test directories exist
    const testDirs = [
      'coverage/design-system',
      'coverage/design-system/html-report',
      '__tests__/snapshots',
      '__tests__/artifacts',
    ];

    for (const dir of testDirs) {
      const fullPath = path.join(process.cwd(), dir);
      try {
        await fs.access(fullPath);
      } catch {
        await fs.mkdir(fullPath, { recursive: true });
        console.log(`✓ Created test directory: ${dir}`);
      }
    }
    
    // Set up environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';
    
    // Disable animations for consistent testing
    process.env.DISABLE_ANIMATIONS = 'true';
    
    // Set up performance monitoring
    if (global.performance && global.performance.mark) {
      global.performance.mark('test-suite-start');
    }
    
    // Mock window properties that might not exist in jsdom
    global.ResizeObserver = global.ResizeObserver || class ResizeObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    
    global.IntersectionObserver = global.IntersectionObserver || class IntersectionObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    
    // Set up CSS custom properties support for jsdom
    if (typeof window !== 'undefined') {
      window.CSS = window.CSS || {};
      window.CSS.supports = window.CSS.supports || (() => false);
    }
    
    console.log('✅ Design System test environment setup complete');
    
    // Create a test run metadata file
    const metadata = {
      startTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      testEnvironment: 'jsdom',
      jestVersion: require('jest/package.json').version,
    };
    
    await fs.writeFile(
      path.join(process.cwd(), '__tests__/artifacts/test-run-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
    throw error;
  }
};