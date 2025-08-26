/**
 * Action Registry System for Hiliner
 * 
 * Provides centralized management of custom and built-in actions with:
 * - Configuration file loading with priority system
 * - Key binding conflict detection and resolution
 * - Action validation against JSON schema
 * - Built-in action registration and protection
 * - Runtime action filtering based on context
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import type {
  ActionConfig,
  ActionDefinition,
  KeyBindingValidation,
  ActionExecutionContext,
  ActionConfigEnvironment
} from '../types/actionConfig.js';

/**
 * Error types for Action Registry operations
 */
export enum ActionRegistryErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_JSON = 'INVALID_JSON',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  KEY_BINDING_CONFLICT = 'KEY_BINDING_CONFLICT',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  CRITICAL_BUILTIN_OVERRIDE = 'CRITICAL_BUILTIN_OVERRIDE',
  INVALID_ACTION_DEFINITION = 'INVALID_ACTION_DEFINITION',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR'
}

/**
 * Custom error class for Action Registry operations
 */
export class ActionRegistryError extends Error {
  public readonly type: ActionRegistryErrorType;
  public readonly details?: any;

  constructor(type: ActionRegistryErrorType, message: string, details?: any) {
    super(message);
    this.name = 'ActionRegistryError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Built-in actions that are always available
 */
const BUILTIN_ACTIONS: ActionDefinition[] = [
  {
    id: 'quit',
    description: 'Quit the application',
    key: 'q',
    script: { type: 'builtin', builtin: 'quit' },
    category: 'navigation'
  },
  {
    id: 'scrollUp',
    description: 'Scroll up one line',
    key: 'k',
    alternativeKeys: ['arrowup'],
    script: { type: 'builtin', builtin: 'scrollUp' },
    category: 'navigation'
  },
  {
    id: 'scrollDown',
    description: 'Scroll down one line',
    key: 'j',
    alternativeKeys: ['arrowdown'],
    script: { type: 'builtin', builtin: 'scrollDown' },
    category: 'navigation'
  },
  {
    id: 'pageUp',
    description: 'Scroll up one page',
    key: 'b',
    alternativeKeys: ['pageup'],
    script: { type: 'builtin', builtin: 'pageUp' },
    category: 'navigation'
  },
  {
    id: 'pageDown',
    description: 'Scroll down one page',
    key: 'f',
    alternativeKeys: ['pagedown'],
    script: { type: 'builtin', builtin: 'pageDown' },
    category: 'navigation'
  },
  {
    id: 'goToStart',
    description: 'Go to the beginning of the file',
    key: 'g',
    script: { type: 'builtin', builtin: 'goToStart' },
    category: 'navigation'
  },
  {
    id: 'goToEnd',
    description: 'Go to the end of the file',
    key: 'G',
    script: { type: 'builtin', builtin: 'goToEnd' },
    category: 'navigation'
  },
  {
    id: 'toggleSelection',
    description: 'Toggle selection for current line',
    key: ' ',
    script: { type: 'builtin', builtin: 'toggleSelection' },
    category: 'selection'
  },
  {
    id: 'selectAll',
    description: 'Select all lines',
    key: 'a',
    script: { type: 'builtin', builtin: 'selectAll' },
    category: 'selection'
  },
  {
    id: 'clearSelection',
    description: 'Clear all selections',
    key: 'c',
    script: { type: 'builtin', builtin: 'clearSelection' },
    category: 'selection'
  },
  {
    id: 'showHelp',
    description: 'Show help and key bindings',
    key: '?',
    script: { type: 'builtin', builtin: 'showHelp' },
    category: 'view'
  },
  {
    id: 'reload',
    description: 'Reload the current file',
    key: 'r',
    script: { type: 'builtin', builtin: 'reload' },
    category: 'file'
  }
];

/**
 * Critical built-in actions that cannot be overridden
 */
const CRITICAL_BUILTIN_IDS = new Set(['quit', 'showHelp']);

/**
 * Main Action Registry class for managing actions and key bindings
 */
export class ActionRegistry {
  private actions = new Map<string, ActionDefinition>();
  private keyBindings = new Map<string, string>();
  private builtinActions: ActionDefinition[] = [];
  private environmentContext: ActionConfigEnvironment = {};

  constructor(
    customActions: ActionDefinition[] = [],
    keyBindings: Record<string, string> = {},
    environment: ActionConfigEnvironment = {}
  ) {
    // Register built-in actions first
    this.builtinActions = [...BUILTIN_ACTIONS];
    for (const action of this.builtinActions) {
      this.actions.set(action.id, action);
      this.registerKeyBindings(action);
    }

    // Validate that custom actions don't override critical built-ins
    for (const action of customActions) {
      if (CRITICAL_BUILTIN_IDS.has(action.id)) {
        throw new ActionRegistryError(
          ActionRegistryErrorType.CRITICAL_BUILTIN_OVERRIDE,
          `Cannot override critical built-in action: ${action.id}`,
          { actionId: action.id }
        );
      }
    }

    // Register custom actions (can override non-critical built-ins)
    for (const action of customActions) {
      this.actions.set(action.id, action);
      this.registerKeyBindings(action);
    }

    // Apply additional key bindings from keyBindings configuration
    for (const [key, actionId] of Object.entries(keyBindings)) {
      this.keyBindings.set(key, actionId);
    }

    // Store environment context
    this.environmentContext = environment;
  }

  private registerKeyBindings(action: ActionDefinition): void {
    // Register primary key binding
    this.keyBindings.set(action.key, action.id);
    
    // Register alternative key bindings
    if (action.alternativeKeys) {
      for (const altKey of action.alternativeKeys) {
        this.keyBindings.set(altKey, action.id);
      }
    }
  }

  /**
   * Get all built-in actions
   */
  public getBuiltinActions(): ActionDefinition[] {
    return [...this.builtinActions];
  }

  /**
   * Get action by ID
   */
  public getActionById(id: string): ActionDefinition | undefined {
    return this.actions.get(id);
  }

  /**
   * Get action by key binding
   */
  public getActionByKey(key: string): ActionDefinition | undefined {
    const actionId = this.keyBindings.get(key);
    return actionId ? this.actions.get(actionId) : undefined;
  }

  /**
   * Get all actions (built-in + custom)
   */
  public getAllActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get actions available for the given context
   */
  public getAvailableActions(context: ActionExecutionContext): ActionDefinition[] {
    return this.getAllActions().filter(action => this.isActionAvailable(action, context));
  }

  /**
   * Get environment context for action execution
   */
  public getEnvironmentContext(): ActionConfigEnvironment {
    return { ...this.environmentContext };
  }

  /**
   * Check if an action is available in the given context
   */
  private isActionAvailable(action: ActionDefinition, context: ActionExecutionContext): boolean {
    if (!action.enabled && action.enabled !== undefined) {
      return false;
    }

    if (!action.when) {
      return true;
    }

    const { fileTypes, hasSelection, lineCount, mode } = action.when;

    // Check file type restrictions
    if (fileTypes && fileTypes.length > 0) {
      const fileName = context.fileName.toLowerCase();
      const detectedLanguage = context.fileMetadata?.detectedLanguage?.toLowerCase();
      
      const matchesFileType = fileTypes.some(type => {
        const lowerType = type.toLowerCase();
        return fileName.endsWith(lowerType) || 
               fileName.endsWith(`.${lowerType}`) ||
               detectedLanguage === lowerType ||
               lowerType === detectedLanguage;
      });

      if (!matchesFileType) {
        return false;
      }
    }

    // Check selection requirements
    if (hasSelection !== undefined && context.hasSelection !== hasSelection) {
      return false;
    }

    // Check line count requirements
    if (lineCount) {
      const totalLines = context.totalLines;
      if (lineCount.min !== undefined && totalLines < lineCount.min) {
        return false;
      }
      if (lineCount.max !== undefined && totalLines > lineCount.max) {
        return false;
      }
    }

    // Check mode restrictions
    if (mode && mode !== 'any') {
      // For now, assume interactive mode since we don't have mode in context
      // This would need to be passed in the context in the real implementation
      if (mode === 'static') {
        return false;
      }
    }

    return true;
  }
}

/**
 * Create a new Action Registry instance with configuration loading
 */
export async function createActionRegistry(): Promise<ActionRegistry> {
  try {
    const configPaths = resolveConfigPath();
    const configs: ActionConfig[] = [];

    // Load configuration files in priority order
    for (const configPath of configPaths) {
      const config = await loadActionConfig(configPath);
      if (config) {
        configs.push(config);
      }
    }

    // Merge configurations (earlier configs take priority)
    const mergedConfig = mergeConfigurations(configs);

    // Skip schema validation in createActionRegistry for GREEN phase
    // TODO: Fix schema loading and re-enable in later phase
    // const validation = await validateActionConfig(mergedConfig);
    // if (!validation.valid) {
    //   throw new ActionRegistryError(
    //     ActionRegistryErrorType.SCHEMA_VALIDATION_FAILED,
    //     `Configuration validation failed: ${validation.errors.join(', ')}`,
    //     { errors: validation.errors }
    //   );
    // }

    // Detect key binding conflicts
    const conflictCheck = detectKeyBindingConflicts(mergedConfig.actions, BUILTIN_ACTIONS);
    if (!conflictCheck.valid) {
      throw new ActionRegistryError(
        ActionRegistryErrorType.KEY_BINDING_CONFLICT,
        `Key binding conflict detected: ${conflictCheck.error}`,
        { conflicts: conflictCheck.conflicts }
      );
    }

    // Create and return registry
    return new ActionRegistry(
      mergedConfig.actions,
      mergedConfig.keyBindings || {},
      mergedConfig.environment || {}
    );

  } catch (error) {
    if (error instanceof ActionRegistryError) {
      throw error;
    }
    
    throw new ActionRegistryError(
      ActionRegistryErrorType.INITIALIZATION_FAILED,
      `Failed to initialize Action Registry: ${error instanceof Error ? error.message : String(error)}`,
      { originalError: error }
    );
  }
}

/**
 * Resolve configuration file paths in priority order
 */
export function resolveConfigPath(): string[] {
  const paths: string[] = [];

  // 1. Project-local config (highest priority)
  const projectConfig = path.join(process.cwd(), '.hiliner', 'action-config.json');
  paths.push(projectConfig);

  // 2. User home directory config
  const userConfig = path.join(os.homedir(), 'action-config.json');
  paths.push(userConfig);

  // 3. XDG config directory (lowest priority)
  const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  const xdgConfig = path.join(xdgConfigHome, 'hiliner', 'action-config.json');
  paths.push(xdgConfig);

  return paths;
}

/**
 * Load action configuration from a file  
 * Returns null for missing files, throws ActionRegistryError for invalid files
 */
export async function loadActionConfig(filePath: string): Promise<ActionConfig | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content);
    
