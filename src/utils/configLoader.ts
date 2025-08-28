/**
 * Configuration Loader for Hiliner Action System
 * 
 * This module handles loading and merging JSON configuration files
 * for custom actions with comprehensive error handling and validation.
 * 
 * FILE PRIORITY SYSTEM (Issue #13):
 * 1. CLI --config flag (absolute priority)
 * 2. Project config: ./hiliner-actions.json (highest auto-discovery priority)
 * 3. User config: ~/.hiliner/actions.json (fallback)
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ActionConfig } from '../types/actionConfig.js';

/**
 * Helper function to determine priority of a config source
 */
function getPriority(sourcePath: string): number {
  if (sourcePath.includes('/.hiliner/actions.json')) return 1; // User config
  if (sourcePath.includes('hiliner-actions.json')) return 2;   // Project config  
  return 3; // Custom config (highest priority)
}

/**
 * Configuration error types for comprehensive error handling
 */
export enum ConfigErrorType {
  FILE_NOT_FOUND = 'file_not_found',
  PERMISSION_ERROR = 'permission_error',
  PARSE_ERROR = 'parse_error',
  VALIDATION_ERROR = 'validation_error',
  FILE_SYSTEM_ERROR = 'file_system_error',
  MERGE_ERROR = 'merge_error',
}

/**
 * Merge strategies for handling multiple configuration files
 */
export enum MergeStrategy {
  /** Merge all configs with priority-based resolution */
  MERGE_WITH_PRIORITY = 'merge_with_priority',
  /** Only use the highest priority config found */
  REPLACE = 'replace',
  /** Merge all configs and detect conflicts */
  DETECT_CONFLICTS = 'detect_conflicts',
  /** Force merge all configs despite conflicts */
  MERGE_ALL = 'merge_all',
}

/**
 * Configuration loading error with detailed context
 */
export interface ConfigLoadError {
  /** Type of error that occurred */
  type: ConfigErrorType;
  /** Human-readable error message */
  message: string;
  /** Path to the configuration file that caused the error */
  path: string;
  /** Whether this error can be recovered from */
  recoverable: boolean;
  /** Original error object if available */
  originalError?: Error;
}

/**
 * Validation error details for schema violations
 */
export interface ValidationError {
  /** JSONPath to the invalid property */
  path: string;
  /** Validation error message */
  message: string;
  /** Invalid value that caused the error */
  value?: any;
  /** Expected value or format */
  expected?: string;
}

/**
 * Configuration conflict detected during merging
 */
export interface ConfigConflict {
  /** Type of conflict detected */
  type: 'duplicate_action_id' | 'duplicate_key_binding' | 'conflicting_environment_var';
  /** The conflicting key or identifier */
  key: string;
  /** Source files that contain the conflict */
  sources: string[];
  /** How the conflict was resolved */
  resolution: string;
}

/**
 * Warning message from configuration loading
 */
export interface ConfigWarning {
  /** Warning message */
  message: string;
  /** Source file that generated the warning */
  source: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
}

/**
 * Options for configuration loading behavior
 */
export interface ConfigLoadOptions {
  /** Path to custom configuration file (overrides auto-discovery) */
  customConfigPath?: string;
  
  /** Merge strategy for multiple configuration files */
  mergeStrategy?: MergeStrategy;
  
  /** Whether to fail on any validation error (default: true) */
  strictMode?: boolean;
  
  /** Only validate and detect sources without loading (default: false) */
  dryRun?: boolean;
  
  /** Include source file information in loaded actions (default: false) */
  includeSource?: boolean;
  
  /** Maximum file size to load (default: 10MB) */
  maxFileSize?: number;
  
  /** Custom working directory for resolving relative paths */
  workingDirectory?: string;
}

/**
 * Result of configuration loading operation
 */
export interface ConfigLoadResult {
  /** Whether the configuration was loaded successfully */
  success: boolean;
  
