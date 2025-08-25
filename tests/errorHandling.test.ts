/**
 * @jest-environment node
 */
import { jest } from '@jest/globals';
import { validateTheme } from '../src/utils/themeValidation.js';

// Mock the syntax highlighter to simulate errors
jest.mock('../src/utils/syntaxHighlighter.js', () => ({
  highlightCode: jest.fn(),
  initializeHighlighter: jest.fn(),
  cleanup: jest.fn(),
  getAvailableThemes: jest.fn(() => ['dark-plus', 'light-plus', 'monokai', 'dracula']),
  isThemeSupported: jest.fn(),
}));

// Mock the language detection to control the behavior
jest.mock('../src/utils/languageDetection.js', () => ({
  detectLanguage: jest.fn(),
  getSupportedLanguages: jest.fn(() => ['javascript', 'python', 'text']),
  cleanup: jest.fn(),
}));

// Mock file system operations for CLI tests
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock Ink for CLI tests
jest.mock('ink', () => ({
  render: jest.fn(),
}));

// Mock React for CLI tests
jest.mock('react', () => ({
  createElement: jest.fn(),
}));

import { highlightCode, initializeHighlighter, isThemeSupported } from '../src/utils/syntaxHighlighter.js';
import { detectLanguage } from '../src/utils/languageDetection.js';
import { readFileSync } from 'fs';
import { render } from 'ink';

const mockHighlightCode = highlightCode as jest.MockedFunction<typeof highlightCode>;
const mockInitializeHighlighter = initializeHighlighter as jest.MockedFunction<typeof initializeHighlighter>;
const mockDetectLanguage = detectLanguage as jest.MockedFunction<typeof detectLanguage>;
const mockIsThemeSupported = isThemeSupported as jest.MockedFunction<typeof isThemeSupported>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockRender = render as jest.MockedFunction<typeof render>;

describe('Error Handling', () => {
  let mockProcessExit: jest.SpiedFunction<typeof process.exit>;
  let mockConsoleError: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.exit to prevent test termination
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    // Reset console methods to avoid noise in test output
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  describe('Invalid theme error handling (validateTheme function)', () => {
    it('should throw error with available themes when invalid theme is specified', () => {
      // Mock isThemeSupported to return false for invalid theme
      mockIsThemeSupported.mockReturnValue(false);
      
      expect(() => validateTheme('INVALID_THEME')).toThrow(
        "Theme 'INVALID_THEME' is not supported. Available themes:"
      );
    });

    it('should throw error when theme name is uppercase', () => {
      // Mock isThemeSupported to return false for uppercase theme
      mockIsThemeSupported.mockReturnValue(false);
      
      expect(() => validateTheme('DARK-PLUS')).toThrow(
        "Theme 'DARK-PLUS' is not supported. Available themes:"
      );
    });

    it('should throw error when theme name is empty string', () => {
      // Mock isThemeSupported to return false for empty string
      mockIsThemeSupported.mockReturnValue(false);
      
      expect(() => validateTheme('')).toThrow(
        "Theme '' is not supported. Available themes:"
      );
    });

    it('should throw error when theme is null or undefined', () => {
      expect(() => validateTheme(null as any)).toThrow(
        "Theme 'null' is not supported. Available themes:"
      );
      
      expect(() => validateTheme(undefined as any)).toThrow(
        "Theme 'undefined' is not supported. Available themes:"
      );
    });

    it('should throw error when non-existent theme is specified', () => {
      // Mock isThemeSupported to return false for non-existent theme
      mockIsThemeSupported.mockReturnValue(false);
      
      expect(() => validateTheme('non-existent-theme')).toThrow(
        "Theme 'non-existent-theme' is not supported. Available themes:"
      );
    });

    it('should include available themes list in error message', () => {
      // Mock isThemeSupported to return false for invalid theme
      mockIsThemeSupported.mockReturnValue(false);
      
      expect(() => validateTheme('invalid-theme')).toThrow(
        /Available themes: .*dark-plus.*light-plus.*monokai.*dracula/
      );
    });

    it('should return theme name when valid theme is specified', () => {
      // Mock isThemeSupported to return true for valid theme
      mockIsThemeSupported.mockReturnValue(true);
      
      const result = validateTheme('dark-plus');
      
      expect(result).toBe('dark-plus');
    });

    it('should only accept exact lowercase matching', () => {
      // Test case sensitivity - uppercase should fail
      mockIsThemeSupported.mockReturnValue(false);
      
      expect(() => validateTheme('DARK-PLUS')).toThrow();
      expect(() => validateTheme('Dark-Plus')).toThrow();
      expect(() => validateTheme('MONOKAI')).toThrow();
      
      // Only exact lowercase should work
      mockIsThemeSupported.mockReturnValue(true);
      
      expect(validateTheme('dark-plus')).toBe('dark-plus');
      expect(validateTheme('monokai')).toBe('monokai');
    });

    it('should not provide fallback or hints for invalid themes', () => {
      // Mock isThemeSupported to return false for similar-sounding theme
      mockIsThemeSupported.mockReturnValue(false);
      
      // Should not suggest similar themes or provide hints
      expect(() => validateTheme('darkplus')).toThrow(
        "Theme 'darkplus' is not supported"
      );
      
      // Error message should be clear and direct - no suggestions
      const errorMessage = (() => {
        try {
          validateTheme('darkplus');
          return '';
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      })();
      
      expect(errorMessage).not.toMatch(/did you mean/i);
      expect(errorMessage).not.toMatch(/similar/i);
      expect(errorMessage).not.toMatch(/try/i);
    });
  });
});