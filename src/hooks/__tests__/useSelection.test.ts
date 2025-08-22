import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection.js';

describe('useSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useSelection());

    expect(result.current.selectedLines.size).toBe(0);
    expect(result.current.selectionCount).toBe(0);
    expect(result.current.isSelected(1)).toBe(false);
  });

  it('should toggle line selection', () => {
    const { result } = renderHook(() => useSelection());

    // Select line 5
    act(() => {
      result.current.toggleSelection(5);
    });

    expect(result.current.isSelected(5)).toBe(true);
    expect(result.current.selectionCount).toBe(1);

    // Deselect line 5
    act(() => {
      result.current.toggleSelection(5);
    });

    expect(result.current.isSelected(5)).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should select multiple lines', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelection(1);
      result.current.toggleSelection(3);
      result.current.toggleSelection(5);
    });

    expect(result.current.selectionCount).toBe(3);
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(false);
    expect(result.current.isSelected(3)).toBe(true);
    expect(result.current.isSelected(5)).toBe(true);
  });

  it('should select all lines within range', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.selectAll(1, 5);
    });

    expect(result.current.selectionCount).toBe(5);
    for (let i = 1; i <= 5; i++) {
      expect(result.current.isSelected(i)).toBe(true);
    }
  });

  it('should deselect all lines within range', () => {
    const { result } = renderHook(() => useSelection());

    // First select lines 1-10
    act(() => {
      result.current.selectAll(1, 10);
    });

    expect(result.current.selectionCount).toBe(10);

    // Then deselect lines 3-7
    act(() => {
      result.current.deselectAll(3, 7);
    });

    expect(result.current.selectionCount).toBe(5);
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(3)).toBe(false);
    expect(result.current.isSelected(4)).toBe(false);
    expect(result.current.isSelected(5)).toBe(false);
    expect(result.current.isSelected(6)).toBe(false);
    expect(result.current.isSelected(7)).toBe(false);
    expect(result.current.isSelected(8)).toBe(true);
    expect(result.current.isSelected(9)).toBe(true);
    expect(result.current.isSelected(10)).toBe(true);
  });

  it('should clear all selections', () => {
    const { result } = renderHook(() => useSelection());

    // Select multiple lines
    act(() => {
      result.current.selectAll(1, 10);
    });

    expect(result.current.selectionCount).toBe(10);

    // Clear all selections
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectionCount).toBe(0);
    expect(result.current.selectedLines.size).toBe(0);
    for (let i = 1; i <= 10; i++) {
      expect(result.current.isSelected(i)).toBe(false);
    }
  });

  it('should handle edge cases for line numbers', () => {
    const { result } = renderHook(() => useSelection());

    // Test with line 0 (should work)
    act(() => {
      result.current.toggleSelection(0);
    });

    expect(result.current.isSelected(0)).toBe(true);

    // Test with negative line (should work but unusual)
    act(() => {
      result.current.toggleSelection(-1);
    });

    expect(result.current.isSelected(-1)).toBe(true);
    expect(result.current.selectionCount).toBe(2);
  });

  it('should maintain referential stability of actions', () => {
    const { result, rerender } = renderHook(() => useSelection());

    const initialActions = {
      toggleSelection: result.current.toggleSelection,
      selectAll: result.current.selectAll,
      deselectAll: result.current.deselectAll,
      clearSelection: result.current.clearSelection,
    };

    // Trigger a state change
    act(() => {
      result.current.toggleSelection(1);
    });

    rerender();

    // Actions should maintain referential stability (except isSelected which depends on state)
    expect(result.current.toggleSelection).toBe(initialActions.toggleSelection);
    expect(result.current.selectAll).toBe(initialActions.selectAll);
    expect(result.current.deselectAll).toBe(initialActions.deselectAll);
    expect(result.current.clearSelection).toBe(initialActions.clearSelection);
  });
});