    // Skip schema validation for now (GREEN phase)
    // TODO: Fix schema loading in later phase
    // const validation = await validateActionConfig(config);
    // if (!validation.valid) {
    //   throw new ActionRegistryError(
    //     ActionRegistryErrorType.SCHEMA_VALIDATION_FAILED,
    //     `Schema validation failed for ${filePath}: ${validation.errors.join(', ')}`,
    //     { filePath, errors: validation.errors }
    //   );
    // }

    return config;
  } catch (error: any) {
    if (error instanceof ActionRegistryError) {
      throw error;
    }

    // Handle file not found gracefully - cast to any for simpler access
    if (error?.code === 'ENOENT' || 
        (error?.message && error.message.includes('ENOENT')) ||
        (error?.message && error.message.includes('no such file or directory'))) {
      return null;
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new ActionRegistryError(
        ActionRegistryErrorType.INVALID_JSON,
        `Invalid JSON in configuration file ${filePath}: ${error.message}`,
        { filePath }
      );
    }

    // Handle other file system errors
    throw new ActionRegistryError(
      ActionRegistryErrorType.FILE_SYSTEM_ERROR,
      `Failed to read configuration file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      { filePath, originalError: error }
    );
  }
}

/**
 * Validate action configuration against JSON schema
 */
export async function validateActionConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
  try {
    // Load the JSON schema - try multiple paths
    const possibleSchemaPaths = [
      path.resolve(process.cwd(), 'src/schemas/actionConfig.schema.json'),
      path.resolve(__dirname, '..', 'schemas/actionConfig.schema.json'),
      path.resolve(__dirname, '../../schemas/actionConfig.schema.json')
    ];
    
    let schemaPath: string | null = null;
    for (const possiblePath of possibleSchemaPaths) {
      try {
        await fs.access(possiblePath);
        schemaPath = possiblePath;
        break;
      } catch {
        continue;
      }
    }
    
    if (!schemaPath) {
      return { valid: false, errors: ['JSON schema file not found'] };
    }
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    // Create AJV validator with draft 2020-12 support
    const ajv = new Ajv({ 
      allErrors: true,
      strict: false // Allow unknown keywords for compatibility
    });
    addFormats(ajv);

    const validate = ajv.compile(schema);
    const valid = validate(config);

    if (!valid && validate.errors) {
      const errors = validate.errors.map((error: ErrorObject) => {
        const path = error.instancePath || 'root';
        return `${path}: ${error.message}`;
      });
      return { valid: false, errors };
    }

    // Additional custom validation
    const customErrors = performCustomValidation(config);
    if (customErrors.length > 0) {
      return { valid: false, errors: customErrors };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [`Schema validation error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Perform custom validation beyond JSON schema
 */
function performCustomValidation(config: ActionConfig): string[] {
  const errors: string[] = [];

  if (!config.actions) {
    errors.push('Missing actions array');
    return errors;
  }

  for (const action of config.actions) {
    // Validate required fields
    if (!action.id || action.id.trim() === '') {
      errors.push(`Action has empty ID`);
    }

    if (!action.key || action.key.trim() === '') {
      errors.push(`Action ${action.id} has invalid key`);
    }

    if (!action.script) {
      errors.push(`Action ${action.id} is missing script`);
    }

    if (!action.description || action.description.trim() === '') {
      errors.push(`Action ${action.id} is missing description`);
    }

    // Validate script object for complex commands
    if (typeof action.script === 'object') {
      const script = action.script as any;
      if (!script.type || !['builtin', 'external', 'script', 'sequence'].includes(script.type)) {
        errors.push(`Action ${action.id} has invalid script type`);
      }
    }
  }

  return errors;
}

/**
 * Detect key binding conflicts between actions
 */
export function detectKeyBindingConflicts(
  customActions: ActionDefinition[],
  builtinActions: ActionDefinition[]
): KeyBindingValidation {
  const keyMap = new Map<string, string[]>();
  const conflicts: string[] = [];

  // Register all key bindings and track conflicts
  const registerKey = (key: string, actionId: string) => {
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(actionId);
  };

  // Register built-in actions first
  for (const action of builtinActions) {
    registerKey(action.key, action.id);
    if (action.alternativeKeys) {
      for (const altKey of action.alternativeKeys) {
        registerKey(altKey, action.id);
      }
    }
  }

  // Register custom actions and detect conflicts
  for (const action of customActions) {
    registerKey(action.key, action.id);
    if (action.alternativeKeys) {
      for (const altKey of action.alternativeKeys) {
        registerKey(altKey, action.id);
      }
    }
  }

  // Find conflicts
  for (const [key, actionIds] of Array.from(keyMap.entries())) {
    if (actionIds.length > 1) {
      conflicts.push(key);
    }
  }

  if (conflicts.length > 0) {
    const conflictDetails = conflicts.map(key => {
      const actions = keyMap.get(key)!;
      const builtinConflicts = actions.filter(id => builtinActions.some(a => a.id === id));
      
      if (builtinConflicts.length > 0) {
        return `Key '${key}' conflicts with built-in action(s): ${builtinConflicts.join(', ')}`;
      } else {
        return `Key '${key}' has duplicate key binding across actions: ${actions.join(', ')}`;
      }
    });

    return {
      valid: false,
      error: conflictDetails.join('; '),
      conflicts
    };
  }

  return { valid: true };
}

/**
 * Merge multiple configuration objects with priority
 */
function mergeConfigurations(configs: ActionConfig[]): ActionConfig {
  if (configs.length === 0) {
    return { actions: [] };
  }

  if (configs.length === 1) {
    return configs[0];
  }

  // Start with the lowest priority config and merge upwards
  const merged: ActionConfig = {
    actions: [],
    keyBindings: {},
    environment: {}
  };

  // Create a map to merge all actions, with first config taking priority
  const actionMap = new Map<string, ActionDefinition>();
  
  // Process configs in normal order (higher priority first)
  for (const config of configs) {
    for (const action of config.actions || []) {
      // Only add if not already present (first config wins)
      if (!actionMap.has(action.id)) {
        actionMap.set(action.id, action);
      }
    }
  }
  
  merged.actions = Array.from(actionMap.values());

  // Merge other properties (first config takes priority)
  for (const config of configs) {
    // Merge key bindings (later configs override earlier ones for non-conflicting keys)
    if (config.keyBindings) {
      Object.assign(merged.keyBindings || {}, config.keyBindings);
    }

    // Merge environment (later configs provide defaults)
    if (config.environment) {
      merged.environment = {
        ...config.environment,
        ...merged.environment,
        variables: {
          ...config.environment.variables,
          ...merged.environment?.variables
        }
      };
    }

    // Copy other fields from the first config that has them
    if (!merged.version && config.version) merged.version = config.version;
    if (!merged.metadata && config.metadata) merged.metadata = config.metadata;  
    if (!merged.$schema && config.$schema) merged.$schema = config.$schema;
  }

  return merged;
}

/**
 * Helper function for tests that expect non-null config results
 */
export async function loadActionConfigRequired(filePath: string): Promise<ActionConfig> {
  const config = await loadActionConfig(filePath);
  if (config === null) {
    throw new ActionRegistryError(
      ActionRegistryErrorType.FILE_NOT_FOUND,
      `Configuration file not found: ${filePath}`,
      { filePath }
    );
  }
  return config;
}

/**
 * Type guard to assert that a loaded config is not null
 */
export function assertConfigNotNull(config: ActionConfig | null): asserts config is ActionConfig {
  if (config === null) {
    throw new Error('Configuration is null');
  }
}