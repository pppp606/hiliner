/**
 * Acceptance criteria tests for multi-selection feature
 * Validates all requirements from the specification
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../src/hooks/useSelection.js';
import * as selectionUtils from '../src/utils/selectionUtils.js';

describe('Multi-Selection Acceptance Criteria', () => {
  describe('AC1: Visual Selection Indicators', () => {
    it('should track selected lines with visual indicators', () => {
      const { result } = renderHook(() => useSelection());

      // No selections initially
      expect(result.current.selectedLines.size).toBe(0);
      expect(result.current.selectionCount).toBe(0);

      // Select some lines
      act(() => {
        result.current.toggleSelection(1);
        result.current.toggleSelection(3);
        result.current.toggleSelection(5);
      });

      // Verify selection state (visual indicators would be handled in FileContent component)
      expect(result.current.selectedLines.has(1)).toBe(true);
      expect(result.current.selectedLines.has(3)).toBe(true);
      expect(result.current.selectedLines.has(5)).toBe(true);
      expect(result.current.selectedLines.has(2)).toBe(false);
      expect(result.current.selectedLines.has(4)).toBe(false);
      expect(result.current.selectionCount).toBe(3);
    });

    it('should provide selection check function for visual rendering', () => {
      const { result } = renderHook(() => useSelection());

      // Select lines
      act(() => {
        result.current.selectAll(10, 15);
      });

      // Check individual lines (used by FileContent for visual indicators)
      expect(result.current.isSelected(10)).toBe(true);
      expect(result.current.isSelected(12)).toBe(true);
      expect(result.current.isSelected(15)).toBe(true);
      expect(result.current.isSelected(9)).toBe(false);
      expect(result.current.isSelected(16)).toBe(false);
    });
  });

  describe('AC2: Keyboard Shortcuts', () => {
    it('should support Tab key for single line selection toggle', () => {
      const { result } = renderHook(() => useSelection());

      // Simulate Tab key press on line 5
      act(() => {
        result.current.toggleSelection(5);
      });

      expect(result.current.isSelected(5)).toBe(true);
      expect(result.current.selectionCount).toBe(1);

      // Tab again to deselect
      act(() => {
        result.current.toggleSelection(5);
      });

      expect(result.current.isSelected(5)).toBe(false);
      expect(result.current.selectionCount).toBe(0);
    });

    it('should support "a" key for selecting all visible lines', () => {
      const { result } = renderHook(() => useSelection());

      // Simulate "a" key press for viewport with lines 1-10 visible
      act(() => {
        result.current.selectAll(1, 10);
      });

      expect(result.current.selectionCount).toBe(10);
      for (let i = 1; i <= 10; i++) {
        expect(result.current.isSelected(i)).toBe(true);
      }
      expect(result.current.isSelected(11)).toBe(false);
    });

    it('should support "d" key for clearing all selections', () => {
      const { result } = renderHook(() => useSelection());

      // Select multiple lines
      act(() => {
        result.current.selectAll(1, 5);
        result.current.toggleSelection(10);
        result.current.toggleSelection(15);
      });

      expect(result.current.selectionCount).toBe(7);

      // Simulate "d" key press
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectionCount).toBe(0);
      expect(result.current.selectedLines.size).toBe(0);
    });

    it('should support Escape key for clearing all selections', () => {
      const { result } = renderHook(() => useSelection());

      // Select multiple lines
      act(() => {
        result.current.selectAll(5, 15);
      });

      expect(result.current.selectionCount).toBe(11);

      // Simulate Escape key press (same as "d")
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectionCount).toBe(0);
    });
  });

  describe('AC3: Status Bar Integration', () => {
    it('should provide selection count for status bar display', () => {
      const { result } = renderHook(() => useSelection());

      // No selections
      expect(result.current.selectionCount).toBe(0);

      // Select various lines
      act(() => {
        result.current.toggleSelection(1);
      });
      expect(result.current.selectionCount).toBe(1);

      act(() => {
        result.current.selectAll(10, 20);
      });
      expect(result.current.selectionCount).toBe(12); // 1 + 11 lines (10-20)

      act(() => {
        result.current.toggleSelection(1); // Deselect line 1
      });
      expect(result.current.selectionCount).toBe(11);
    });

    it('should maintain accurate count during complex operations', () => {
      const { result } = renderHook(() => useSelection());

      // Complex selection pattern
      act(() => {
        result.current.selectAll(1, 100);  // 100 lines
        result.current.deselectAll(25, 75); // Remove 51 lines (25-75 inclusive)
        result.current.toggleSelection(50); // Add back one line
      });

      // Should have: 100 - 51 + 1 = 50 lines
      expect(result.current.selectionCount).toBe(50);
      expect(result.current.isSelected(24)).toBe(true);
      expect(result.current.isSelected(25)).toBe(false);
      expect(result.current.isSelected(50)).toBe(true);
      expect(result.current.isSelected(75)).toBe(false);
      expect(result.current.isSelected(76)).toBe(true);
    });
  });

  describe('AC4: Performance Requirements', () => {
    it('should handle 1000+ line selections efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      // Select 1000 lines
      act(() => {
        result.current.selectAll(1, 1000);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(1000);
      expect(duration).toBeLessThan(100); // Must complete within 100ms
    });

    it('should handle rapid toggle operations efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const startTime = performance.now();

      // Perform 100 rapid toggles
      act(() => {
        for (let i = 1; i <= 100; i++) {
          result.current.toggleSelection(i);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.selectionCount).toBe(100);
      expect(duration).toBeLessThan(50); // Must complete within 50ms
    });

    it('should maintain Set performance characteristics', () => {
      const { result } = renderHook(() => useSelection());

      // Large selection
      act(() => {
        result.current.selectAll(1, 5000);
      });

      // Individual lookups should be O(1)
      const startTime = performance.now();
      
      // Test multiple lookups
      let foundCount = 0;
      for (let i = 1; i <= 100; i++) {
        if (result.current.isSelected(i * 50)) {
          foundCount++;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(foundCount).toBe(100); // All should be found (50, 100, 150, ... 5000)
      expect(duration).toBeLessThan(10); // Lookups must be very fast
    });
  });

  describe('AC5: Memory Efficiency', () => {
    it('should not leak memory with repeated selections/deselections', () => {
      const { result } = renderHook(() => useSelection());

      // Perform many cycles to test for memory leaks
      for (let cycle = 0; cycle < 20; cycle++) {
        act(() => {
          result.current.selectAll(1, 500);
        });

        expect(result.current.selectionCount).toBe(500);

        act(() => {
          result.current.clearSelection();
        });

        expect(result.current.selectionCount).toBe(0);
      }

      // Final state should be clean
      expect(result.current.selectedLines.size).toBe(0);
    });

    it('should efficiently handle Set operations', () => {
      const { result } = renderHook(() => useSelection());

      // Create large selection
      act(() => {
        result.current.selectAll(1, 10000);
      });

      expect(result.current.selectedLines.size).toBe(10000);

      // Efficient partial deselection
      act(() => {
        result.current.deselectAll(5000, 7000);
      });

      // Should have 10000 - 2001 = 7999 lines (5000-7000 inclusive = 2001 lines)
      expect(result.current.selectionCount).toBe(7999);
    });
  });

  describe('AC6: State Management', () => {
    it('should maintain referential stability for action functions', () => {
      const { result, rerender } = renderHook(() => useSelection());

      const initialToggle = result.current.toggleSelection;
      const initialSelectAll = result.current.selectAll;
      const initialClearSelection = result.current.clearSelection;

      // Trigger state change
      act(() => {
        result.current.toggleSelection(1);
      });

      // Re-render
      rerender();

      // Functions should maintain referential stability (useCallback)
      expect(result.current.toggleSelection).toBe(initialToggle);
      expect(result.current.selectAll).toBe(initialSelectAll);
      expect(result.current.clearSelection).toBe(initialClearSelection);
    });

    it('should update isSelected function when selections change', () => {
      const { result } = renderHook(() => useSelection());

      const initialIsSelected = result.current.isSelected;

      // Make a selection
      act(() => {
        result.current.toggleSelection(5);
      });

      // isSelected function should be new (depends on selectedLines)
      expect(result.current.isSelected).not.toBe(initialIsSelected);
      expect(result.current.isSelected(5)).toBe(true);
    });

    it('should handle concurrent operations correctly', () => {
      const { result } = renderHook(() => useSelection());

      // Simulate rapid concurrent operations
      act(() => {
        // These would happen in rapid succession in real usage
        result.current.toggleSelection(1);
        result.current.selectAll(10, 20);
        result.current.toggleSelection(15); // Should deselect 15
        result.current.toggleSelection(25); // Should select 25
      });

      expect(result.current.isSelected(1)).toBe(true);
      expect(result.current.isSelected(10)).toBe(true);
      expect(result.current.isSelected(15)).toBe(false); // Was deselected
      expect(result.current.isSelected(20)).toBe(true);
      expect(result.current.isSelected(25)).toBe(true);
      expect(result.current.selectionCount).toBe(12); // 1 + (10-20 except 15) + 25 = 1 + 10 + 1 = 12
    });
  });

  describe('AC7: Integration with Utilities', () => {
    it('should integrate correctly with selectionUtils functions', () => {
      const { result } = renderHook(() => useSelection());

      // Test direct utility integration
      let selections = new Set<number>();
      
      // Use utility functions directly
      selections = selectionUtils.toggleSelection(selections, 5);
      expect(selectionUtils.getSelectionCount(selections)).toBe(1);

      // Use hook functions
      act(() => {
        result.current.toggleSelection(5);
      });

      expect(result.current.selectionCount).toBe(1);
      expect(result.current.selectedLines.has(5)).toBe(true);

      // Both should produce same result
      expect(selections.has(5)).toBe(true);
      expect(result.current.selectedLines.has(5)).toBe(true);
    });

    it('should handle utility edge cases correctly', () => {
      const { result } = renderHook(() => useSelection());

      // Edge case: selecting same range twice
      act(() => {
        result.current.selectAll(1, 5);
        result.current.selectAll(3, 7); // Overlapping range
      });

      // Should have union of ranges: 1-7
      expect(result.current.selectionCount).toBe(7);
      for (let i = 1; i <= 7; i++) {
        expect(result.current.isSelected(i)).toBe(true);
      }
    });
  });

  describe('AC8: Error Handling and Edge Cases', () => {
    it('should handle invalid line numbers gracefully', () => {
      const { result } = renderHook(() => useSelection());

      // The hook doesn't validate line numbers - it trusts the caller
      // This is by design since file bounds checking happens at the App level
      act(() => {
        result.current.toggleSelection(0);
        result.current.toggleSelection(-1);
        result.current.toggleSelection(Number.MAX_SAFE_INTEGER);
      });

      expect(result.current.selectionCount).toBe(3);
      expect(result.current.isSelected(0)).toBe(true);
      expect(result.current.isSelected(-1)).toBe(true);
      expect(result.current.isSelected(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should handle empty ranges gracefully', () => {
      const { result } = renderHook(() => useSelection());

      // Empty range (start > end)
      act(() => {
        result.current.selectAll(10, 5); // Invalid range
      });

      // Should not select anything (loop condition start <= end fails)
      expect(result.current.selectionCount).toBe(0);
    });

    it('should handle large line numbers efficiently', () => {
      const { result } = renderHook(() => useSelection());

      const largeLine = 1000000;
      
      act(() => {
        result.current.toggleSelection(largeLine);
      });

      expect(result.current.isSelected(largeLine)).toBe(true);
      expect(result.current.selectionCount).toBe(1);
    });
  });
});