/**
 * Action Context system for environment variable injection
 * 
 * This module implements the environment variable generation and template substitution
 * functionality required for Issue #13. It provides functions to build action contexts
 * from current file state and selection, and substitute template variables in action scripts.
 * 
 * The system generates 8 environment variables:
 * - $SELECTED_TEXT: Newline-joined content of selected lines
 * - $FILE_PATH: Absolute path to the current file
 * - $LINE_START: First line number in selection (1-based)
 * - $LINE_END: Last line number in selection (1-based)
 * - $LANGUAGE: Detected programming language
 * - $SELECTION_COUNT: Number of selected lines
 * - $TOTAL_LINES: Total lines in the file
 * - $CURRENT_LINE: Current cursor position (1-based)
 */

import type { SelectionState, FileData } from '../types.js';

/**
 * Action context containing environment variables and template variables
 * for use in action scripts and command substitution
 */
export interface ActionContext {
  /** Environment variables for shell scripts (UPPERCASE_NAMES) */
  environmentVariables: {
    SELECTED_TEXT: string;
    FILE_PATH: string;
    LINE_START: string;
    LINE_END: string;
    LANGUAGE: string;
    SELECTION_COUNT: string;
    TOTAL_LINES: string;
    CURRENT_LINE: string;
  };
  /** Template variables for {{variable}} substitution (camelCase names) */
  templateVariables: {
    selectedText: string;
    filePath: string;
    lineStart: string;
    lineEnd: string;
    language: string;
    selectionCount: string;
    totalLines: string;
    currentLine: string;
  };
}

/**
 * Build action context from current selection state and file data
 * 
 * Generates environment variables and template variables based on the current
 * selection state and file content. Handles edge cases like empty selections,
 * out-of-bounds line numbers, and missing metadata gracefully.
 * 
 * @param selectionState Current selection state with selected lines
 * @param fileData File content and metadata
 * @param currentLine Current cursor position (1-based)
 * @returns ActionContext with generated environment and template variables
 * 
 * @example
 * ```ts
 * const context = buildActionContext(
 *   { selectedLines: new Set([1, 3, 5]), selectionCount: 3, lastSelectedLine: 5 },
 *   fileData,
 *   3
 * );
 * // context.environmentVariables.SELECTED_TEXT === "line1\nline3\nline5"
 * // context.templateVariables.lineStart === "1"
 * ```
 */
export function buildActionContext(
  selectionState: SelectionState,
  fileData: FileData,
  currentLine: number
): ActionContext {
  const { selectedLines, selectionCount } = selectionState;
  const { lines, filePath, totalLines, metadata } = fileData;

  // Generate selected text by joining selected lines with newlines
  const selectedText = generateSelectedText(selectedLines, lines);

  // Calculate line range (min and max of selected lines)
  const lineRange = calculateLineRange(selectedLines);

  // Get detected language with fallback
  const language = metadata?.detectedLanguage ?? 'unknown';

  // Create environment variables (all values as strings for shell compatibility)
  const environmentVariables = {
    SELECTED_TEXT: selectedText,
    FILE_PATH: filePath,
    LINE_START: lineRange.start.toString(),
    LINE_END: lineRange.end.toString(),
    LANGUAGE: language,
    SELECTION_COUNT: selectionCount.toString(),
    TOTAL_LINES: totalLines.toString(),
    CURRENT_LINE: currentLine.toString()
  };

  // Create template variables (mirror environment variables with camelCase naming)
  const templateVariables = {
    selectedText: environmentVariables.SELECTED_TEXT,
    filePath: environmentVariables.FILE_PATH,
    lineStart: environmentVariables.LINE_START,
    lineEnd: environmentVariables.LINE_END,
    language: environmentVariables.LANGUAGE,
    selectionCount: environmentVariables.SELECTION_COUNT,
    totalLines: environmentVariables.TOTAL_LINES,
    currentLine: environmentVariables.CURRENT_LINE
  };

  return {
    environmentVariables,
    templateVariables
  };
}