  /** Merged configuration object (null on failure or dry run) */
  config: ActionConfig | null;
  
  /** List of configuration files that were loaded (in priority order) */
  sources: string[];
  
  /** Configuration loading error (if success is false) */
  error?: ConfigLoadError;
  
  /** JSON Schema validation errors */
  validationErrors: ValidationError[];
  
  /** Configuration merge conflicts detected */
  conflicts: ConfigConflict[];
  
  /** Non-fatal warnings from loading process */
  warnings?: ConfigWarning[];
  
  /** Performance metrics */
  metrics?: {
    /** Total loading time in milliseconds */
    loadTime: number;
    /** Number of files processed */
    filesProcessed: number;
    /** Size of loaded configurations in bytes */
    totalSize: number;
  };
}

/**
 * Load configuration files with priority-based merging
 * 
 * @param workingDirectory - Directory to search for project config
 * @param options - Configuration loading options
 * @returns Promise resolving to configuration load result
 */
export async function loadConfig(
  workingDirectory: string,
  options: ConfigLoadOptions = {}
): Promise<ConfigLoadResult> {
  const startTime = Date.now();
  const result: ConfigLoadResult = {
    success: false,
    config: null,
    sources: [],
    validationErrors: [],
    conflicts: [],
    warnings: [],
  };

  try {
    // Resolve config file paths in priority order
    const configPaths = resolveConfigPaths(workingDirectory, options.customConfigPath);
    
    // Load all available config files
    const loadedConfigs: Array<{ config: ActionConfig; source: string }> = [];
    let totalSize = 0;
    
    // If custom config is specified and doesn't exist, that's an error
    if (options.customConfigPath) {
      const customConfigPath = configPaths[configPaths.length - 1]; // Custom config is last
      const customResult = await checkConfigAccess(customConfigPath);
      if (!customResult.exists) {
        result.error = {
          type: ConfigErrorType.FILE_NOT_FOUND,
          message: `Custom configuration file not found or specified config file not found: ${customConfigPath}`,
          path: customConfigPath,
          recoverable: false
        };
        return result;
      }
    }

    for (const configPath of configPaths) {
      try {
        const accessResult = await checkConfigAccess(configPath);
        if (!accessResult.exists) continue;
        
        if (!accessResult.readable) {
          result.warnings?.push({
            message: `Configuration file is not readable: ${accessResult.error}`,
            source: configPath,
            severity: 'medium'
          });
          continue;
        }

        const configContent = await fs.readFile(configPath, 'utf-8');
        totalSize += Buffer.byteLength(configContent, 'utf-8');
        
        // Check file size limit
        const maxSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
        if (totalSize > maxSize) {
          throw new Error(`Configuration files exceed maximum size limit: ${maxSize} bytes`);
        }

        let parsedConfig: ActionConfig;
        try {
          parsedConfig = JSON.parse(configContent);
        } catch (parseError) {
          if (options.strictMode !== false) {
            result.error = {
              type: ConfigErrorType.PARSE_ERROR,
              message: `Failed to parse JSON configuration: ${(parseError as Error).message.includes('Unexpected end') ? 'empty or invalid JSON file' : (parseError as Error).message}`,
              path: configPath,
              recoverable: false,
              originalError: parseError as Error
            };
            return result;
          }
          result.warnings?.push({
            message: `Skipping invalid JSON configuration: ${(parseError as Error).message}`,
            source: configPath,
            severity: 'high'
          });
          continue;
        }

        // Validate configuration
        const validationErrors = await validateConfig(parsedConfig);
        if (validationErrors.length > 0) {
          result.validationErrors.push(...validationErrors);
          if (options.strictMode !== false) {
            result.error = {
              type: ConfigErrorType.VALIDATION_ERROR,
              message: `Configuration validation failed: ${validationErrors[0]?.message}`,
              path: configPath,
              recoverable: false
            };
            return result;
          }
        }

        result.sources.push(configPath);
        
        // Add source information if requested
        if (options.includeSource) {
          // Add __source property to each action
          if (parsedConfig.actions) {
            parsedConfig.actions = parsedConfig.actions.map(action => ({
              ...action,
              __source: configPath
            } as any));
          }
        }
        
        loadedConfigs.push({ config: parsedConfig, source: configPath });

        // If dryRun mode, don't actually merge configs
        if (options.dryRun) {
          result.success = true;
          return result;
        }

      } catch (error) {
        const configError = error as Error;
        if (configError.message.includes('ENOENT')) {
          // File doesn't exist, continue to next
          continue;
        }
        
        if (configError.message.includes('EACCES')) {
          result.error = {
            type: ConfigErrorType.PERMISSION_ERROR,
            message: `Configuration file permission error: ${configPath}`,
            path: configPath,
            recoverable: false,
            originalError: configError
          };
        } else if (configError.message.includes('EIO') || configError.message.includes('i/o error')) {
          result.error = {
            type: ConfigErrorType.FILE_SYSTEM_ERROR,
            message: `Configuration file I/O error: ${configError.message}`,
            path: configPath,
            recoverable: false,
            originalError: configError
          };
        } else {
          result.error = {
            type: ConfigErrorType.FILE_SYSTEM_ERROR,
            message: `File system error: ${configError.message}`,
            path: configPath,
            recoverable: false,
            originalError: configError
          };
        }
        
        if (options.strictMode !== false) {
          return result;
        }
        
        result.warnings?.push({
          message: `Skipping configuration due to error: ${configError.message}`,
          source: configPath,
          severity: 'high'
        });
      }
    }

    // If no configs were loaded
    if (loadedConfigs.length === 0) {
      result.success = true;
      result.config = { actions: [] }; // Empty but valid config
      return result;
    }

    // Handle merge strategy
    const mergeStrategy = options.mergeStrategy || MergeStrategy.MERGE_WITH_PRIORITY;
    let mergeResult: { merged: ActionConfig; conflicts: ConfigConflict[] };
    
    // If custom config path is specified, it should completely override others (REPLACE behavior)
    if (options.customConfigPath) {
      const customConfig = loadedConfigs[loadedConfigs.length - 1]; // Custom config is last loaded
      mergeResult = {
        merged: customConfig.config,
        conflicts: []
      };
      // Keep all sources but use only custom config for the result
    } else if (mergeStrategy === MergeStrategy.REPLACE) {
      mergeResult = {
        merged: loadedConfigs[loadedConfigs.length - 1].config,
        conflicts: []
      };
      // Only keep the last source for REPLACE strategy (highest priority)
      result.sources = [result.sources[result.sources.length - 1]];
    } else {
      mergeResult = mergeConfigs(loadedConfigs, mergeStrategy);
    }
    
    result.config = mergeResult.merged;
    result.conflicts = mergeResult.conflicts;
    result.success = true;
    
    // Add metrics
    result.metrics = {
      loadTime: Date.now() - startTime,
      filesProcessed: loadedConfigs.length,
      totalSize
    };

    return result;

  } catch (error) {
    const configError = error as Error;
    result.error = {
      type: ConfigErrorType.FILE_SYSTEM_ERROR,
      message: `Unexpected error during configuration loading: ${configError.message}`,
      path: workingDirectory,
      recoverable: false,
      originalError: configError
    };
    return result;
  }
}

