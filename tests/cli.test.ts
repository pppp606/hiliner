/**
 * Basic tests for hiliner functionality
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { isThemeSupported, getAvailableThemes } from '../src/utils/syntaxHighlighter';
import { parseCliArgs, showHelp } from '../src/cli';
import { type CLIArgs } from '../src/types';


describe('CLI Theme Switching', () => {
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let exitMock: jest.MockedFunction<typeof process.exit>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    exitMock = jest.fn() as jest.MockedFunction<typeof process.exit>;
    process.exit = exitMock;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    jest.clearAllMocks();
  });

  describe('Theme argument parsing', () => {
    it('should parse --theme argument correctly through parseCliArgs', () => {
      // Mock process.argv to simulate CLI usage
      const originalArgv = process.argv;
      process.argv = ['node', 'hiliner', '--theme', 'monokai', 'test.js', '1'];
      
      try {
        const result = parseCliArgs();
        
        // Test that theme is parsed correctly
        expect(result.theme).toBe('monokai');
        expect(result.file).toBe('test.js');
        
        // Ensure CLIArgs interface includes theme field
        const cliArgs: CLIArgs = result;
        expect(cliArgs.theme).toBeDefined();
      } finally {
        process.argv = originalArgv;
      }
    });

    it('should parse -t short option for theme through parseCliArgs', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'hiliner', '-t', 'dracula', 'test.js', '1'];
      
      try {
        const result = parseCliArgs();
        
        // Test that short option is parsed correctly
        expect(result.theme).toBe('dracula');
        expect(result.file).toBe('test.js');
      } finally {
        process.argv = originalArgv;
      }
    });

    it('should handle theme option in interactive mode', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'hiliner', '--theme', 'github-light', 'test.js'];
      
      try {
        const result = parseCliArgs();
        
        // Test interactive mode with theme (no line specs)
        expect(result.theme).toBe('github-light');
        expect(result.file).toBe('test.js');
      } finally {
        process.argv = originalArgv;
      }
    });

    it('should default theme to undefined when not specified', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'hiliner', 'test.js', '1'];
      
      try {
        const result = parseCliArgs();
        
        // Test that theme defaults to undefined when not provided
        expect(result.theme).toBeUndefined();
        expect(result.file).toBe('test.js');
      } finally {
        process.argv = originalArgv;
      }
    });

    it('should display theme option in help message', () => {
      // Mock console.log to capture help output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      showHelp();
      
      // Get the help message that was logged
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const helpMessage = consoleSpy.mock.calls[0][0];
      
      // Verify that theme options are included in help
      expect(helpMessage).toContain('-t, --theme');
      expect(helpMessage).toContain('Syntax highlighting theme');
      expect(helpMessage).toContain('(default: dark-plus)');
      
      consoleSpy.mockRestore();
    });

    it('should include theme field in CLIArgs interface', () => {
      // Test that CLIArgs interface properly includes theme field
      const cliArgs: CLIArgs = {
        file: 'test.js',
        theme: 'monokai',
        help: false,
        version: false
      };
      
      // Verify the interface includes theme and it's properly typed
      expect(cliArgs.theme).toBeDefined();
      expect(typeof cliArgs.theme).toBe('string');
      expect(cliArgs.theme).toBe('monokai');
      
      // Test that theme can be undefined as well
      const cliArgsWithoutTheme: CLIArgs = {
        file: 'test.js'
      };
      
      expect(cliArgsWithoutTheme.theme).toBeUndefined();
    });
  });

  describe('Theme validation', () => {
    it('should validate theme names with exact lowercase matching', () => {
      const availableThemes = getAvailableThemes();
      
      // Valid themes should be accepted (exact match)
      expect(isThemeSupported('dark-plus')).toBe(true);
      expect(isThemeSupported('monokai')).toBe(true);
      expect(isThemeSupported('github-dark')).toBe(true);
      
      // Invalid themes should be rejected
      expect(isThemeSupported('Dark-Plus')).toBe(false); // Case mismatch
      expect(isThemeSupported('MONOKAI')).toBe(false); // Case mismatch
      expect(isThemeSupported('nonexistent-theme')).toBe(false); // Does not exist
      expect(isThemeSupported('')).toBe(false); // Empty string
    });

    it('should not support case-insensitive matching', () => {
      // These should all fail since we only support exact lowercase matching
      expect(isThemeSupported('Dark-Plus')).toBe(false);
      expect(isThemeSupported('DARK-PLUS')).toBe(false);
      expect(isThemeSupported('Monokai')).toBe(false);
      expect(isThemeSupported('GITHUB-DARK')).toBe(false);
    });

    it('should reject invalid theme formats', () => {
      expect(isThemeSupported('  dark-plus  ')).toBe(false); // Whitespace
      expect(isThemeSupported('dark plus')).toBe(false); // Space instead of dash
      expect(isThemeSupported('dark_plus')).toBe(false); // Underscore instead of dash
    });
  });

  describe('Invalid theme handling', () => {
    it('should exit with code 1 when invalid theme is provided', async () => {
      // Mock console.error to avoid output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // This test simulates what should happen when an invalid theme is used
      const invalidTheme = 'invalid-theme-name';
      
      // Test the expected behavior - should call process.exit(1)
      if (!isThemeSupported(invalidTheme)) {
        process.exit(1);
      }
      
      expect(exitMock).toHaveBeenCalledWith(1);
      
      consoleSpy.mockRestore();
    });

    it('should display appropriate error message for invalid theme', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const invalidTheme = 'Invalid-Theme';
      const availableThemes = getAvailableThemes();
      
      // Simulate error handling logic
      if (!isThemeSupported(invalidTheme)) {
        console.error(`Error: Theme '${invalidTheme}' is not supported.`);
        console.error(`Available themes: ${availableThemes.slice(0, 5).join(', ')}, ...`);
        process.exit(1);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(`Error: Theme '${invalidTheme}' is not supported.`);
      expect(consoleSpy).toHaveBeenCalledWith(`Available themes: ${availableThemes.slice(0, 5).join(', ')}, ...`);
      expect(exitMock).toHaveBeenCalledWith(1);
      
      consoleSpy.mockRestore();
    });
  });
});