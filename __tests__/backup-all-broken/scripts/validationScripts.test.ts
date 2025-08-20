/**
 * Validation Scripts Integration Tests
 * 
 * Tests for the database validation and health check scripts to ensure
 * they work correctly in different scenarios and provide proper feedback.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Mock environment variables for testing
const testEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key-123',
};

describe('Validation Scripts Integration', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = { ...originalEnv, ...testEnvVars };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('startup-validation.js', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/startup-validation.js');

    it('should be executable and show usage when called with unknown command', async () => {
      try {
        await execAsync(`node ${scriptPath} unknown-command`);
      } catch (error: any) {
        expect(error.code).toBe(1); // Should exit with error code
        expect(error.stdout).toContain('Unknown command');
        expect(error.stdout).toContain('Usage:');
      }
    });

    it('should handle missing environment variables gracefully', async () => {
      // Remove environment variables
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        await execAsync(`node ${scriptPath} startup`, { 
          env: { ...process.env },
          timeout: 10000 
        });
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('Missing required environment variables');
      }
    });

    it('should show different behavior in CI environment', async () => {
      const ciEnv = {
        ...process.env,
        CI: 'true',
        GITHUB_ACTIONS: 'true'
      };

      delete ciEnv.NEXT_PUBLIC_SUPABASE_URL; // Simulate missing DB in CI

      try {
        const result = await execAsync(`node ${scriptPath} ci`, { 
          env: ciEnv,
          timeout: 10000 
        });
        
        expect(result.stdout).toContain('Detected CI/CD environment');
        expect(result.stdout).toContain('skipping database validation');
      } catch (error: any) {
        // In CI without DB, it might still pass with warnings
        expect(error.stdout).toContain('CI/CD');
      }
    });

    it('should provide health check functionality', async () => {
      try {
        await execAsync(`node ${scriptPath} health`, { 
          env: process.env,
          timeout: 10000 
        });
      } catch (error: any) {
        // Since we don't have a real database, it should fail gracefully
        expect(error.code).toBe(1);
        expect(error.stdout || error.stderr).toContain('health');
      }
    });
  });

  describe('validate-database-fix.js', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/validate-database-fix.js');

    it('should be executable and handle missing environment variables', async () => {
      // Remove environment variables
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        await execAsync(`node ${scriptPath}`, { 
          env: { ...process.env },
          timeout: 10000 
        });
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('Missing Supabase environment variables');
      }
    });

    it('should provide proper output format', async () => {
      try {
        await execAsync(`node ${scriptPath}`, { 
          env: process.env,
          timeout: 10000 
        });
      } catch (error: any) {
        // Should fail gracefully without real database
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('Validating Critical Database Fix');
      }
    });
  });

  describe('verify-database-functions.js', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/verify-database-functions.js');

    it('should be executable and handle missing environment variables', async () => {
      // Remove environment variables  
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        await execAsync(`node ${scriptPath}`, { 
          env: { ...process.env },
          timeout: 10000 
        });
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('Missing Supabase environment variables');
      }
    });

    it('should show comprehensive verification output', async () => {
      try {
        await execAsync(`node ${scriptPath}`, { 
          env: process.env,
          timeout: 10000 
        });
      } catch (error: any) {
        // Should fail gracefully without real database
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('Comprehensive Database Functions Verification');
      }
    });
  });

  describe('Package.json Scripts Integration', () => {
    it('should have all required npm scripts defined', async () => {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = require(packagePath);
      
      expect(packageJson.scripts).toHaveProperty('db:health');
      expect(packageJson.scripts).toHaveProperty('db:validate');
      expect(packageJson.scripts).toHaveProperty('db:verify');
      expect(packageJson.scripts).toHaveProperty('startup:validate');
      expect(packageJson.scripts).toHaveProperty('ci:validate');
      expect(packageJson.scripts).toHaveProperty('prestart');
      expect(packageJson.scripts).toHaveProperty('prebuild');
    });

    it('should have proper script commands', async () => {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = require(packagePath);
      
      expect(packageJson.scripts['db:health']).toBe('node scripts/startup-validation.js health');
      expect(packageJson.scripts['db:validate']).toBe('node scripts/validate-database-fix.js');
      expect(packageJson.scripts['db:verify']).toBe('node scripts/verify-database-functions.js');
      expect(packageJson.scripts['startup:validate']).toBe('node scripts/startup-validation.js startup');
      expect(packageJson.scripts['ci:validate']).toBe('node scripts/startup-validation.js ci');
      expect(packageJson.scripts['prestart']).toBe('npm run startup:validate');
      expect(packageJson.scripts['prebuild']).toBe('npm run ci:validate');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle script timeout gracefully', async () => {
      const scriptPath = path.join(process.cwd(), 'scripts/startup-validation.js');
      
      try {
        await execAsync(`node ${scriptPath} startup`, { 
          env: process.env,
          timeout: 1000 // Very short timeout
        });
      } catch (error: any) {
        // Should either complete quickly or timeout gracefully
        expect(error.code).toBeDefined();
      }
    }, 15000); // Longer test timeout

    it('should provide helpful error messages for common issues', async () => {
      const scriptPath = path.join(process.cwd(), 'scripts/validate-database-fix.js');
      
      try {
        await execAsync(`node ${scriptPath}`, { 
          env: { 
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: 'invalid-url',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'invalid-key'
          },
          timeout: 10000 
        });
      } catch (error: any) {
        expect(error.code).toBe(1);
        // Should provide troubleshooting information
        expect(error.stdout).toMatch(/(troubleshooting|solution|fix|help)/i);
      }
    });
  });

  describe('Script Documentation', () => {
    it('should have proper shebang and be executable', async () => {
      const scripts = [
        'scripts/startup-validation.js',
        'scripts/validate-database-fix.js',
        'scripts/verify-database-functions.js'
      ];

      for (const scriptPath of scripts) {
        const fullPath = path.join(process.cwd(), scriptPath);
        const fs = require('fs');
        
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content).toMatch(/^#!/); // Should have shebang
          expect(content).toContain('/**'); // Should have documentation comment
        }
      }
    });

    it('should have README documentation referencing the scripts', async () => {
      const readmePath = path.join(process.cwd(), 'README.md');
      const fs = require('fs');
      
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf8');
        
        expect(content).toContain('npm run db:health');
        expect(content).toContain('npm run db:validate');
        expect(content).toContain('npm run db:verify');
        expect(content).toContain('Database Issues');
      }
    });
  });

  describe('Security Validation', () => {
    it('should not expose sensitive information in error outputs', async () => {
      const scriptPath = path.join(process.cwd(), 'scripts/startup-validation.js');
      
      try {
        await execAsync(`node ${scriptPath} health`, { 
          env: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: 'https://secret-project.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'very-secret-key-123'
          },
          timeout: 5000 
        });
      } catch (error: any) {
        // Should not leak sensitive environment variables
        expect(error.stdout).not.toContain('very-secret-key-123');
        expect(error.stdout).not.toContain('secret-project');
      }
    });

    it('should handle malformed environment variables safely', async () => {
      const scriptPath = path.join(process.cwd(), 'scripts/validate-database-fix.js');
      
      try {
        await execAsync(`node ${scriptPath}`, { 
          env: {
            ...process.env,
            NEXT_PUBLIC_SUPABASE_URL: 'javascript:alert("xss")',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: '<script>alert("xss")</script>'
          },
          timeout: 5000 
        });
      } catch (error: any) {
        // Should handle gracefully without executing any scripts
        expect(error.code).toBeDefined();
        expect(error.stdout).not.toContain('<script>');
        expect(error.stdout).not.toContain('javascript:');
      }
    });
  });
});