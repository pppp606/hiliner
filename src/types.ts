/**
 * Type definitions for hiliner
 * 
 * This file contains all shared TypeScript interfaces and types
 * used throughout the hiliner application for type safety and consistency.
 */


/**
 * CLI arguments interface for interactive mode only
 */
export interface CLIArgs {
  /** Input file path */
  file?: string;
  /** Syntax highlighting theme name (default: 'dark-plus') */
  theme?: string;
  /** Show help */
  help?: boolean;
  /** Show version */
  version?: boolean;
  /** Enable debug mode */
  debug?: boolean;
}

// ========================================
// Selection System Types
// ========================================

/**
 * Represents the current selection state in the file viewer.
 * 
 * Tracks which lines are selected and provides metadata about the selection.
 * All line numbers are 1-based to match user expectations and editor conventions.
 * 
 * @example
 * ```ts
 * const state: SelectionState = {
 *   selectedLines: new Set([1, 3, 5]),
 *   selectionCount: 3,
 *   lastSelectedLine: 5
 * };
 * ```
 */
export interface SelectionState {
  /** Set of currently selected line numbers (1-based indexing) */
  selectedLines: Set<number>;
  /** Total count of selected lines (must equal selectedLines.size) */
  selectionCount: number;
  /** Last line that was selected, used for range operations (1-based, optional) */
  lastSelectedLine?: number;
}

/**
 * Return type for the useSelection hook.
 * 
 * Provides all selection state and operations for file viewer components.
 * All functions maintain referential stability using useCallback to prevent
 * unnecessary re-renders in components that consume this hook.
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
export interface UseSelectionReturn {
  /** Current set of selected line numbers (1-based indexing) */
  selectedLines: Set<number>;
  /** Total number of selected lines (equals selectedLines.size) */
  selectionCount: number;
  /** Toggle selection state of a specific line (1-based line number) */
  toggleSelection: (line: number) => void;
  /** Select all lines within a range, inclusive (1-based line numbers) */
  selectAll: (start: number, end: number) => void;
  /** Deselect all lines within a range, inclusive (1-based line numbers) */
  deselectAll: (start: number, end: number) => void;
  /** Clear all selections, resetting to empty state */
  clearSelection: () => void;
  /** Check if a specific line is currently selected (1-based line number) */
  isSelected: (line: number) => boolean;
}

// ========================================
// File Data Types
// ========================================

/**
 * Represents file content and metadata for display components.
 * 
 * Provides a consistent interface for file data across all viewers.
 * The content is available in both raw string form and as an array of lines
 * for different display needs.
 * 
 * @example
 * ```ts
 * const fileData: FileData = {
 *   content: "line1\nline2\nline3",
 *   lines: ["line1", "line2", "line3"],
 *   totalLines: 3,
 *   filePath: "/path/to/file.txt",
 *   metadata: {
 *     size: 42,
 *     encoding: "utf8",
 *     isBinary: false
 *   }
 * };
 * ```
 */
export interface FileData {
  /** Raw file content as a single string with original line endings */
  content: string;
  /** File content split into individual lines (without line ending characters) */
  lines: string[];
  /** Total number of lines in the file (must equal lines.length) */
  totalLines: number;
  /** Absolute path to the source file */
  filePath: string;
  /** Optional metadata about the file (size, encoding, etc.) */
  metadata?: FileMetadata;
}

/**
 * Additional metadata about a loaded file.
 * 
 * Provides extra information that may be useful for display or processing decisions.
 * All fields are optional as not all metadata may be available or relevant.
 */
export interface FileMetadata {
  /** File size in bytes */
  size?: number;
  /** File encoding (e.g., 'utf8', 'ascii', 'latin1') */
  encoding?: string;
  /** Whether the file appears to be binary content */
  isBinary?: boolean;
  /** File modification timestamp */
  lastModified?: Date;
  /** Detected programming language for syntax highlighting */
  detectedLanguage?: string;
  /** Confidence score for language detection (0-1) */
  languageConfidence?: number;
}

// ========================================
// Component Props Types
// ========================================

/**
 * Props for the main App component.
 * 
 * The App component is the root of the interactive file viewer application.
 * It manages the overall application state and coordinates between subcomponents.
 */
export interface AppProps {
  /** Path to the file to display (absolute or relative to current working directory) */
  filePath?: string;
  /** Syntax highlighting theme name (default: 'dark-plus') */
  theme?: string;
}

/**
 * Props for the FileViewer component.
 * 
 * Handles the main file display viewport with scrolling and cursor management.
 * Acts as a container that manages the visible portion of file content and
 * coordinates with the FileContent component for actual rendering.
 * 
 * @example
 * ```tsx
 * <FileViewer
 *   fileData={fileData}
 *   scrollPosition={0}
 *   cursorPosition={5}
 *   selectedLines={new Set([1, 3, 5])}
 *   onScrollChange={(pos) => setScrollPosition(pos)}
 * />
 * ```
 */
