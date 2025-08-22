/**
 * Toggles the selection state of a line number.
 * If the line is selected, it will be deselected. If not selected, it will be selected.
 * Returns a new Set without modifying the original.
 * 
 * @param selections - Current selection set
 * @param line - Line number to toggle
 * @returns New Set with the toggled selection
 */
export function toggleSelection(selections: Set<number>, line: number): Set<number> {
  const newSelections = new Set(selections);
  
  if (newSelections.has(line)) {
    newSelections.delete(line);
  } else {
    newSelections.add(line);
  }
  
  return newSelections;
}

/**
 * Creates a selection set containing all lines from 1 to totalLines (inclusive).
 * 
 * @param totalLines - Total number of lines in the file
 * @returns New Set containing all line numbers from 1 to totalLines
 */
export function selectAll(totalLines: number): Set<number> {
  const selections = new Set<number>();
  
  for (let i = 1; i <= totalLines; i++) {
    selections.add(i);
  }
  
  return selections;
}

/**
 * Creates an empty selection set (deselects all lines).
 * 
 * @returns New empty Set
 */
export function deselectAll(): Set<number> {
  return new Set<number>();
}

/**
 * Creates an empty selection set (clears all selections).
 * This is functionally identical to deselectAll but provided for semantic clarity.
 * 
 * @returns New empty Set
 */
export function clearSelection(): Set<number> {
  return new Set<number>();
}

/**
 * Checks if a specific line number is selected.
 * 
 * @param selections - Current selection set
 * @param line - Line number to check
 * @returns True if the line is selected, false otherwise
 */
export function isSelected(selections: Set<number>, line: number): boolean {
  return selections.has(line);
}

/**
 * Gets the count of selected lines.
 * 
 * @param selections - Current selection set
 * @returns Number of selected lines
 */
export function getSelectionCount(selections: Set<number>): number {
  return selections.size;
}

/**
 * Efficiently toggle multiple lines in a single operation.
 * This is much faster than calling toggleSelection repeatedly.
 * 
 * @param selections - Current selection set
 * @param lines - Array of line numbers to toggle
 * @returns New Set with all lines toggled
 */
export function toggleMultiple(selections: Set<number>, lines: number[]): Set<number> {
  const newSelections = new Set(selections);
  
  for (const line of lines) {
    if (newSelections.has(line)) {
      newSelections.delete(line);
    } else {
      newSelections.add(line);
    }
  }
  
  return newSelections;
}

/**
 * Efficiently select a range of lines.
 * 
 * @param selections - Current selection set
 * @param start - Starting line number (inclusive)
 * @param end - Ending line number (inclusive)
 * @returns New Set with the range added
 */
export function selectRange(selections: Set<number>, start: number, end: number): Set<number> {
  const newSelections = new Set(selections);
  
  for (let i = start; i <= end; i++) {
    newSelections.add(i);
  }
  
  return newSelections;
}

/**
 * Efficiently deselect a range of lines.
 * 
 * @param selections - Current selection set
 * @param start - Starting line number (inclusive)
 * @param end - Ending line number (inclusive)
 * @returns New Set with the range removed
 */
export function deselectRange(selections: Set<number>, start: number, end: number): Set<number> {
  const newSelections = new Set(selections);
  
  for (let i = start; i <= end; i++) {
    newSelections.delete(i);
  }
  
  return newSelections;
}