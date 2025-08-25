import { describe, expect, it } from '@jest/globals';
import {
  buildStatusMessage,
  buildPositionInfo,
  shouldDisplayTheme,
  formatThemeDisplay
} from '../statusBarHelpers.js';
import type { StatusBarProps } from '../../types.js';

/**
 * Tests for StatusBar helper functions
 * 
 * These tests verify the core theme display logic for GitHub Issue #11:
 * - Theme display with "(current)" marker when syntax highlighting enabled
 * - No theme display when syntax highlighting disabled
 * - Proper integration with other status elements  
 * - Consistent formatting
 */

describe('StatusBar Helper Functions', () => {
  
  describe('buildStatusMessage', () => {
    it('should display theme with (current) marker when syntax highlighting enabled', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        detectedLanguage: 'javascript',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus'
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).toContain('JAVASCRIPT');
      expect(result).toContain('dark-plus (current)');
      expect(result).toBe('JAVASCRIPT | dark-plus (current)');
    });
    
    it('should not display theme when syntax highlighting disabled', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        detectedLanguage: 'javascript',
        syntaxHighlightingEnabled: false,
        syntaxTheme: 'dark-plus'
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).toContain('JAVASCRIPT (no highlight)');
      expect(result).not.toContain('dark-plus (current)');
      expect(result).not.toContain('dark-plus');
    });
    
    it('should handle different theme names correctly', () => {
      const themes = ['monokai', 'dracula', 'github-dark', 'one-dark-pro'];
      
      themes.forEach(theme => {
        const props: StatusBarProps = {
          fileName: 'test.py',
          detectedLanguage: 'python',
          syntaxHighlightingEnabled: true,
          syntaxTheme: theme
        };
        
        const result = buildStatusMessage(props);
        
        expect(result).toContain('PYTHON');
        expect(result).toContain(`${theme} (current)`);
        expect(result).toBe(`PYTHON | ${theme} (current)`);
      });
    });
    
    it('should handle theme with other status elements', () => {
      const props: StatusBarProps = {
        fileName: 'example.ts',
        detectedLanguage: 'typescript',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'monokai',
        selectionCount: 3,
        encoding: 'utf-16'
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).toContain('TYPESCRIPT');
      expect(result).toContain('monokai (current)');
      expect(result).toContain('3 selected');
      expect(result).toContain('UTF-16');
      expect(result).toBe('TYPESCRIPT | monokai (current) | UTF-16 | 3 selected');
    });
    
    it('should not display theme when no language detected', () => {
      const props: StatusBarProps = {
        fileName: 'test.txt',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus'
        // detectedLanguage not provided
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).not.toContain('dark-plus (current)');
      expect(result).toBe('');
    });
    
    it('should not display theme when language is "text"', () => {
      const props: StatusBarProps = {
        fileName: 'readme.txt',
        detectedLanguage: 'text',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus'
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).not.toContain('dark-plus (current)');
      expect(result).toBe('');
    });
    
    it('should handle loading state (no theme display)', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        detectedLanguage: 'javascript',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus',
        isLoading: true
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).toBe('Loading...');
      expect(result).not.toContain('dark-plus (current)');
    });
    
    it('should handle error state (no theme display)', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        detectedLanguage: 'javascript',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus',
        isError: true,
        errorMessage: 'File not found'
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).toBe('Error: File not found');
      expect(result).not.toContain('dark-plus (current)');
    });
    
    it('should handle binary files with theme', () => {
      const props: StatusBarProps = {
        fileName: 'image.png',
        detectedLanguage: 'binary',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus',
        isBinary: true
      };
      
      const result = buildStatusMessage(props);
      
      expect(result).toContain('[Binary]');
      expect(result).toContain('BINARY');
      expect(result).toContain('dark-plus (current)');
    });
  });
  
  describe('shouldDisplayTheme', () => {
    it('should return true when all conditions are met', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        detectedLanguage: 'javascript',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus'
      };
      
      expect(shouldDisplayTheme(props)).toBe(true);
    });
    
    it('should return false when syntax highlighting disabled', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        detectedLanguage: 'javascript',
        syntaxHighlightingEnabled: false,
        syntaxTheme: 'dark-plus'
      };
      
      expect(shouldDisplayTheme(props)).toBe(false);
    });
    
    it('should return false when no theme specified', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        detectedLanguage: 'javascript',
        syntaxHighlightingEnabled: true
        // syntaxTheme not provided
      };
      
      expect(shouldDisplayTheme(props)).toBe(false);
    });
    
    it('should return false when no language detected', () => {
      const props: StatusBarProps = {
        fileName: 'test.js',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus'
        // detectedLanguage not provided
      };
      
      expect(shouldDisplayTheme(props)).toBe(false);
    });
    
    it('should return false when language is "text"', () => {
      const props: StatusBarProps = {
        fileName: 'readme.txt',
        detectedLanguage: 'text',
        syntaxHighlightingEnabled: true,
        syntaxTheme: 'dark-plus'
      };
      
      expect(shouldDisplayTheme(props)).toBe(false);
    });
  });
  
  describe('formatThemeDisplay', () => {
    it('should format theme name with (current) marker', () => {
      expect(formatThemeDisplay('dark-plus')).toBe('dark-plus (current)');
      expect(formatThemeDisplay('monokai')).toBe('monokai (current)');
      expect(formatThemeDisplay('github-dark')).toBe('github-dark (current)');
    });
    
    it('should handle various theme name formats', () => {
      const themes = [
        'simple',
        'kebab-case',
        'snake_case',
        'PascalCase',
        'theme.with.dots',
        'theme123',
        'very-long-theme-name-with-multiple-parts'
      ];
      
      themes.forEach(theme => {
        const result = formatThemeDisplay(theme);
        expect(result).toBe(`${theme} (current)`);
        expect(result).toMatch(/^.+ \(current\)$/);
      });
    });
    
    it('should handle empty and edge case theme names', () => {
      expect(formatThemeDisplay('')).toBe(' (current)');
      expect(formatThemeDisplay(' ')).toBe('  (current)');
    });
  });
  
  describe('buildPositionInfo', () => {
    it('should build position info correctly', () => {
      expect(buildPositionInfo(1, 100)).toBe('Top  1/100');
      expect(buildPositionInfo(100, 100)).toBe('Bot  100/100');
      expect(buildPositionInfo(50, 100)).toBe('50%  50/100');
    });
    
    it('should return empty string for invalid inputs', () => {
      expect(buildPositionInfo()).toBe('');
      expect(buildPositionInfo(1)).toBe('');
      expect(buildPositionInfo(undefined, 100)).toBe('');
      expect(buildPositionInfo(1, 0)).toBe('');
    });
  });
});