export interface FileViewerProps {
  /** File data to display, null when no file is loaded */
  fileData: FileData | null;
  /** Current scroll position (0-based line index within the file) */
  scrollPosition?: number;
  /** Current cursor position (0-based line index within the file) */
  cursorPosition?: number;
  /** Callback fired when scroll position changes (receives 0-based line index) */
  onScrollChange?: (position: number) => void;
  /** Whether the viewer has focus for keyboard input */
  isFocused?: boolean;
  /** Set of currently selected line numbers (1-based indexing) */
  selectedLines?: Set<number>;
  /** Syntax highlighting theme */
  theme?: string;
}

/**
 * Props for the FileContent component.
 * 
 * Handles the actual rendering of file lines with highlighting and selection.
 * This component is optimized for performance with minimal re-renders and
 * uses a single-text-block approach for efficient terminal rendering.
 * 
 * Note: Line numbers use different bases for different purposes:
 * - Display line numbers (startLineNumber, highlightLine): 1-based (user-facing)
 * - Internal offsets (scrollOffset): 0-based (array indices)
 * - Selection tracking (selectedLines): 1-based (consistent with display)
 * 
 * @example
 * ```tsx
 * <FileContent
 *   lines={["line1", "line2", "line3"]}
 *   showLineNumbers={true}
 *   startLineNumber={1}
 *   highlightLine={2}
 *   selectedLines={new Set([1, 3])}
 * />
 * ```
 */
export interface FileContentProps {
  /** Array of lines to display, null when no content available */
  lines: string[] | null;
  /** Whether to show line numbers in the left margin (default: true) */
  showLineNumbers?: boolean;
  /** Starting line number for display (1-based, default: 1) */
  startLineNumber?: number;
  /** Scroll offset within the content array (0-based, default: 0) */
  scrollOffset?: number;
  /** Maximum height of the viewport in lines */
  viewportHeight?: number;
  /** Current line number (1-based, for context) */
  currentLine?: number;
  /** Line to highlight within the visible viewport (1-based relative to startLineNumber) */
  highlightLine?: number;
  /** Array of additional highlighted line numbers (1-based absolute) */
  highlightedLines?: number[];
  /** Set of selected line numbers for multi-selection (1-based absolute) */
  selectedLines?: Set<number>;
  /** Enable syntax highlighting (future feature) */
  enableSyntaxHighlighting?: boolean;
  /** Programming language for syntax highlighting (e.g., 'javascript', 'python') */
  language?: string;
  /** Maximum width for line content (truncates with '...' if exceeded) */
  maxWidth?: number;
  /** Horizontal scroll offset for wide content (character-based) */
  horizontalOffset?: number;
  /** UI theme identifier for styling (future feature) */
  theme?: string;
  /** Font size for content display (future feature) */
  fontSize?: string;
  /** Callback fired when a line is clicked (receives 1-based line number) */
  onLineClick?: (lineNumber: number) => void;
}

/**
 * Props for the StatusBar component.
 * Displays file information, position, and selection status.
 */
export interface StatusBarProps {
  /** Name of the current file */
  fileName?: string;
  /** Current cursor line number (1-based) */
  currentLine?: number;
  /** Total number of lines in the file */
  totalLines?: number;
  /** Current column position (0-based) */
  currentColumn?: number;
  /** First visible line in viewport (1-based) */
  viewportStart?: number;
  /** Last visible line in viewport (1-based) */
  viewportEnd?: number;
  /** File encoding (e.g., 'utf8') */
  encoding?: string;
  /** Whether the file is read-only */
  isReadOnly?: boolean;
  /** Whether the file is binary */
  isBinary?: boolean;
  /** Current application mode */
  mode?: string;
  /** Current search term */
  searchTerm?: string;
  /** Whether file is currently loading */
  isLoading?: boolean;
  /** Whether there's an error state */
  isError?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** General status message */
  message?: string;
  /** Type of status message */
  messageType?: 'success' | 'warning' | 'error';
  /** Temporary message to show briefly */
  temporaryMessage?: string;
  /** Duration to show temporary message (ms) */
  temporaryMessageDuration?: number;
  /** Whether to show navigation shortcuts */
  showNavigation?: boolean;
  /** Display mode for the status bar */
  displayMode?: 'compact' | 'full';
  /** Maximum width for the status bar */
  maxWidth?: number;
  /** UI theme identifier */
  theme?: string;
  /** Accent color for highlights */
  accentColor?: string;
  /** Font size for status text */
  fontSize?: string;
  /** Callback for shortcut key presses */
  onShortcutPress?: (shortcut: string) => void;
  /** Whether to sync state with parent component */
  syncWithParent?: boolean;
  /** Number of currently selected lines */
  selectionCount?: number;
  /** Detected programming language */
  detectedLanguage?: string;
  /** Whether syntax highlighting is enabled */
  syntaxHighlightingEnabled?: boolean;
  /** Current syntax highlighting theme */
  syntaxTheme?: string;
}
