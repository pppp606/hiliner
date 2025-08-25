import { describe, expect, it } from '@jest/globals';
import { isThemeSupported, getAvailableThemes, validateTheme } from '../themeValidation.js';

describe('Theme Validation', () => {
  describe('validateTheme', () => {
    it('should return valid theme for exact lowercase matches', () => {
      expect(validateTheme('dark-plus')).toBe('dark-plus');
      expect(validateTheme('monokai')).toBe('monokai');
      expect(validateTheme('github-dark')).toBe('github-dark');
      expect(validateTheme('github-light')).toBe('github-light');
    });

    it('should throw error for case mismatches', () => {
      expect(() => validateTheme('Dark-Plus')).toThrow('Theme \'Dark-Plus\' is not supported');
      expect(() => validateTheme('MONOKAI')).toThrow('Theme \'MONOKAI\' is not supported');
      expect(() => validateTheme('GitHub-Dark')).toThrow('Theme \'GitHub-Dark\' is not supported');
    });

    it('should throw error for non-existent themes', () => {
      expect(() => validateTheme('non-existent-theme')).toThrow('Theme \'non-existent-theme\' is not supported');
      expect(() => validateTheme('custom-theme')).toThrow('Theme \'custom-theme\' is not supported');
    });

    it('should throw error for empty or whitespace themes', () => {
      expect(() => validateTheme('')).toThrow('Theme \'\' is not supported');
      expect(() => validateTheme('  ')).toThrow('Theme \'  \' is not supported');
      expect(() => validateTheme('\\t')).toThrow('Theme \'\\t\' is not supported');
    });

    it('should throw error with available themes list', () => {
      try {
        validateTheme('invalid-theme');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = error as Error;
        expect(errorMessage.message).toContain('Available themes:');
        expect(errorMessage.message).toContain('dark-plus');
        expect(errorMessage.message).toContain('monokai');
      }
    });

    it('should include limited theme list in error message', () => {
      try {
        validateTheme('bad-theme');
      } catch (error) {
        const availableThemes = getAvailableThemes();
        const message = (error as Error).message;
        
        // Should show first 10 themes
        const shownThemes = availableThemes.slice(0, 10);
        shownThemes.forEach(theme => {
          expect(message).toContain(theme);
        });
        
        // Should indicate there are more themes if applicable
        if (availableThemes.length > 10) {
          expect(message).toContain('...');
        }
      }
    });
  });

  describe('isThemeSupported', () => {
    it('should return true for valid themes', () => {
      const availableThemes = getAvailableThemes();
      const sampleThemes = availableThemes.slice(0, 5);
      
      sampleThemes.forEach(theme => {
        expect(isThemeSupported(theme)).toBe(true);
      });
    });

    it('should return false for invalid themes', () => {
      expect(isThemeSupported('Invalid-Theme')).toBe(false);
      expect(isThemeSupported('DARK-PLUS')).toBe(false);
      expect(isThemeSupported('non-existent')).toBe(false);
      expect(isThemeSupported('')).toBe(false);
      expect(isThemeSupported('  dark-plus  ')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isThemeSupported(null as any)).toBe(false);
      expect(isThemeSupported(undefined as any)).toBe(false);
      expect(isThemeSupported(123 as any)).toBe(false);
      expect(isThemeSupported({} as any)).toBe(false);
    });
  });

  describe('getAvailableThemes', () => {
    it('should return array of theme names', () => {
      const themes = getAvailableThemes();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);
    });

    it('should include expected themes', () => {
      const themes = getAvailableThemes();
      expect(themes).toContain('dark-plus');
      expect(themes).toContain('light-plus');
      expect(themes).toContain('monokai');
      expect(themes).toContain('github-dark');
      expect(themes).toContain('github-light');
    });

    it('should return only string values', () => {
      const themes = getAvailableThemes();
      themes.forEach(theme => {
        expect(typeof theme).toBe('string');
        expect(theme.length).toBeGreaterThan(0);
      });
    });

    it('should return consistent results', () => {
      const themes1 = getAvailableThemes();
      const themes2 = getAvailableThemes();
      expect(themes1).toEqual(themes2);
    });
  });
});