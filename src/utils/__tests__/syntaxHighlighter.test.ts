import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { highlightCode, getAvailableThemes, initializeHighlighter, cleanup } from '../syntaxHighlighter.js';

describe('Syntax Highlighter', () => {
  afterEach(async () => {
    await cleanup();
  });

  describe('highlightCode', () => {
    it('should highlight JavaScript code with ANSI escape sequences', async () => {
      const code = 'function test() {\n  return "hello";\n}';
      const result = await highlightCode(code, 'javascript');
      
      // Should contain ANSI escape sequences for colors
      expect(result).toMatch(/\x1b\[\d+m/); // Contains ANSI codes
      expect(result).toContain('function');
      expect(result).toContain('test');
      expect(result).toContain('return');
      expect(result).toContain('hello');
    });

    it('should highlight TypeScript code', async () => {
      const code = 'const message: string = "Hello World";';
      const result = await highlightCode(code, 'typescript');
      
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result).toContain('const');
      expect(result).toContain('message');
      expect(result).toContain('string');
    });

    it('should highlight Python code', async () => {
      const code = 'def hello():\n    return "Hello World"';
      const result = await highlightCode(code, 'python');
      
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result).toContain('def');
      expect(result).toContain('hello');
      expect(result).toContain('return');
    });

    it('should highlight JSON code', async () => {
      const code = '{"name": "test", "version": "1.0.0"}';
      const result = await highlightCode(code, 'json');
      
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result).toContain('name');
      expect(result).toContain('test');
      expect(result).toContain('version');
    });

    it('should handle plain text without highlighting', async () => {
      const code = 'This is plain text with no syntax highlighting.';
      const result = await highlightCode(code, 'text');
      
      // Should return original text without ANSI codes
      expect(result).toBe(code);
    });

    it('should fallback to plain text for unsupported languages', async () => {
      const code = 'Some code in an unsupported language';
      const result = await highlightCode(code, 'unsupported-lang');
      
      expect(result).toBe(code);
    });

    it('should handle empty code', async () => {
      const result = await highlightCode('', 'javascript');
      expect(result).toBe('');
    });

    it('should handle multiline code with proper formatting', async () => {
      const code = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;
      const result = await highlightCode(code, 'javascript');
      
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result.split('\n')).toHaveLength(4);
      expect(result).toContain('function');
      expect(result).toContain('fibonacci');
    });

    it('should preserve original formatting and indentation', async () => {
      const code = `  const indented = {
    nested: {
      value: 42
    }
  };`;
      const result = await highlightCode(code, 'javascript');
      
      // Should preserve leading whitespace
      expect(result).toMatch(/^  /); // Starts with 2 spaces
      expect(result).toContain('    nested'); // Nested indentation preserved
    });
  });

  describe('initializeHighlighter', () => {
    it('should initialize the highlighter with default theme', async () => {
      const highlighter = await initializeHighlighter();
      expect(highlighter).toBeDefined();
      expect(typeof highlighter.codeToHtml).toBe('function');
    });

    it('should initialize with custom theme', async () => {
      const highlighter = await initializeHighlighter('monokai');
      expect(highlighter).toBeDefined();
      expect(typeof highlighter.codeToHtml).toBe('function');
    });

    it('should return the same instance on multiple calls', async () => {
      const highlighter1 = await initializeHighlighter();
      const highlighter2 = await initializeHighlighter();
      expect(highlighter1).toBe(highlighter2);
    });
  });

  describe('getAvailableThemes', () => {
    it('should return an array of available theme names', () => {
      const themes = getAvailableThemes();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);
    });

    it('should include common themes', () => {
      const themes = getAvailableThemes();
      expect(themes).toContain('dark-plus'); // VS Code Dark+
      expect(themes).toContain('light-plus'); // VS Code Light+
      expect(themes).toContain('github-dark');
      expect(themes).toContain('github-light');
    });

    it('should return strings', () => {
      const themes = getAvailableThemes();
      themes.forEach(theme => {
        expect(typeof theme).toBe('string');
        expect(theme.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large code blocks efficiently', async () => {
      const largeCode = 'console.log("line");\n'.repeat(1000);
      const startTime = Date.now();
      const result = await highlightCode(largeCode, 'javascript');
      const endTime = Date.now();
      
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle code with special characters', async () => {
      const code = 'const emoji = "🌍"; // Unicode test';
      const result = await highlightCode(code, 'javascript');
      
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result).toContain('🌍');
      expect(result).toContain('Unicode');
    });

    it('should handle code with HTML-like syntax', async () => {
      const code = '<div class="container">Hello <span>World</span></div>';
      const result = await highlightCode(code, 'html');
      
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result).toContain('div');
      expect(result).toContain('class');
      expect(result).toContain('container');
    });

    it('should handle malformed code gracefully', async () => {
      const code = 'function broken( { console.log("missing brace"';
      const result = await highlightCode(code, 'javascript');
      
      // Should still highlight even with syntax errors
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result).toContain('function');
      expect(result).toContain('console');
    });

    it('should handle null or undefined input gracefully', async () => {
      const result1 = await highlightCode(null as any, 'javascript');
      const result2 = await highlightCode(undefined as any, 'javascript');
      
      expect(result1).toBe('');
      expect(result2).toBe('');
    });
  });

  describe('Theme Integration', () => {
    it('should use different colors for different themes', async () => {
      const code = 'function test() { return "hello"; }';
      
      const darkResult = await highlightCode(code, 'javascript', 'dark-plus');
      const lightResult = await highlightCode(code, 'javascript', 'light-plus');
      
      expect(darkResult).toMatch(/\x1b\[\d+m/);
      expect(lightResult).toMatch(/\x1b\[\d+m/);
      
      // Different themes should produce different ANSI sequences
      expect(darkResult).not.toBe(lightResult);
    });

    it('should fallback to default theme for invalid theme names', async () => {
      const code = 'function test() {}';
      const result = await highlightCode(code, 'javascript', 'invalid-theme-name');
      
      // Should still work with fallback
      expect(result).toMatch(/\x1b\[\d+m/);
      expect(result).toContain('function');
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources properly', async () => {
      await initializeHighlighter();
      await cleanup();
      
      // After cleanup, should be able to initialize again
      const highlighter = await initializeHighlighter();
      expect(highlighter).toBeDefined();
    });
  });
});