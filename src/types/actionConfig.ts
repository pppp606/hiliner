/**
 * TypeScript type definitions for Hiliner Action Configuration
 * 
 * These types correspond to the JSON Schema in src/schemas/actionConfig.schema.json
 * and provide compile-time type safety for action configuration objects.
 */

export interface ActionConfigMetadata {
  /** Human-readable name for this configuration set */
  name?: string;
  /** Description of this action configuration */
  description?: string;
  /** Author of this configuration */
  author?: string;
  /** Creation timestamp (ISO 8601 format) */
  created?: string;
  /** Last modification timestamp (ISO 8601 format) */
  modified?: string;
}

export interface ActionConfigEnvironment {
  /** Custom environment variables for action scripts */
  variables?: Record<string, string>;
  /** Default timeout for external commands (milliseconds) */
  timeout?: number;
  /** Shell to use for external commands */
  shell?: 'bash' | 'sh' | 'zsh' | 'fish' | 'cmd' | 'powershell';
}

export interface ActionWhenConditions {
  /** File extensions or types this action applies to */
  fileTypes?: string[];
  /** Whether text must be selected for this action to be available */
  hasSelection?: boolean;
  /** File line count requirements */
  lineCount?: {
    min?: number;
    max?: number;
  };
  /** Application mode this action applies to */
  mode?: 'interactive' | 'static' | 'any';
}

export interface CommandVariables {
  /** Substitute {{currentFile}} with current file path */
  currentFile?: boolean;
  /** Substitute {{currentLine}} with current line number */
  currentLine?: boolean;
  /** Substitute {{selectedLines}} with selected line numbers */
  selectedLines?: boolean;
  /** Substitute {{selectedText}} with selected text content */
  selectedText?: boolean;
  /** Substitute {{fileName}} with file name only */
  fileName?: boolean;
  /** Substitute {{fileDir}} with file directory */
  fileDir?: boolean;
}

export interface ComplexCommand {
  /** Type of command to execute */
  type: 'builtin' | 'external' | 'script' | 'sequence';
  /** Primary command to execute (required for external/script) */
  command?: string;
  /** Command arguments */
  args?: string[];
  /** Built-in hiliner function to execute */
  builtin?: 
    | 'quit'
    | 'toggleSelection'
    | 'selectAll'
    | 'clearSelection'
    | 'scrollUp'
    | 'scrollDown'
    | 'goToStart'
    | 'goToEnd'
    | 'pageUp'
    | 'pageDown'
    | 'copySelection'
    | 'saveToFile'
    | 'toggleLineNumbers'
    | 'changeTheme'
    | 'showHelp'
    | 'reload';
  /** Environment variables for this specific command */
  environment?: Record<string, string>;
  /** Working directory for external commands */
  workingDirectory?: string;
  /** Timeout for this specific command (milliseconds) */
  timeout?: number;
  /** Sequence of commands to execute in order */
  sequence?: ComplexCommand[];
  /** Command to run if this command succeeds */
  onSuccess?: string;
  /** Command to run if this command fails */
  onFailure?: string;
  /** Whether to capture and display command output */
  captureOutput?: boolean;
  /** Whether to suppress all output from this command */
  silent?: boolean;
  /** Variable substitutions available in this command */
  variables?: CommandVariables;
}

export interface ActionDefinition {
  /** Unique identifier for this action */
  id: string;
  /** Human-readable name for this action */
  name?: string;
  /** Detailed description of what this action does */
  description: string;
  /** Primary key binding for this action (single character) */
  key: string;
  /** Alternative key bindings for this action */
  alternativeKeys?: string[];
  /** Command to execute (string or complex command object) */
  script: string | ComplexCommand;
  /** Conditions under which this action is available */
  when?: ActionWhenConditions;
  /** Whether this action performs potentially harmful operations */
  dangerous?: boolean;
  /** Confirmation message to show before executing (for dangerous actions) */
  confirmPrompt?: string;
  /** Category for organizing actions in help/menus */
  category?: 'navigation' | 'selection' | 'editing' | 'file' | 'view' | 'search' | 'custom';
  /** Execution priority (higher numbers execute first) */
  priority?: number;
  /** Whether this action is enabled */
  enabled?: boolean;
}

export interface ActionConfig {
  /** JSON Schema reference URL */
  $schema?: string;
  /** Configuration schema version (semver format) */
  version?: string;
  /** Configuration metadata and information */
  metadata?: ActionConfigMetadata;
  /** Array of custom action definitions */
  actions: ActionDefinition[];
  /** Global key binding overrides (maps keys to action IDs) */
  keyBindings?: Record<string, string>;
  /** Environment variables and global configuration */
  environment?: ActionConfigEnvironment;
}

/**
 * Runtime action execution context provided to action handlers
 */
export interface ActionExecutionContext {
  /** Current file path */
  currentFile: string;
  /** Current line number (1-based) */
  currentLine: number;
  /** Current column number (0-based) */
  currentColumn: number;
  /** Array of selected line numbers (1-based) */
  selectedLines: number[];
  /** Selected text content */
  selectedText: string;
  /** File name only (without path) */
  fileName: string;
  /** Directory containing the file */
  fileDir: string;
  /** Total lines in file */
  totalLines: number;
  /** Current viewport start line (1-based) */
  viewportStart: number;
  /** Current viewport end line (1-based) */
  viewportEnd: number;
  /** Current syntax highlighting theme */
  theme: string;
  /** Whether multi-selection is active */
  hasSelection: boolean;
  /** File metadata */
  fileMetadata?: {
    size?: number;
    encoding?: string;
    isBinary?: boolean;
    detectedLanguage?: string;
  };
}

/**
 * Result returned by action execution
 */
export interface ActionExecutionResult {
  /** Whether the action executed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Output from the action (if any) */
  output?: string;
  /** Whether the UI needs to be refreshed */
  refreshRequired?: boolean;
  /** Status message to show to the user */
  message?: string;
  /** Type of message (affects display styling) */
  messageType?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Action handler function signature
 */
export type ActionHandler = (
  context: ActionExecutionContext,
  action: ActionDefinition
) => Promise<ActionExecutionResult> | ActionExecutionResult;

/**
 * Key binding validation result
 */
export interface KeyBindingValidation {
  /** Whether the key binding is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Conflicts with existing bindings */
  conflicts?: string[];
}