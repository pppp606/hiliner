import {
  toggleSelection,
  selectAll,
  deselectAll,
  clearSelection,
  isSelected,
  getSelectionCount,
} from '../selectionUtils';

describe('selectionUtils', () => {
  describe('toggleSelection', () => {
    it('should add line to empty selection', () => {
      const selections = new Set<number>();
      const result = toggleSelection(selections, 5);
      
      expect(result).toEqual(new Set([5]));
      expect(result).not.toBe(selections); // Should return new Set
    });

    it('should add line to existing selection', () => {
      const selections = new Set([1, 3, 7]);
      const result = toggleSelection(selections, 5);
      
      expect(result).toEqual(new Set([1, 3, 5, 7]));
      expect(result).not.toBe(selections); // Should return new Set
    });

    it('should remove line from selection if already selected', () => {
      const selections = new Set([1, 3, 5, 7]);
      const result = toggleSelection(selections, 5);
      
      expect(result).toEqual(new Set([1, 3, 7]));
      expect(result).not.toBe(selections); // Should return new Set
    });

    it('should handle line number 0', () => {
      const selections = new Set<number>();
      const result = toggleSelection(selections, 0);
      
      expect(result).toEqual(new Set([0]));
    });

    it('should handle negative line numbers', () => {
      const selections = new Set<number>();
      const result = toggleSelection(selections, -1);
      
      expect(result).toEqual(new Set([-1]));
    });
  });

  describe('selectAll', () => {
    it('should create selection for all lines from 1 to totalLines', () => {
      const result = selectAll(5);
      
      expect(result).toEqual(new Set([1, 2, 3, 4, 5]));
    });

    it('should handle single line file', () => {
      const result = selectAll(1);
      
      expect(result).toEqual(new Set([1]));
    });

    it('should handle zero lines', () => {
      const result = selectAll(0);
      
      expect(result).toEqual(new Set());
    });

    it('should handle negative total lines', () => {
      const result = selectAll(-1);
      
      expect(result).toEqual(new Set());
    });

    it('should create new Set each time', () => {
      const result1 = selectAll(3);
      const result2 = selectAll(3);
      
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('deselectAll', () => {
    it('should return empty Set', () => {
      const result = deselectAll();
      
      expect(result).toEqual(new Set());
    });

    it('should create new Set each time', () => {
      const result1 = deselectAll();
      const result2 = deselectAll();
      
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('clearSelection', () => {
    it('should return empty Set', () => {
      const result = clearSelection();
      
      expect(result).toEqual(new Set());
    });

    it('should create new Set each time', () => {
      const result1 = clearSelection();
      const result2 = clearSelection();
      
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('isSelected', () => {
    it('should return true for selected line', () => {
      const selections = new Set([1, 3, 5]);
      
      expect(isSelected(selections, 3)).toBe(true);
    });

    it('should return false for unselected line', () => {
      const selections = new Set([1, 3, 5]);
      
      expect(isSelected(selections, 4)).toBe(false);
    });

    it('should return false for empty selection', () => {
      const selections = new Set<number>();
      
      expect(isSelected(selections, 1)).toBe(false);
    });

    it('should handle line number 0', () => {
      const selections = new Set([0, 1, 2]);
      
      expect(isSelected(selections, 0)).toBe(true);
    });

    it('should handle negative line numbers', () => {
      const selections = new Set([-1, 1, 2]);
      
      expect(isSelected(selections, -1)).toBe(true);
      expect(isSelected(selections, -2)).toBe(false);
    });
  });

  describe('getSelectionCount', () => {
    it('should return correct count for non-empty selection', () => {
      const selections = new Set([1, 3, 5, 7, 9]);
      
      expect(getSelectionCount(selections)).toBe(5);
    });

    it('should return 0 for empty selection', () => {
      const selections = new Set<number>();
      
      expect(getSelectionCount(selections)).toBe(0);
    });

    it('should return 1 for single selection', () => {
      const selections = new Set([42]);
      
      expect(getSelectionCount(selections)).toBe(1);
    });

    it('should handle selections with negative numbers', () => {
      const selections = new Set([-1, 0, 1]);
      
      expect(getSelectionCount(selections)).toBe(3);
    });
  });

  describe('edge cases and immutability', () => {
    it('should not modify original Set in toggleSelection', () => {
      const original = new Set([1, 2, 3]);
      const originalCopy = new Set(original);
      
      toggleSelection(original, 4);
      
      expect(original).toEqual(originalCopy);
    });

    it('should handle very large line numbers', () => {
      const selections = new Set<number>();
      const largeNumber = Number.MAX_SAFE_INTEGER;
      
      const result = toggleSelection(selections, largeNumber);
      expect(result.has(largeNumber)).toBe(true);
      expect(isSelected(result, largeNumber)).toBe(true);
    });

    it('should handle very large total lines in selectAll', () => {
      // Test with a reasonable large number to avoid memory issues
      const totalLines = 1000;
      const result = selectAll(totalLines);
      
      expect(getSelectionCount(result)).toBe(totalLines);
      expect(isSelected(result, 1)).toBe(true);
      expect(isSelected(result, totalLines)).toBe(true);
      expect(isSelected(result, totalLines + 1)).toBe(false);
    });
  });
});