/**
 * Generate selected text by joining selected lines with newlines
 * 
 * Handles edge cases like empty selections, out-of-bounds line numbers,
 * and maintains proper line ordering even for non-contiguous selections.
 * 
 * @param selectedLines Set of selected line numbers (1-based)
 * @param lines Array of file lines (0-based indexing)
 * @returns Newline-joined text of selected lines, or empty string if no valid selection
 */
function generateSelectedText(selectedLines: Set<number>, lines: string[]): string {
  if (selectedLines.size === 0) {
    return '';
  }

  // Convert to array and sort to maintain proper order
  const sortedLines = Array.from(selectedLines).sort((a, b) => a - b);
  
  // Extract valid lines (convert from 1-based to 0-based indexing)
  const validLines: string[] = [];
  for (const lineNumber of sortedLines) {
    const arrayIndex = lineNumber - 1; // Convert to 0-based
    if (arrayIndex >= 0 && arrayIndex < lines.length) {
      validLines.push(lines[arrayIndex]);
    }
  }

  return validLines.join('\n');
}

/**
 * Calculate the line range (start and end) from selected lines
 * 
 * Returns the minimum and maximum line numbers from the selection.
 * For empty selections, returns empty strings to indicate no range.
 * 
 * @param selectedLines Set of selected line numbers (1-based)
 * @returns Object with start and end line numbers, or empty values for empty selection
 */
function calculateLineRange(selectedLines: Set<number>): { start: number | string; end: number | string } {
  if (selectedLines.size === 0) {
    return { start: '', end: '' };
  }

  const lineNumbers = Array.from(selectedLines);
  return {
    start: Math.min(...lineNumbers),
    end: Math.max(...lineNumbers)
  };
}

/**
 * Substitute template variables in a string using {{variableName}} syntax
 * 
 * Replaces all occurrences of {{variableName}} with corresponding values
 * from the action context. Unknown variables are left unchanged.
 * Supports nested braces by processing from innermost to outermost.
 * 
 * @param template String containing {{variable}} placeholders
 * @param context Action context with template variables
 * @returns String with all known variables substituted
 * 
 * @example
 * ```ts
 * const result = substituteVariables(
 *   'File: {{filePath}} ({{language}})',
 *   context
 * );
 * // result === "File: /path/to/file.js (javascript)"
 * ```
 */
export function substituteVariables(template: string, context: ActionContext): string {
  const { templateVariables } = context;
  let result = template;
  let maxIterations = 10; // Prevent infinite loops
  let iteration = 0;

  // Keep substituting until no more changes occur (handles nested braces)
  while (iteration < maxIterations) {
    const previousResult = result;
    let hasSubstitution = false;
    
    // First, try to substitute known variables using non-greedy matching
    // This finds the innermost valid variable names
    result = result.replace(/\{\{([^{}]*)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      
      // Check if the variable exists in our template variables
      if (trimmedName in templateVariables) {
        const key = trimmedName as keyof typeof templateVariables;
        hasSubstitution = true;
        return templateVariables[key];
      }

      // Return the original pattern if variable is unknown
      return match;
    });
    
    // If we made substitutions, continue to next iteration
    if (hasSubstitution) {
      iteration++;
      continue;
    }
    
    // If no substitutions were made, try to handle nested braces by unwrapping
    // Look for patterns like {{someContent}} where someContent is not a variable
    result = result.replace(/\{\{([^{}]*)\}\}/g, (match, content) => {
      // If content contains path-like characters, it's likely a substituted value
      // that should be unwrapped to {content} (remove one layer of braces)
      if (content.includes('/') || content.includes('.')) {
        return `{${content}}`;
      }
      // Otherwise leave it unchanged
      return match;
    });

    // If no changes were made, we're done
    if (result === previousResult) {
      break;
    }
    
    iteration++;
  }

  return result;
}