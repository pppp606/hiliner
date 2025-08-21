/**
 * Tests for file loading and validation utilities (TDD Red phase)
 * These tests define the expected behavior before implementation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { loadFileContent, validateFileSize, FileValidationError, ErrorType } from '../fileLoader';

describe('fileLoader utilities', () => {
  const testFilesDir = path.join(process.cwd(), 'test-files');
  const smallTestFile = path.join(testFilesDir, 'small-test.txt');
  const largeTestFile = path.join(testFilesDir, 'large-test.txt');
  const nonExistentFile = path.join(testFilesDir, 'does-not-exist.txt');

  beforeEach(async () => {
    // Create test files directory
    await fs.mkdir(testFilesDir, { recursive: true });

    // Create small test file (< 1KB)
    await fs.writeFile(smallTestFile, 'Line 1\nLine 2\nLine 3\nLine 4\n');

    // Create large test file (> 10MB) - simulate with smaller size for testing
    const largeContent = 'Large line content\n'.repeat(100000); // ~1.8MB but we'll mock the size check
    await fs.writeFile(largeTestFile, largeContent);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testFilesDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validateFileSize', () => {
    it('should accept files under the size limit', async () => {
      const result = await validateFileSize(smallTestFile, 10 * 1024 * 1024); // 10MB limit
      expect(result.valid).toBe(true);
      expect(result.size).toBeGreaterThan(0);
      expect(result.size).toBeLessThan(1024); // Should be less than 1KB
    });

    it('should reject files over the size limit', async () => {
      // Mock a large file size
      const mockStat = { size: 11 * 1024 * 1024 }; // 11MB
      jest.spyOn(fs, 'stat').mockResolvedValueOnce(mockStat as any);

      const result = await validateFileSize(largeTestFile, 10 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.size).toBe(11 * 1024 * 1024);
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should handle non-existent files', async () => {
      const result = await validateFileSize(nonExistentFile, 10 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should handle permission errors', async () => {
      jest.spyOn(fs, 'stat').mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await validateFileSize(smallTestFile, 10 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('permission denied');
    });

    it('should use default size limit when not specified', async () => {
      const result = await validateFileSize(smallTestFile); // Should default to 10MB
      expect(result.valid).toBe(true);
    });
  });

  describe('loadFileContent', () => {
    it('should load valid file content as array of lines', async () => {
      const result = await loadFileContent(smallTestFile);

      expect(result.success).toBe(true);
      expect(result.lines).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
      expect(result.metadata).toEqual({
        path: smallTestFile,
        size: expect.any(Number),
        lineCount: 4,
        encoding: 'utf8',
        lastModified: expect.any(Date),
      });
      expect(result.error).toBeNull();
    });

    it('should handle empty files', async () => {
      const emptyFile = path.join(testFilesDir, 'empty.txt');
      await fs.writeFile(emptyFile, '');

      const result = await loadFileContent(emptyFile);

      expect(result.success).toBe(true);
      expect(result.lines).toEqual(['']);
      expect(result.metadata?.lineCount).toBe(1); // Empty file has one empty line
    });

    it('should handle files with different line endings', async () => {
      const mixedLineEndingsFile = path.join(testFilesDir, 'mixed-endings.txt');
      await fs.writeFile(mixedLineEndingsFile, 'Line 1\r\nLine 2\nLine 3\r');

      const result = await loadFileContent(mixedLineEndingsFile);

      expect(result.success).toBe(true);
      expect(result.lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should enforce size limits', async () => {
      // Mock file size to exceed limit
      jest.spyOn(fs, 'stat').mockResolvedValueOnce({
        size: 11 * 1024 * 1024, // 11MB
        mtime: new Date(),
      } as any);

      const result = await loadFileContent(largeTestFile, { maxSize: 10 * 1024 * 1024 });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.FILE_TOO_LARGE);
      expect(result.error?.message).toContain('exceeds maximum size');
      expect(result.error?.filePath).toBe(largeTestFile);
    });

    it('should handle non-existent files', async () => {
      const result = await loadFileContent(nonExistentFile);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.FILE_NOT_FOUND);
      expect(result.error?.message).toContain('File not found');
      expect(result.error?.filePath).toBe(nonExistentFile);
    });

    it('should handle permission errors', async () => {
      jest.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await loadFileContent(smallTestFile);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.PERMISSION_DENIED);
      expect(result.error?.message).toContain('permission denied');
    });

    it('should handle encoding errors gracefully', async () => {
      // Create a binary file that's not valid UTF-8
      const binaryFile = path.join(testFilesDir, 'binary.bin');
      const binaryData = Buffer.from([0xFF, 0xFE, 0x00, 0x00, 0x41, 0x00]);
      await fs.writeFile(binaryFile, binaryData);

      const result = await loadFileContent(binaryFile);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.ENCODING_ERROR);
      expect(result.error?.message).toContain('encoding');
    });

    it('should respect custom options', async () => {
      const options = {
        maxSize: 5 * 1024 * 1024, // 5MB
        encoding: 'utf8' as const,
        preserveLineEndings: true,
      };

      const result = await loadFileContent(smallTestFile, options);

      expect(result.success).toBe(true);
      expect(result.metadata?.encoding).toBe('utf8');
    });

    it('should handle very large files with memory efficiency', async () => {
      // This test would verify streaming or chunked reading for very large files
      // For now, we'll just verify the structure
      const result = await loadFileContent(smallTestFile, { maxSize: 1 * 1024 * 1024 });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.lines)).toBe(true);
      expect(typeof result.metadata?.size).toBe('number');
    });
  });

  describe('FileValidationError', () => {
    it('should create error with correct properties', () => {
      const error = new FileValidationError(
        ErrorType.FILE_TOO_LARGE,
        'File is too large',
        '/test/path'
      );

      expect(error.type).toBe(ErrorType.FILE_TOO_LARGE);
      expect(error.message).toBe('File is too large');
      expect(error.filePath).toBe('/test/path');
      expect(error.recoverable).toBe(false); // Default
      expect(error.name).toBe('FileValidationError');
    });

    it('should set recoverable flag correctly', () => {
      const error = new FileValidationError(
        ErrorType.PERMISSION_DENIED,
        'No permission',
        '/test/path',
        true
      );

      expect(error.recoverable).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle files with no extension', async () => {
      const noExtFile = path.join(testFilesDir, 'README');
      await fs.writeFile(noExtFile, 'This is a README file\nWith multiple lines');

      const result = await loadFileContent(noExtFile);

      expect(result.success).toBe(true);
      expect(result.lines).toHaveLength(2);
    });

    it('should handle files with special characters in path', async () => {
      const specialFile = path.join(testFilesDir, 'file with spaces & symbols (test).txt');
      await fs.writeFile(specialFile, 'Content with special file name');

      const result = await loadFileContent(specialFile);

      expect(result.success).toBe(true);
      expect(result.lines).toEqual(['Content with special file name']);
    });

    it('should handle extremely long lines', async () => {
      const longLineFile = path.join(testFilesDir, 'long-line.txt');
      const longLine = 'x'.repeat(10000); // 10K character line
      await fs.writeFile(longLineFile, longLine);

      const result = await loadFileContent(longLineFile);

      expect(result.success).toBe(true);
      expect(result.lines[0]).toHaveLength(10000);
    });

    it('should handle files with only whitespace', async () => {
      const whitespaceFile = path.join(testFilesDir, 'whitespace.txt');
      await fs.writeFile(whitespaceFile, '   \n\t\n   \n');

      const result = await loadFileContent(whitespaceFile);

      expect(result.success).toBe(true);
      expect(result.lines).toEqual(['   ', '\t', '   ']);
    });
  });
});