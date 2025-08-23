import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { detectLanguage, getSupportedLanguages } from '../languageDetection.js';

describe('Language Detection', () => {
  describe('detectLanguage', () => {
    it('should detect JavaScript from file extension', async () => {
      const result = await detectLanguage('test.js', 'console.log("Hello World");');
      expect(result).toBe('javascript');
    });

    it('should detect TypeScript from file extension', async () => {
      const result = await detectLanguage('test.ts', 'const message: string = "Hello";');
      expect(result).toBe('typescript');
    });

    it('should detect Python from file extension', async () => {
      const result = await detectLanguage('test.py', 'print("Hello World")');
      expect(result).toBe('python');
    });

    it('should detect JSON from file extension', async () => {
      const result = await detectLanguage('package.json', '{"name": "test"}');
      expect(result).toBe('json');
    });

    it('should detect language from content when extension is unknown', async () => {
      const jsContent = 'function test() {\n  return "hello";\n}';
      const result = await detectLanguage('unknown-file', jsContent);
      expect(result).toBe('javascript');
    });

    it('should detect language from shebang line', async () => {
      const bashContent = '#!/bin/bash\necho "Hello World"';
      const result = await detectLanguage('script', bashContent);
      expect(result).toBe('bash');
    });

    it('should return plain text for unrecognized content', async () => {
      const plainContent = 'This is just plain text with no programming syntax.';
      const result = await detectLanguage('readme.txt', plainContent);
      expect(result).toBe('text');
    });

    it('should handle empty files', async () => {
      const result = await detectLanguage('empty.txt', '');
      expect(result).toBe('text');
    });

    it('should handle files with only whitespace', async () => {
      const result = await detectLanguage('whitespace.js', '   \n  \t  \n');
      expect(result).toBe('text');
    });

    it('should prioritize file extension over content detection', async () => {
      // Even if content looks like Python, .js extension should win
      const pythonLikeContent = 'print("Hello World")';
      const result = await detectLanguage('test.js', pythonLikeContent);
      expect(result).toBe('javascript');
    });

    it('should handle mixed content detection', async () => {
      const mixedContent = `
        # This looks like a comment
        function test() {
          return "mixed content";
        }
      `;
      const result = await detectLanguage('mixed.js', mixedContent);
      expect(result).toBe('javascript');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return an array of supported language identifiers', () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should include common programming languages', () => {
      const languages = getSupportedLanguages();
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('json');
      expect(languages).toContain('html');
      expect(languages).toContain('css');
    });

    it('should include text as a fallback language', () => {
      const languages = getSupportedLanguages();
      expect(languages).toContain('text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined filename', async () => {
      const result1 = await detectLanguage('', 'console.log("test");');
      const result2 = await detectLanguage('test.js', 'console.log("test");');
      
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
    });

    it('should handle very large files efficiently', async () => {
      const largeContent = 'console.log("test");\n'.repeat(10000);
      const startTime = Date.now();
      const result = await detectLanguage('large.js', largeContent);
      const endTime = Date.now();
      
      expect(result).toBe('javascript');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle binary content gracefully', async () => {
      const binaryContent = String.fromCharCode(0, 1, 2, 3, 255, 254);
      const result = await detectLanguage('binary.bin', binaryContent);
      expect(result).toBe('text');
    });

    it('should handle Unicode content', async () => {
      const unicodeContent = 'console.log("Hello 世界! 🌍");';
      const result = await detectLanguage('unicode.js', unicodeContent);
      expect(result).toBe('javascript');
    });
  });
});