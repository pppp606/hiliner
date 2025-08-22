import { useState, useCallback } from 'react';
import * as selectionUtils from '../utils/selectionUtils.js';
import type { UseSelectionReturn } from '../types.js';

/**
 * Custom hook for managing line selection state in the file viewer.
 * Provides actions for toggling, selecting ranges, and clearing selections.
 * 
 * All action functions maintain referential stability using useCallback to prevent
 * unnecessary re-renders in components that consume this hook.
 * 
 * @returns Object containing selection state and actions
 * 
 * @example
 * ```tsx
 * function FileViewer() {
 *   const {
 *     selectedLines,
 *     selectionCount,
 *     toggleSelection,
 *     selectAll,
 *     isSelected
 *   } = useSelection();
 * 
 *   return (
 *     <div>
 *       <div>Selected: {selectionCount} lines</div>
 *       <button onClick={() => selectAll(1, 10)}>
 *         Select lines 1-10
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSelection(): UseSelectionReturn {
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());

  /**
   * Toggle selection state of a specific line.
   * If the line is selected, it will be deselected and vice versa.
   */
  const toggleSelection = useCallback((line: number) => {
    setSelectedLines(current => selectionUtils.toggleSelection(current, line));
  }, []);

  /**
   * Select all lines within the specified range (inclusive).
   * Existing selections outside the range are preserved.
   */
  const selectAll = useCallback((start: number, end: number) => {
    setSelectedLines(current => {
      const newSelections = new Set(current);
      for (let i = start; i <= end; i++) {
        newSelections.add(i);
      }
      return newSelections;
    });
  }, []);

  /**
   * Deselect all lines within the specified range (inclusive).
   * Existing selections outside the range are preserved.
   */
  const deselectAll = useCallback((start: number, end: number) => {
    setSelectedLines(current => {
      const newSelections = new Set(current);
      for (let i = start; i <= end; i++) {
        newSelections.delete(i);
      }
      return newSelections;
    });
  }, []);

  /**
   * Clear all selections, deselecting every line.
   */
  const clearSelection = useCallback(() => {
    setSelectedLines(selectionUtils.clearSelection());
  }, []);

  /**
   * Check if a specific line is currently selected.
   * Note: This function is recreated when selectedLines changes,
   * which is necessary for correct functionality.
   */
  const isSelected = useCallback((line: number) => {
    return selectedLines.has(line);
  }, [selectedLines]);

  const selectionCount = selectionUtils.getSelectionCount(selectedLines);

  return {
    selectedLines,
    selectionCount,
    toggleSelection,
    selectAll,
    deselectAll,
    clearSelection,
    isSelected,
  };
}