/**
 * Tests for useFileLoader hook (TDD Red phase)
 * These tests define the expected hook behavior before implementation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import fs from 'fs/promises';
import path from 'path';
import { useFileLoader, UseFileLoaderOptions } from '../useFileLoader';
import { ErrorType } from '../../utils/fileLoader';

describe('useFileLoader hook', () => {
  const testFilesDir = path.join(process.cwd(), 'test-files-hook');
  const testFile = path.join(testFilesDir, 'test.txt');
  const largeFile = path.join(testFilesDir, 'large.txt');
  const nonExistentFile = path.join(testFilesDir, 'missing.txt');

  beforeEach(async () => {
    // Create test files directory
    await fs.mkdir(testFilesDir, { recursive: true });

    // Create test file
    await fs.writeFile(testFile, 'Line 1\nLine 2\nLine 3\n');

    // Create large file content
    const largeContent = 'Large line\n'.repeat(1000);
    await fs.writeFile(largeFile, largeContent);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testFilesDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useFileLoader());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.content).toEqual([]);
      expect(result.current.metadata).toBeNull();
      expect(result.current.loadFile).toBeInstanceOf(Function);
      expect(result.current.reload).toBeInstanceOf(Function);
      expect(result.current.clearError).toBeInstanceOf(Function);
    });

    it('should accept custom options', () => {
      const options: UseFileLoaderOptions = {
        maxSize: 5 * 1024 * 1024, // 5MB
        autoLoad: false,
      };

      const { result } = renderHook(() => useFileLoader(options));

      expect(result.current.loading).toBe(false);
      expect(result.current.content).toEqual([]);
    });

    it('should not auto-load without file path', () => {
      const options: UseFileLoaderOptions = {
        autoLoad: true,
      };

      const { result } = renderHook(() => useFileLoader(options));

      expect(result.current.loading).toBe(false);
      expect(result.current.content).toEqual([]);
    });
  });

  describe('file loading', () => {
    it('should load file successfully', async () => {
      const { result } = renderHook(() => useFileLoader());

      act(() => {
        result.current.loadFile(testFile);
      });

      // Initially should be loading
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toEqual(['Line 1', 'Line 2', 'Line 3']);
      expect(result.current.metadata).toEqual({
        path: testFile,
        size: expect.any(Number),
        lineCount: 3,
        encoding: 'utf8',
        lastModified: expect.any(Date),
      });
      expect(result.current.error).toBeNull();
    });

    it('should handle loading state correctly', async () => {
      const { result } = renderHook(() => useFileLoader());

      act(() => {
        result.current.loadFile(testFile);
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.content).toEqual([]); // Should clear previous content
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle file not found error', async () => {
      const { result } = renderHook(() => useFileLoader());

      act(() => {
        result.current.loadFile(nonExistentFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toEqual([]);
      expect(result.current.metadata).toBeNull();
      expect(result.current.error).toEqual({
        type: ErrorType.FILE_NOT_FOUND,
        message: expect.stringContaining('File not found'),
        filePath: nonExistentFile,
        recoverable: false,
      });
    });

    it('should handle file size limit exceeded', async () => {
      const options: UseFileLoaderOptions = {
        maxSize: 100, // Very small limit
      };

      const { result } = renderHook(() => useFileLoader(options));

      act(() => {
        result.current.loadFile(largeFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.type).toBe(ErrorType.FILE_TOO_LARGE);
      expect(result.current.error?.message).toContain('exceeds maximum size');
      expect(result.current.content).toEqual([]);
    });

    it('should handle multiple consecutive loads', async () => {
      const { result } = renderHook(() => useFileLoader());

      // Load first file
      act(() => {
        result.current.loadFile(testFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toHaveLength(3);

      // Load different file
      const secondFile = path.join(testFilesDir, 'second.txt');
      await fs.writeFile(secondFile, 'Second file content');

      act(() => {
        result.current.loadFile(secondFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toEqual(['Second file content']);
      expect(result.current.metadata?.path).toBe(secondFile);
    });

    it('should cancel previous load when new load starts', async () => {
      const { result } = renderHook(() => useFileLoader());

      // Start first load
      act(() => {
        result.current.loadFile(testFile);
      });

      expect(result.current.loading).toBe(true);

      // Start second load before first completes
      act(() => {
        result.current.loadFile(largeFile);
      });

      // Should still be loading (second file)
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have content from second file, not first
      expect(result.current.metadata?.path).toBe(largeFile);
    });
  });

  describe('auto-loading with initial file path', () => {
    it('should auto-load file when initialFilePath is provided', async () => {
      const options: UseFileLoaderOptions = {
        initialFilePath: testFile,
        autoLoad: true,
      };

      const { result } = renderHook(() => useFileLoader(options));

      // Should immediately start loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toEqual(['Line 1', 'Line 2', 'Line 3']);
      expect(result.current.metadata?.path).toBe(testFile);
    });

    it('should not auto-load when autoLoad is false', () => {
      const options: UseFileLoaderOptions = {
        initialFilePath: testFile,
        autoLoad: false,
      };

      const { result } = renderHook(() => useFileLoader(options));

      expect(result.current.loading).toBe(false);
      expect(result.current.content).toEqual([]);
      expect(result.current.metadata).toBeNull();
    });
  });

  describe('reload functionality', () => {
    it('should reload current file', async () => {
      const { result } = renderHook(() => useFileLoader());

      // Load initial file
      act(() => {
        result.current.loadFile(testFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toHaveLength(3);

      // Modify file
      await fs.writeFile(testFile, 'Modified content\nLine 2 modified');

      // Reload
      act(() => {
        result.current.reload();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toEqual(['Modified content', 'Line 2 modified']);
    });

    it('should not reload if no file was previously loaded', () => {
      const { result } = renderHook(() => useFileLoader());

      act(() => {
        result.current.reload();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.content).toEqual([]);
    });

    it('should handle reload errors', async () => {
      const { result } = renderHook(() => useFileLoader());

      // Load file successfully
      act(() => {
        result.current.loadFile(testFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Delete file
      await fs.unlink(testFile);

      // Try to reload
      act(() => {
        result.current.reload();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.type).toBe(ErrorType.FILE_NOT_FOUND);
    });
  });

  describe('error handling', () => {
    it('should clear errors', async () => {
      const { result } = renderHook(() => useFileLoader());

      // Cause an error
      act(() => {
        result.current.loadFile(nonExistentFile);
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should preserve content when clearing error', async () => {
      const { result } = renderHook(() => useFileLoader());

      // Load valid file first
      act(() => {
        result.current.loadFile(testFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.content).toHaveLength(3);
      });

      // Cause an error with invalid file
      act(() => {
        result.current.loadFile(nonExistentFile);
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      // Content should be preserved from last successful load
      expect(result.current.content).toHaveLength(3);
    });

    it('should handle permission errors', async () => {
      // This test would mock file system permission errors
      // Implementation depends on the specific error handling approach
      const { result } = renderHook(() => useFileLoader());

      // Mock fs.readFile to throw permission error
      const mockReadFile = jest.spyOn(fs, 'readFile');
      mockReadFile.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      act(() => {
        result.current.loadFile(testFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.type).toBe(ErrorType.PERMISSION_DENIED);
      expect(result.current.error?.message).toContain('permission denied');
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useFileLoader());

      act(() => {
        result.current.loadFile(testFile);
      });

      expect(result.current.loading).toBe(true);

      // Unmount should cancel ongoing operations
      unmount();

      // No way to test this directly, but the hook should handle cleanup internally
    });
  });

  describe('options handling', () => {
    it('should respect custom maxSize option', async () => {
      const options: UseFileLoaderOptions = {
        maxSize: 50, // Very small
      };

      const { result } = renderHook(() => useFileLoader(options));

      act(() => {
        result.current.loadFile(testFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.type).toBe(ErrorType.FILE_TOO_LARGE);
    });

    it('should use default options when not provided', async () => {
      const { result } = renderHook(() => useFileLoader());

      act(() => {
        result.current.loadFile(testFile);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.content).toHaveLength(3);
      expect(result.current.error).toBeNull();
    });
  });
});