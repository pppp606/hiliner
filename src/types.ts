/**
 * Type definitions for hiliner
 */

/**
 * Represents a line specification (e.g., "5", "1-3", "10+2")
 */
export interface LineSpec {
  /** Starting line number (1-based) */
  start: number;
  /** Ending line number (1-based, inclusive) */
  end: number;
  /** Original specification string */
  original: string;
}

/**
 * Options for highlighting lines
 */
export interface HighlightOptions {
  /** Character(s) to use for highlighting (default: ">") */
  marker?: string;
  /** Whether to show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Whether to show relative line numbers from highlighted sections (default: false) */
  relativeLineNumbers?: boolean;
  /** Context lines to show before and after highlighted sections (default: 0) */
  context?: number;
}

/**
 * CLI arguments interface
 */
export interface CLIArgs {
  /** Input file path */
  file?: string;
  /** Line specifications (e.g., ["1", "5-10", "15+3"]) */
  lines?: string[];
  /** Output file path (optional, defaults to stdout) */
  output?: string;
  /** Highlight marker character(s) */
  marker?: string;
  /** Show line numbers */
  lineNumbers?: boolean;
  /** Use relative line numbers */
  relative?: boolean;
  /** Context lines around highlighted sections */
  context?: number;
  /** Show help */
  help?: boolean;
  /** Show version */
  version?: boolean;
  /** Enable debug mode */
  debug?: boolean;
}