/**
 * Validate a configuration object against the JSON schema
 * 
 * @param config - Configuration object to validate
 * @param schemaPath - Optional path to custom schema file
 * @returns Validation errors (empty array if valid)
 */
export async function validateConfig(
  config: any,
  schemaPath?: string
): Promise<ValidationError[]> {
  try {
    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    
    // Load schema
    const defaultSchemaPath = path.join(process.cwd(), 'src/schemas/actionConfig.schema.json');
    const resolvedSchemaPath = schemaPath || defaultSchemaPath;
    
    let schemaContent: string;
    try {
      schemaContent = await fs.readFile(resolvedSchemaPath, 'utf-8');
    } catch (error) {
      // Schema file doesn't exist - do basic validation
      if (!config || typeof config !== 'object') {
        return [{
          path: '/',
          message: 'Configuration must be an object'
        }];
      }
      
      if (!config.actions || !Array.isArray(config.actions)) {
        return [{
          path: '/actions',
          message: 'Missing required property: actions (must be array)'
        }];
      }
      
      // Basic action validation when schema is not available
      const validationErrors: ValidationError[] = [];
      
      // Validate version if present
      if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
        validationErrors.push({
          path: '/version',
          message: 'Version does not match pattern: must be in semver format (e.g., "1.0.0")',
          value: config.version
        });
      }
      
      // Validate each action
      config.actions.forEach((action: any, index: number) => {
        const actionPath = `/actions/${index}`;
        
        // Check required fields
        if (!action.id) {
          validationErrors.push({
            path: `${actionPath}/id`,
            message: 'Missing required property: id'
          });
        } else if (!/^[a-zA-Z0-9_-]+$/.test(action.id)) {
          validationErrors.push({
            path: `${actionPath}/id`,
            message: 'Action ID must only contain letters, numbers, hyphens, and underscores',
            value: action.id
          });
        }
        
        if (!action.key) {
          validationErrors.push({
            path: `${actionPath}/key`,
            message: 'Missing required property: key'
          });
        }
        
        if (!action.script) {
          validationErrors.push({
            path: `${actionPath}/script`,
            message: 'Missing required property: script'
          });
        }
        
        if (!action.description) {
          validationErrors.push({
            path: `${actionPath}/description`,
            message: 'Missing required property: description'
          });
        }
      });
      
      return validationErrors;
    }
    
    const schema = JSON.parse(schemaContent);
    const validate = ajv.compile(schema);
    
    const isValid = validate(config);
    
    if (isValid) {
      return [];
    }
    
    // Convert AJV errors to our ValidationError format
    const validationErrors: ValidationError[] = [];
    
    if (validate.errors) {
      for (const error of validate.errors) {
        validationErrors.push({
          path: error.instancePath || error.schemaPath,
          message: error.message || 'Validation failed',
          value: error.data,
          expected: error.schema as string
        });
      }
    }
    
    return validationErrors;
    
  } catch (error) {
    // If validation itself fails, return an error
    return [{
      path: '/',
      message: `Schema validation failed: ${(error as Error).message}`,
      value: config
    }];
  }
}

