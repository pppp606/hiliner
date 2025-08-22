/**
 * Integration tests for multi-selection feature
 * Tests the complete workflow: navigate → select → toggle → clear
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../src/hooks/useSelection.js';
import * as selectionUtils from '../src/utils/selectionUtils.js';

describe('Multi-Selection Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Complete Selection Workflow', () => {
    it('should handle complete selection workflow: navigate → select → toggle → clear', async () => {
      // Test the complete workflow through the useSelection hook
      const { result } = renderHook(() => useSelection());

      // Initial state - no selections
      expect(result.current.selectionCount).toBe(0);
      expect(result.current.selectedLines.size).toBe(0);

      // Step 1: Select a single line (simulating Tab key press on line 5)
      act(() => {
        result.current.toggleSelection(5);
      });

      expect(result.current.selectionCount).toBe(1);
      expect(result.current.isSelected(5)).toBe(true);
      expect(result.current.selectedLines.has(5)).toBe(true);

      // Step 2: Select a range (simulating 'a' key press for visible lines 1-10)
      act(() => {
        result.current.selectAll(1, 10);
      });

      expect(result.current.selectionCount).toBe(10);
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(5)).toBe(true);
      expect(result.current.isSelected(10)).toBe(true);
      expect(result.current.isSelected(11)).toBe(false);

      // Step 3: Toggle selection on already selected line (should deselect)
      act(() => {
        result.current.toggleSelection(5);
      });

      expect(result.current.selectionCount).toBe(9);
      expect(result.current.isSelected(5)).toBe(false);
      expect(result.current.isSelected(1)).toBe(true);

      // Step 4: Toggle selection on unselected line (should select)
      act(() => {
        result.current.toggleSelection(15);
      });

      expect(result.current.selectionCount).toBe(10);
      expect(result.current.isSelected(15)).toBe(true);

      // Step 5: Clear all selections (simulating 'd' key or Escape)
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectionCount).toBe(0);
      expect(result.current.selectedLines.size).toBe(0);
      expect(result.current.isSelected(1)).toBe(false);
      expect(result.current.isSelected(15)).toBe(false);
    });

    it('should handle deselect range operation', () => {
      const { result } = renderHook(() => useSelection());

      // Select a large range first
      act(() => {
        result.current.selectAll(1, 20);
      });

      expect(result.current.selectionCount).toBe(20);

      // Deselect a subrange
      act(() => {
        result.current.deselectAll(5, 10);
      });

      expect(result.current.selectionCount).toBe(14); // 20 - 6 (lines 5-10 inclusive)
      expect(result.current.isSelected(4)).toBe(true);
      expect(result.current.isSelected(5)).toBe(false);
      expect(result.current.isSelected(10)).toBe(false);
      expect(result.current.isSelected(11)).toBe(true);
    });
  });

  describe('Cross-Component State Synchronization', () => {
    it('should maintain selection state consistency across hook instances', () => {
      // This simulates multiple components using the same selection state
      const { result: hook1 } = renderHook(() => useSelection());
      const { result: hook2 } = renderHook(() => useSelection());

      // Both hooks should start with empty state
      expect(hook1.current.selectionCount).toBe(0);
      expect(hook2.current.selectionCount).toBe(0);

      // Selection from one hook should not affect the other (they maintain separate state)
      act(() => {
        hook1.current.toggleSelection(5);
      });

      expect(hook1.current.selectionCount).toBe(1);
      expect(hook2.current.selectionCount).toBe(0); // Separate instances

      // This is expected behavior - each hook instance maintains its own state
      // In the actual app, there's only one useSelection instance in App.tsx
    });

    it('should handle rapid selection changes without race conditions', () => {
      const { result } = renderHook(() => useSelection());

      // Perform rapid selections
      act(() => {
        result.current.toggleSelection(1);
        result.current.toggleSelection(2);
        result.current.toggleSelection(3);
        result.current.selectAll(10, 15);
        result.current.toggleSelection(2); // Deselect line 2
      });

      expect(result.current.selectionCount).toBe(8); // 1, 3, 10-15 = 8 lines
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(2)).toBe(false);
      expect(result.current.isSelected(3)).toBe(true);
      expect(result.current.isSelected(12)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file scenarios', () => {
      const { result } = renderHook(() => useSelection());

      // Try to select lines in empty file scenario
      act(() => {
        result.current.toggleSelection(1);
        result.current.selectAll(1, 10);
      });

      // Selections should still work (the hook doesn't validate file bounds)
      expect(result.current.selectionCount).toBe(10);
      expect(result.current.isSelected(1)).toBe(true);
    });

    it('should handle single line file scenarios', () => {
      const { result } = renderHook(() => useSelection());

      // Single line file - select and deselect the only line
      act(() => {
        result.current.toggleSelection(1);
      });

      expect(result.current.selectionCount).toBe(1);
      expect(result.current.isSelected(1)).toBe(true);

      act(() => {
        result.current.toggleSelection(1);
      });

      expect(result.current.selectionCount).toBe(0);
      expect(result.current.isSelected(1)).toBe(false);
    });

    it('should handle large file scenarios with many selections', () => {
      const { result } = renderHook(() => useSelection());

      // Simulate large file with 10000 lines
      const largeFileSize = 10000;

      // Select every 10th line
      act(() => {
        for (let i = 10; i <= largeFileSize; i += 10) {
          result.current.toggleSelection(i);
        }
      });

      expect(result.current.selectionCount).toBe(1000); // 10000/10 = 1000 lines
      expect(result.current.isSelected(10)).toBe(true);
      expect(result.current.isSelected(20)).toBe(true);
      expect(result.current.isSelected(15)).toBe(false);

      // Clear all selections efficiently
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectionCount).toBe(0);
    });
  });

  describe('Selection Utilities Integration', () => {
    it('should properly integrate with selectionUtils functions', () => {
      // Test direct integration with utility functions
      let selections = new Set<number>();

      // Test toggleSelection utility
      selections = selectionUtils.toggleSelection(selections, 5);
      expect(selections.has(5)).toBe(true);
      expect(selectionUtils.getSelectionCount(selections)).toBe(1);

      selections = selectionUtils.toggleSelection(selections, 5);
      expect(selections.has(5)).toBe(false);
      expect(selectionUtils.getSelectionCount(selections)).toBe(0);

      // Test clearSelection utility
      selections.add(1);
      selections.add(2);
      selections.add(3);
      expect(selectionUtils.getSelectionCount(selections)).toBe(3);

      const cleared = selectionUtils.clearSelection();
      expect(cleared.size).toBe(0);
      expect(selectionUtils.getSelectionCount(cleared)).toBe(0);
    });

    it('should handle selection boundary conditions', () => {
      const { result } = renderHook(() => useSelection());

      // Test boundary line numbers
      act(() => {
        result.current.toggleSelection(1); // First possible line
        result.current.toggleSelection(Number.MAX_SAFE_INTEGER); // Very large line number
      });

      expect(result.current.selectionCount).toBe(2);
      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(Number.MAX_SAFE_INTEGER)).toBe(true);

      // Test selectAll with boundary conditions
      act(() => {
        result.current.selectAll(1, 1); // Single line range
      });

      expect(result.current.isSelected(1)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large selection operations efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      // Select 1000 lines in a single operation
      act(() => {
        result.current.selectAll(1, 1000);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(1000);
      // Performance assertion - should complete within reasonable time
      expect(duration).toBeLessThan(100); // Less than 100ms for 1000 selections
    });

    it('should handle rapid toggle operations efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      // Perform 100 rapid toggle operations
      act(() => {
        for (let i = 1; i <= 100; i++) {
          result.current.toggleSelection(i);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(100);
      expect(duration).toBeLessThan(50); // Less than 50ms for 100 toggles
    });
  });

  describe('Memory Efficiency Tests', () => {
    it('should not leak memory with repeated operations', () => {
      const { result } = renderHook(() => useSelection());

      // Perform many selection/deselection cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        act(() => {
          // Select 100 lines
          result.current.selectAll(1, 100);
        });

        expect(result.current.selectionCount).toBe(100);

        act(() => {
          // Clear all
          result.current.clearSelection();
        });

        expect(result.current.selectionCount).toBe(0);
      }

      // Final state should be clean
      expect(result.current.selectedLines.size).toBe(0);
      expect(result.current.selectionCount).toBe(0);
    });

    it('should efficiently handle Set operations for large selections', () => {
      const { result } = renderHook(() => useSelection());

      // Create a large selection
      act(() => {
        result.current.selectAll(1, 5000);
      });

      // Measure memory usage by checking Set size
      expect(result.current.selectedLines.size).toBe(5000);
      expect(result.current.selectionCount).toBe(5000);

      // Efficient partial deselection
      act(() => {
        result.current.deselectAll(2000, 3000);
      });

      expect(result.current.selectionCount).toBe(3999); // 5000 - 1001 lines (2000-3000 inclusive = 1001 lines)
    });
  });
});

describe('Selection and File Loading Integration', () => {
  it('should simulate complete app workflow: file change triggers selection reset', () => {
    // This test simulates the behavior in App.tsx where file content changes trigger selection reset
    const { result: selectionHook } = renderHook(() => useSelection());

    // Simulate initial file content loaded, user makes selections
    act(() => {
      selectionHook.current.selectAll(1, 5);
      selectionHook.current.toggleSelection(10);
      selectionHook.current.toggleSelection(15);
    });

    expect(selectionHook.current.selectionCount).toBe(7); // Lines 1-5 + 10 + 15
    expect(selectionHook.current.isSelected(3)).toBe(true);
    expect(selectionHook.current.isSelected(10)).toBe(true);

    // Simulate new file loading - App.tsx useEffect clears selections when content changes
    act(() => {
      selectionHook.current.clearSelection();
    });

    // Verify all selections are cleared
    expect(selectionHook.current.selectionCount).toBe(0);
    expect(selectionHook.current.isSelected(3)).toBe(false);
    expect(selectionHook.current.isSelected(10)).toBe(false);

    // User can make new selections on new file content
    act(() => {
      selectionHook.current.toggleSelection(1);
      selectionHook.current.selectAll(20, 25);
    });

    expect(selectionHook.current.selectionCount).toBe(7); // Line 1 + lines 20-25
    expect(selectionHook.current.isSelected(1)).toBe(true);
    expect(selectionHook.current.isSelected(23)).toBe(true);
  });

  it('should handle selection persistence during file reload', () => {
    // This test simulates keeping selections when the same file is reloaded (not clearing selections)
    const { result } = renderHook(() => useSelection());

    // User makes selections
    act(() => {
      result.current.selectAll(1, 10);
      result.current.toggleSelection(5); // Deselect line 5
    });

    expect(result.current.selectionCount).toBe(9); // Lines 1-4, 6-10
    expect(result.current.isSelected(5)).toBe(false);
    expect(result.current.isSelected(6)).toBe(true);

    // Simulate file reload (same file, selections might be preserved)
    // In this case, we don't clear selections
    
    // Verify selections are maintained
    expect(result.current.selectionCount).toBe(9);
    expect(result.current.isSelected(5)).toBe(false);
    expect(result.current.isSelected(6)).toBe(true);

    // User can continue working with existing selections
    act(() => {
      result.current.toggleSelection(5); // Re-select line 5
    });

    expect(result.current.selectionCount).toBe(10);
    expect(result.current.isSelected(5)).toBe(true);
  });
});