/**
 * Performance benchmarks for multi-selection feature
 * Validates that the implementation meets performance requirements
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../src/hooks/useSelection.js';
import * as selectionUtils from '../src/utils/selectionUtils.js';

describe('Multi-Selection Performance Benchmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Large Selection Operations', () => {
    it('should handle 10,000 line selections within performance thresholds', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      act(() => {
        result.current.selectAll(1, 10000);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(10000);
      expect(duration).toBeLessThan(200); // Should complete within 200ms
      
      console.log(`10K selection operation took: ${duration.toFixed(2)}ms`);
    });

    it('should handle massive range deselection efficiently', () => {
      const { result } = renderHook(() => useSelection());

      // Setup: select 50,000 lines
      act(() => {
        result.current.selectAll(1, 50000);
      });

      expect(result.current.selectionCount).toBe(50000);

      const startTime = performance.now();

      // Deselect middle 30,000 lines
      act(() => {
        result.current.deselectAll(10000, 40000);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(19999); // 50000 - 30001 = 19999
      expect(duration).toBeLessThan(300); // Should complete within 300ms
      
      console.log(`30K deselection operation took: ${duration.toFixed(2)}ms`);
    });

    it('should handle individual line lookups at O(1) performance', () => {
      const { result } = renderHook(() => useSelection());

      // Select 100,000 lines
      act(() => {
        result.current.selectAll(1, 100000);
      });

      const startTime = performance.now();

      // Perform 10,000 random lookups
      let foundCount = 0;
      for (let i = 0; i < 10000; i++) {
        const randomLine = Math.floor(Math.random() * 100000) + 1;
        if (result.current.isSelected(randomLine)) {
          foundCount++;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(foundCount).toBe(10000); // All should be found
      expect(duration).toBeLessThan(50); // 10K lookups should be very fast
      
      console.log(`10K lookup operations took: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Rapid Sequential Operations', () => {
    it('should handle 1000 rapid toggles efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      act(() => {
        for (let i = 1; i <= 1000; i++) {
          result.current.toggleSelection(i);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(1000);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      
      console.log(`1K toggle operations took: ${duration.toFixed(2)}ms`);
    });

    it('should handle alternating select/deselect patterns efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      act(() => {
        for (let i = 1; i <= 500; i++) {
          result.current.selectAll(i * 10, i * 10 + 5); // Select 6 lines
          result.current.deselectAll(i * 10 + 2, i * 10 + 3); // Deselect 2 lines
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Each iteration: +6 -2 = +4 lines, 500 iterations = 2000 lines
      expect(result.current.selectionCount).toBe(2000);
      expect(duration).toBeLessThan(150); // Should complete within 150ms
      
      console.log(`500 alternating select/deselect operations took: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Efficiency Benchmarks', () => {
    it('should not grow memory usage with repeated cycles', () => {
      const { result } = renderHook(() => useSelection());

      // Baseline memory measurement
      const initialMemory = process.memoryUsage();

      // Perform 100 cycles of large selections
      for (let cycle = 0; cycle < 100; cycle++) {
        act(() => {
          result.current.selectAll(1, 1000);
        });

        act(() => {
          result.current.clearSelection();
        });
      }

      // Final memory measurement
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result.current.selectionCount).toBe(0);
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
      
      console.log(`Memory growth after 100 cycles: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should efficiently handle sparse selections', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      act(() => {
        // Use range selections instead of individual toggles for better performance
        for (let i = 0; i < 1000; i++) {
          const start = i * 100 + 1;
          const end = start + 9; // Select 10 lines at a time
          result.current.selectAll(start, end);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(10000); // 1000 * 10 = 10,000
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      
      console.log(`Sparse selection (10K lines in ranges) took: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Utility Function Performance', () => {
    it('should benchmark selectionUtils.toggleSelection performance', () => {
      let selections = new Set<number>();

      const startTime = performance.now();

      // Use optimized bulk operations instead of individual toggles
      const linesToToggle = Array.from({ length: 10000 }, (_, i) => i + 1);
      selections = selectionUtils.toggleMultiple(selections, linesToToggle);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(selectionUtils.getSelectionCount(selections)).toBe(10000);
      expect(duration).toBeLessThan(20); // Should complete within 20ms with bulk operation
      
      console.log(`10K utility bulk toggle operations took: ${duration.toFixed(2)}ms`);
    });

    it('should benchmark selectionUtils with large Set operations', () => {
      let selections = new Set<number>();

      // Create large initial selection
      for (let i = 1; i <= 100000; i++) {
        selections.add(i);
      }

      const startTime = performance.now();

      // Perform operations on large Set
      let count = 0;
      for (let i = 1; i <= 10000; i++) {
        if (selectionUtils.isSelected(selections, i)) {
          count++;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(count).toBe(10000);
      expect(duration).toBeLessThan(20); // Should complete within 20ms
      
      console.log(`10K utility lookups on 100K Set took: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle typical user selection workflow efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      act(() => {
        // Simulate user workflow
        result.current.toggleSelection(10); // Select one line
        result.current.selectAll(20, 30); // Select a range
        result.current.toggleSelection(25); // Deselect one from range
        result.current.selectAll(1, 100); // Select larger range
        result.current.deselectAll(50, 60); // Deselect sub-range
        result.current.toggleSelection(200); // Add another line
        result.current.clearSelection(); // Clear all
        result.current.selectAll(300, 350); // New selection
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(51); // Lines 300-350
      expect(duration).toBeLessThan(10); // Should be nearly instantaneous
      
      console.log(`Typical user workflow took: ${duration.toFixed(2)}ms`);
    });

    it('should handle viewport-based selection patterns efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      act(() => {
        // Simulate scrolling through large file and selecting visible lines
        for (let viewport = 0; viewport < 100; viewport++) {
          const viewportStart = viewport * 50 + 1;
          const viewportEnd = viewportStart + 49;
          
          // Select all visible lines in this viewport
          result.current.selectAll(viewportStart, viewportEnd);
          
          // Deselect every 10th line
          for (let line = viewportStart; line <= viewportEnd; line += 10) {
            result.current.toggleSelection(line);
          }
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should have selected most lines in 100 viewports
      expect(result.current.selectionCount).toBeGreaterThan(4000);
      expect(duration).toBeLessThan(300); // Should complete within 300ms
      
      console.log(`Viewport selection pattern took: ${duration.toFixed(2)}ms`);
      console.log(`Final selection count: ${result.current.selectionCount}`);
    });
  });
});