/**
 * Merge multiple configuration objects with conflict detection
 * 
 * @param configs - Array of configs with their source paths
 * @param strategy - Merge strategy to use
 * @returns Merged config with conflict information
 */
export function mergeConfigs(
  configs: Array<{ config: ActionConfig; source: string }>,
  strategy: MergeStrategy = MergeStrategy.MERGE_WITH_PRIORITY
): {
  merged: ActionConfig;
  conflicts: ConfigConflict[];
} {
  const conflicts: ConfigConflict[] = [];
  
  if (configs.length === 0) {
    return {
      merged: { actions: [] },
      conflicts: []
    };
  }
  
  if (configs.length === 1) {
    return {
      merged: configs[0].config,
      conflicts: []
    };
  }
  
  // For REPLACE strategy, just use the last (highest priority) config
  if (strategy === MergeStrategy.REPLACE) {
    return {
      merged: configs[configs.length - 1].config,
      conflicts: []
    };
  }
  
  // Initialize merged config with highest priority config as base for metadata/environment
  const highestPriorityConfig = configs[configs.length - 1];
  const merged: ActionConfig = {
    ...highestPriorityConfig.config,
    actions: [] // Start with empty actions, will accumulate in load order
  };
  
  // Track seen action IDs and key bindings for conflict detection
  const seenActionIds = new Set<string>();
  const seenKeyBindings = new Map<string, string>();
  const seenEnvVars = new Map<string, string>();
  
  // Merge configs in load order (low to high priority) but accumulate actions in order
  for (let i = 0; i < configs.length; i++) {
    const { config, source } = configs[i];
    
    // Merge actions (accumulate in order, but resolve conflicts by priority)
    for (const action of config.actions) {
      if (seenActionIds.has(action.id)) {
        // Find which source had this action ID first
        let firstSource = '';
        for (let j = 0; j < i; j++) {
          if (configs[j].config.actions.some(a => a.id === action.id)) {
            firstSource = configs[j].source;
            break;
          }
        }
        
        // Determine if current config has higher priority than first source
        const currentPriority = getPriority(source);
        const firstPriority = getPriority(firstSource);
        
        conflicts.push({
          type: 'duplicate_action_id',
          key: action.id,
          sources: [firstSource, source],
          resolution: strategy === MergeStrategy.MERGE_ALL ? 'kept both' : 
                     currentPriority > firstPriority ? 'used higher priority' : 
                     source.includes('hiliner-actions.json') ? 'project config takes priority' : 'used higher priority'
        });
        
        if (strategy === MergeStrategy.MERGE_ALL) {
          // Add with modified ID
          merged.actions.push({
            ...action,
            id: `${action.id}_${i}`
          });
        } else {
          // For MERGE_WITH_PRIORITY: replace if current has higher priority
          if (currentPriority > firstPriority) {
            // Remove the old action and add the new one in its place
            const actionIndex = merged.actions.findIndex(a => a.id === action.id);
            if (actionIndex !== -1) {
              merged.actions[actionIndex] = action;
            }
          }
        }
      } else {
        merged.actions.push(action);
        seenActionIds.add(action.id);
      }
      
      // Check for key binding conflicts
      if (action.key && seenKeyBindings.has(action.key)) {
        const firstSource = seenKeyBindings.get(action.key)!;
        const currentPriority = getPriority(source);
        const firstPriority = getPriority(firstSource);
        
        conflicts.push({
          type: 'duplicate_key_binding',
          key: action.key,
          sources: [firstSource, source],
          resolution: currentPriority > firstPriority ? 'used higher priority' : 
                     source.includes('hiliner-actions.json') ? 'project config takes priority' : 'used higher priority'
        });
        
        // Update key binding if current has higher priority
        if (currentPriority > firstPriority) {
          seenKeyBindings.set(action.key, source);
        }
      } else if (action.key) {
        seenKeyBindings.set(action.key, source);
      }
    }
    
    // Merge global key bindings
    if (config.keyBindings) {
      if (!merged.keyBindings) {
        merged.keyBindings = {};
      }
      
      for (const [key, actionId] of Object.entries(config.keyBindings)) {
        if (seenKeyBindings.has(key)) {
          const firstSource = seenKeyBindings.get(key)!;
          const currentPriority = getPriority(source);
          const firstPriority = getPriority(firstSource);
          
          conflicts.push({
            type: 'duplicate_key_binding',
            key,
            sources: [firstSource, source],
            resolution: currentPriority > firstPriority ? 'used higher priority' : 
                       source.includes('hiliner-actions.json') ? 'project config takes priority' : 'used higher priority'
          });
          
          // Update key binding if current has higher priority
          if (currentPriority > firstPriority) {
            merged.keyBindings[key] = actionId;
            seenKeyBindings.set(key, source);
          }
        } else {
          merged.keyBindings[key] = actionId;
          seenKeyBindings.set(key, source);
        }
      }
    }
    
    // Merge environment variables
    if (config.environment) {
      if (!merged.environment) {
        merged.environment = {};
      }
      
      // Merge environment properties (higher priority configs override)
      const currentPriority = getPriority(source);
      const basePriority = getPriority(highestPriorityConfig.source);
      
      if (currentPriority >= basePriority) {
        if (config.environment.timeout) {
          merged.environment.timeout = config.environment.timeout;
        }
        if (config.environment.shell) {
          merged.environment.shell = config.environment.shell;
        }
      }
      
      // Merge environment variables
      if (config.environment.variables) {
        if (!merged.environment.variables) {
          merged.environment.variables = {};
        }
        
        for (const [envVar, value] of Object.entries(config.environment.variables)) {
          if (seenEnvVars.has(envVar)) {
            const firstSource = seenEnvVars.get(envVar)!;
            const firstPriority = getPriority(firstSource);
            
            conflicts.push({
              type: 'conflicting_environment_var',
              key: envVar,
              sources: [firstSource, source],
              resolution: currentPriority > firstPriority ? 'used higher priority' : 
                         source.includes('hiliner-actions.json') ? 'project config takes priority' : 'used higher priority'
            });
            
            // Update environment variable if current has higher priority
            if (currentPriority > firstPriority) {
              merged.environment.variables[envVar] = value;
              seenEnvVars.set(envVar, source);
            }
          } else {
            merged.environment.variables[envVar] = value;
            seenEnvVars.set(envVar, source);
          }
        }
      }
    }
    
    // Merge metadata (use highest priority config's metadata)
    const currentPriority = getPriority(source);
    const basePriority = getPriority(highestPriorityConfig.source);
    
    if (currentPriority >= basePriority) {
      if (config.metadata) {
        merged.metadata = config.metadata;
      }
      if (config.version) {
        merged.version = config.version;
      }
    }
  }
  
  return {
    merged,
    conflicts
  };
}

