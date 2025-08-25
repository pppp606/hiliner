/**
 * Integration tests for CLI theme argument parsing
 * These tests verify that the CLI correctly parses and handles theme arguments
 */

import { describe, it, expect } from '@jest/globals';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

// Test helper to run CLI commands
async function runCLI(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    const child = spawn('node', ['dist/cli.js', ...args], {
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode || 0
      });
    });
  });
}

describe('CLI Theme Integration Tests', () => {
  const testFile = resolve(__dirname, '..', 'test-sample.js');
  
  beforeAll(() => {
    // Create a test file
    writeFileSync(testFile, `console.log("Hello, World!");
const theme = "test";
function greet(name) {
  return \`Hello, \${name}!\`;
}`);
  });

  afterAll(() => {
    // Clean up test file
    try {
      unlinkSync(testFile);
    } catch {
      // Ignore errors if file doesn't exist
    }
  });

  describe('Theme argument parsing', () => {
    it('should display help message with theme option', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('-t, --theme <name>');
      expect(result.stdout).toContain('Syntax highlighting theme');
      expect(result.stdout).toContain('(default: dark-plus)');
    });

    it('should accept --theme argument for interactive mode', async () => {
      // Test that CLI can parse theme argument without errors
      // Note: Can't test interactive mode directly in tests
      const result = await runCLI(['--theme', 'monokai', testFile]);
      
      // Since we removed static mode, this will try to start interactive mode
      // which doesn't work in test environment, but parsing should succeed
      expect(result.exitCode).toBe(0);
    });

    it('should accept -t short option for interactive mode', async () => {
      const result = await runCLI(['-t', 'dracula', testFile]);
      
      // Since we removed static mode, this will try to start interactive mode
      // which doesn't work in test environment, but parsing should succeed
      expect(result.exitCode).toBe(0);
    });

    it('should handle valid themes without errors', async () => {
      const validThemes = ['dark-plus', 'monokai', 'github-dark', 'dracula'];
      
      for (const theme of validThemes) {
        const result = await runCLI(['--theme', theme, testFile]);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain('Error:');
      }
    });

    it('should reject invalid themes with proper error message', async () => {
      const result = await runCLI(['--theme', 'invalid-theme-name', testFile]);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Theme 'invalid-theme-name' is not supported");
      expect(result.stderr).toContain('Available themes:');
    });

    it('should work without theme argument (use default)', async () => {
      const result = await runCLI([testFile]);
      
      expect(result.exitCode).toBe(0);
      // Should start interactive mode with default theme
    });

    it('should maintain case sensitivity for theme names', async () => {
      // Test that uppercase theme names are rejected
      const result = await runCLI(['--theme', 'DARK-PLUS', testFile]);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Theme 'DARK-PLUS' is not supported");
    });
  });
});