/**
 * Resolve configuration file paths based on priority system
 * 
 * @param workingDirectory - Working directory for project config
 * @param customPath - Optional custom config path
 * @returns Array of config paths in priority order
 */
export function resolveConfigPaths(
  workingDirectory: string,
  customPath?: string
): string[] {
  const paths: string[] = [];
  
  // Load configs in discovery order (but merge with different priorities)
  // 1. User config: ~/.hiliner/actions.json (lowest priority, loaded first)
  const userConfigPath = path.join(os.homedir(), '.hiliner', 'actions.json');
  paths.push(userConfigPath);
  
  // 2. Project config: ./hiliner-actions.json (higher priority, loaded second)
  const projectConfigPath = path.join(workingDirectory, 'hiliner-actions.json');
  paths.push(projectConfigPath);
  
  // 3. CLI --config flag (absolute highest priority, loaded last)
  if (customPath) {
    // Handle tilde expansion
    let resolvedCustomPath = customPath;
    if (customPath.startsWith('~/')) {
      resolvedCustomPath = path.join(os.homedir(), customPath.slice(2));
    }
    
    // Handle relative paths
    if (!path.isAbsolute(resolvedCustomPath)) {
      resolvedCustomPath = path.resolve(workingDirectory, resolvedCustomPath);
    }
    
    paths.push(resolvedCustomPath);
  }
  
  return paths;
}

/**
 * Check if a configuration file exists and is accessible
 * 
 * @param filePath - Path to configuration file
 * @returns Promise resolving to access result
 */
export async function checkConfigAccess(filePath: string): Promise<{
  exists: boolean;
  readable: boolean;
  error?: string;
}> {
  try {
    // Check if file exists
    await fs.access(filePath);
    
    try {
      // Check if file is readable
      await fs.access(filePath, fs.constants.R_OK);
      return {
        exists: true,
        readable: true
      };
    } catch (readError) {
      return {
        exists: true,
        readable: false,
        error: `File is not readable: ${(readError as Error).message}`
      };
    }
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    
    if (fsError.code === 'ENOENT') {
      return {
        exists: false,
        readable: false,
        error: 'File does not exist'
      };
    }
    
    return {
      exists: false,
      readable: false,
      error: `File system error: ${fsError.message}`
    };
  }
}