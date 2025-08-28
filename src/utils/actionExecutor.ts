/**
 * Action Executor for Hiliner
 * 
 * Provides runtime execution of custom actions with:
 * - Multiple script types: string commands, builtin functions, external commands, sequences
 * - Environment variable injection for shell scripts
 * - Safety features: dangerous action confirmation, timeout handling
 * - Output capture and error reporting
 * - Template variable substitution
 * - Integration with Action Registry and Context systems
 */

import { spawn } from 'child_process';
import type {
  ActionDefinition,
  ComplexCommand,
  ActionExecutionContext,
  ActionExecutionResult,
  ActionConfigEnvironment
} from '../types/actionConfig.js';
import type { ActionContext } from './actionContext.js';
import { substituteVariables } from './actionContext.js';
import type { HilinerAPI } from '../types/hilinerAPI.js';

/**
 * Error types for Action Executor operations
 */
export enum ActionExecutorErrorType {
  INVALID_ACTION = 'INVALID_ACTION',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT', 
  COMMAND_FAILED = 'COMMAND_FAILED',
  USER_CANCELLED = 'USER_CANCELLED',
  UNKNOWN_BUILTIN = 'UNKNOWN_BUILTIN',
  INVALID_SCRIPT_TYPE = 'INVALID_SCRIPT_TYPE',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR'
}

/**
 * Custom error class for Action Executor operations
 */
export class ActionExecutorError extends Error {
  public readonly type: ActionExecutorErrorType;
  public readonly details?: any;

  constructor(type: ActionExecutorErrorType, message: string, details?: any) {
    super(message);
    this.name = 'ActionExecutorError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Configuration options for action execution
 */
export interface ActionExecutorOptions {
  /** Default timeout for external commands in milliseconds */
  defaultTimeout?: number;
  /** Whether to show confirmation prompts for dangerous actions */
  allowDangerousActions?: boolean;
  /** Function to prompt user for confirmation (for testing/custom UI) */
  confirmationHandler?: (message: string) => Promise<boolean> | boolean;
  /** Function to handle builtin actions */
  builtinHandler?: BuiltinActionHandler;
  /** Environment configuration from action registry */
  environmentConfig?: ActionConfigEnvironment;
  /** Provider function for Hiliner API (for JavaScript scripts) */
  hilinerAPIProvider?: () => HilinerAPI;
}

/**
 * Handler function for builtin actions
 */
export type BuiltinActionHandler = (
  builtin: string,
  context: ActionExecutionContext
) => Promise<ActionExecutionResult> | ActionExecutionResult;

/**
 * Result of command execution
 */
interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
}

/**
 * Main Action Executor class
 */
export class ActionExecutor {
  private readonly options: Required<ActionExecutorOptions>;

  constructor(options: ActionExecutorOptions = {}) {
    this.options = {
      defaultTimeout: options.defaultTimeout ?? 10000, // 10 seconds default
      allowDangerousActions: options.allowDangerousActions ?? true,
      confirmationHandler: options.confirmationHandler ?? this.defaultConfirmationHandler,
      builtinHandler: options.builtinHandler ?? this.defaultBuiltinHandler,
      environmentConfig: options.environmentConfig ?? {},
      hilinerAPIProvider: options.hilinerAPIProvider ?? (() => this.createDefaultHilinerAPI())
    };
  }

  /**
   * Create default Hiliner API (no-op implementation)
   */
  private createDefaultHilinerAPI(): HilinerAPI {
    return {
      updateStatus: (message: string, options?: any) => {
        console.error('DEBUG: hiliner.updateStatus called:', message, options);
      },
      clearStatus: () => {
        console.error('DEBUG: hiliner.clearStatus called');
      },
      getFileInfo: () => ({
        path: 'unknown',
        language: 'unknown',
        totalLines: 0,
        currentLine: 0
      }),
      getSelectionInfo: () => ({
        selectedLines: [],
        selectionCount: 0,
        selectedText: ''
      })
    };
  }

  /**
   * Execute an action with the given context
   * 
   * @param action Action definition to execute
   * @param executionContext Runtime context for action execution
   * @param actionContext Action context with environment/template variables
   * @returns Promise resolving to execution result
   */
  async executeAction(
    action: ActionDefinition,
    executionContext: ActionExecutionContext,
    actionContext: ActionContext
  ): Promise<ActionExecutionResult> {
    try {
      // Validate action
      const validationResult = this.validateAction(action);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check if action is dangerous and get confirmation if needed
      if (action.dangerous && this.options.allowDangerousActions) {
        const confirmMessage = action.confirmPrompt ?? 
          `This action "${action.name || action.id}" may perform potentially harmful operations. Continue?`;
        
        const confirmed = await this.options.confirmationHandler(confirmMessage);
        if (!confirmed) {
          return {
            success: false,
            error: 'Action cancelled by user',
            messageType: 'info',
            message: 'Action cancelled'
          };
        }
      } else if (action.dangerous && !this.options.allowDangerousActions) {
        return {
          success: false,
          error: 'Dangerous actions are disabled',
          messageType: 'error',
          message: 'This action is marked as dangerous and has been disabled'
        };
      }

      // Execute based on script type
      if (typeof action.script === 'string') {
        return await this.executeStringScript(action.script, executionContext, actionContext);
      } else {
        return await this.executeComplexCommand(action.script, executionContext, actionContext);
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messageType: 'error',
        message: 'Action execution failed'
      };
    }
  }

  /**
   * Validate action definition
   */
  private validateAction(action: ActionDefinition): ActionExecutionResult {
    if (!action.id || !action.script) {
      return {
        success: false,
        error: 'Invalid action: missing required fields',
        messageType: 'error'
      };
    }

    if (action.enabled === false) {
      return {
        success: false,
        error: 'Action is disabled',
        messageType: 'warning',
        message: 'This action is currently disabled'
      };
    }

    return { success: true };
  }

  /**
   * Execute a string script (shell command)
   */
  private async executeStringScript(
    script: string,
    executionContext: ActionExecutionContext,
    actionContext: ActionContext
  ): Promise<ActionExecutionResult> {
    try {
      // Substitute template variables
      const expandedScript = substituteVariables(script, actionContext);

      // Check if this is a JavaScript/Node.js script or file path
      const isJavaScript = expandedScript.includes('hiliner.') || 
                          expandedScript.includes('console.log') ||
                          expandedScript.includes('await ') ||
                          expandedScript.includes('async ') ||
                          expandedScript.endsWith('.js') ||
                          expandedScript.includes('scripts/javascript/');

      if (isJavaScript) {
        // Execute as Node.js script with injected Hiliner API
        return await this.executeNodeScript(expandedScript, executionContext, actionContext);
      } else {
        // Execute as shell command
        const result = await this.executeShellCommand(
          expandedScript,
          actionContext.environmentVariables,
          this.options.defaultTimeout
        );

        return {
          success: result.success,
          error: result.success ? undefined : result.stderr || 'Command failed',
          output: result.stdout,
          message: result.success ? 'Command executed successfully' : 'Command failed',
          messageType: result.success ? 'success' : 'error'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messageType: 'error',
        message: 'Script execution failed'
      };
    }
  }

  /**
   * Execute a complex command object
   */
  private async executeComplexCommand(
    command: ComplexCommand,
    executionContext: ActionExecutionContext,
    actionContext: ActionContext
  ): Promise<ActionExecutionResult> {
    try {
      switch (command.type) {
        case 'builtin':
          return await this.executeBuiltinCommand(command, executionContext);

        case 'external':
          return await this.executeExternalCommand(command, executionContext, actionContext);

        case 'script':
          return await this.executeScriptCommand(command, executionContext, actionContext);

        case 'sequence':
          return await this.executeSequenceCommand(command, executionContext, actionContext);

        default:
          throw new ActionExecutorError(
            ActionExecutorErrorType.INVALID_SCRIPT_TYPE,
            `Unknown script type: ${(command as any).type}`,
            { command }
          );
      }
    } catch (error) {
      if (error instanceof ActionExecutorError) {
        throw error;
      }
      
      throw new ActionExecutorError(
        ActionExecutorErrorType.COMMAND_FAILED,
        error instanceof Error ? error.message : String(error),
        { command, originalError: error }
      );
    }
  }

  /**
   * Execute a builtin command
   */
  private async executeBuiltinCommand(
    command: ComplexCommand,
    executionContext: ActionExecutionContext
  ): Promise<ActionExecutionResult> {
    if (!command.builtin) {
      throw new ActionExecutorError(
        ActionExecutorErrorType.UNKNOWN_BUILTIN,
        'Builtin command name not specified'
      );
    }

    return await this.options.builtinHandler(command.builtin, executionContext);
  }

  /**
   * Execute an external command
   */
  private async executeExternalCommand(
    command: ComplexCommand,
    executionContext: ActionExecutionContext,
    actionContext: ActionContext
  ): Promise<ActionExecutionResult> {
    if (!command.command) {
      throw new ActionExecutorError(
        ActionExecutorErrorType.INVALID_ACTION,
        'External command not specified'
      );
    }

    // Prepare environment variables
    const env = this.prepareEnvironment(command, actionContext);

    // Substitute template variables in command and args
    const expandedCommand = substituteVariables(command.command, actionContext);
    const expandedArgs = command.args?.map(arg => substituteVariables(arg, actionContext)) || [];

    // Build full command string for execution
    const fullCommand = [expandedCommand, ...expandedArgs].join(' ');

    // Execute command
    const timeout = command.timeout ?? this.options.defaultTimeout;
    const result = await this.executeShellCommand(fullCommand, env, timeout, command.workingDirectory);

    return {
      success: result.success,
      error: result.success ? undefined : result.stderr || 'External command failed',
      output: command.captureOutput !== false ? result.stdout : undefined,
      message: result.success ? 'External command executed successfully' : 'External command failed',
      messageType: result.success ? 'success' : 'error'
    };
  }

  /**
   * Execute a Node.js script with injected Hiliner API
   */
  private async executeNodeScript(
    script: string,
    executionContext: ActionExecutionContext,
    actionContext: ActionContext
  ): Promise<ActionExecutionResult> {
    try {
      // Get Hiliner API instance
      const hilinerAPI = this.options.hilinerAPIProvider();
      
      // Check if script is a file path
      const isFilePath = script.endsWith('.js') || script.includes('scripts/javascript/');
      
      let command: string;
      if (isFilePath) {
        // Create wrapper that injects API and executes external file
        const wrapperScript = `
          // Inject Hiliner API into global scope
          global.hiliner = {
            updateStatus: (message, options) => {
              console.log('HILINER_STATUS:' + message);
            },
            clearStatus: () => {
              console.log('HILINER_STATUS_CLEAR');
            },
            getFileInfo: () => (${JSON.stringify(hilinerAPI.getFileInfo())}),
            getSelectionInfo: () => (${JSON.stringify(hilinerAPI.getSelectionInfo())})
          };
          
          // Execute external file
          require('${script.startsWith('/') ? script : process.cwd() + '/' + script}');
        `;
        
        command = `node -e "${wrapperScript.replace(/"/g, '\\"')}"`;
      } else {
        // Create wrapper for inline script
        const wrapperScript = `
          // Inject Hiliner API into global scope
          global.hiliner = {
            updateStatus: (message, options) => {
              console.log('HILINER_STATUS:' + message);
            },
            clearStatus: () => {
              console.log('HILINER_STATUS_CLEAR');
            },
            getFileInfo: () => (${JSON.stringify(hilinerAPI.getFileInfo())}),
            getSelectionInfo: () => (${JSON.stringify(hilinerAPI.getSelectionInfo())})
          };
          
          // Execute user script
          (async () => {
            ${script}
          })().catch(error => {
            console.error('Script error:', error.message);
            process.exit(1);
          });
        `;
        
        command = `node -e "${wrapperScript.replace(/"/g, '\\"')}"`;
      }
      
      // Execute the command
      const result = await this.executeShellCommand(
        command,
        actionContext.environmentVariables,
        this.options.defaultTimeout
      );
      
      // Extract status message from output
      let statusMessage = '';
      const outputLines = result.stdout?.split('\n') || [];
      const filteredOutput: string[] = [];
      
      for (const line of outputLines) {
        if (line.startsWith('HILINER_STATUS:')) {
          statusMessage = line.replace('HILINER_STATUS:', '');
        } else if (line.startsWith('HILINER_STATUS_CLEAR')) {
          statusMessage = '';
        } else if (line.startsWith('HILINER_FINAL_STATUS:')) {
          statusMessage = line.replace('HILINER_FINAL_STATUS:', '');
        } else if (line.trim()) {
          filteredOutput.push(line);
        }
      }
      
      // Call actual Hiliner API if status message was set
      if (statusMessage) {
        hilinerAPI.updateStatus(statusMessage);
      }
      
      return {
        success: result.success,
        error: result.success ? undefined : result.stderr || 'Script execution failed',
        output: filteredOutput.join('\n') || statusMessage,
        message: result.success ? 'JavaScript executed successfully' : 'JavaScript execution failed',
        messageType: result.success ? 'success' : 'error'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Node.js script execution failed',
        messageType: 'error'
      };
    }
  }

  /**
   * Execute a script command
   */
  private async executeScriptCommand(
    command: ComplexCommand,
    executionContext: ActionExecutionContext,
    actionContext: ActionContext
  ): Promise<ActionExecutionResult> {
    if (!command.command) {
      throw new ActionExecutorError(
        ActionExecutorErrorType.INVALID_ACTION,
        'Script command not specified'
      );
    }

    return await this.executeStringScript(command.command, executionContext, actionContext);
  }

  /**
   * Execute a sequence of commands
   */
  private async executeSequenceCommand(
    command: ComplexCommand,
    executionContext: ActionExecutionContext,
    actionContext: ActionContext
  ): Promise<ActionExecutionResult> {
    if (!command.sequence || command.sequence.length === 0) {
      throw new ActionExecutorError(
        ActionExecutorErrorType.INVALID_ACTION,
        'Sequence command has no sequence defined'
      );
    }

    const results: ActionExecutionResult[] = [];
    let allSuccess = true;
    let combinedOutput = '';

    for (let i = 0; i < command.sequence.length; i++) {
      const subCommand = command.sequence[i];
      const result = await this.executeComplexCommand(subCommand, executionContext, actionContext);
      
      results.push(result);
      
      if (result.output && !subCommand.silent) {
        combinedOutput += (combinedOutput ? '\n' : '') + result.output;
      }

      if (!result.success) {
        allSuccess = false;
        
        // Execute onFailure if defined
        if (command.onFailure) {
          await this.executeStringScript(command.onFailure, executionContext, actionContext);
        }
        
        break; // Stop sequence on first failure
      }
    }

    if (allSuccess && command.onSuccess) {
      await this.executeStringScript(command.onSuccess, executionContext, actionContext);
    }

    return {
      success: allSuccess,
      error: allSuccess ? undefined : 'One or more commands in sequence failed',
      output: combinedOutput || undefined,
      message: allSuccess ? 'All commands executed successfully' : 'Sequence execution failed',
      messageType: allSuccess ? 'success' : 'error'
    };
  }

  /**
   * Execute a shell command with timeout and environment
   */
  private async executeShellCommand(
    command: string,
    environment: Record<string, string>,
    timeout: number,
    workingDirectory?: string
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const shell = this.getShellCommand();
      const child = spawn(shell.command, [...shell.args, command], {
        env: { ...process.env, ...environment },
        cwd: workingDirectory || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        
        // Force kill after 2 seconds if not terminated
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 2000);
      }, timeout);

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      child.on('close', (code, signal) => {
        clearTimeout(timeoutHandle);
        
        resolve({
          success: !timedOut && code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          signal,
          timedOut
        });
      });

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: error.message,
          exitCode: null,
          signal: null,
          timedOut
        });
      });
    });
  }

  /**
   * Get the appropriate shell command for the current platform
   */
  private getShellCommand(): { command: string; args: string[] } {
    const configuredShell = this.options.environmentConfig.shell;
    
    if (configuredShell) {
      switch (configuredShell) {
        case 'bash':
          return { command: 'bash', args: ['-c'] };
        case 'sh':
          return { command: 'sh', args: ['-c'] };
        case 'zsh':
          return { command: 'zsh', args: ['-c'] };
        case 'fish':
          return { command: 'fish', args: ['-c'] };
        case 'cmd':
          return { command: 'cmd', args: ['/c'] };
        case 'powershell':
          return { command: 'powershell', args: ['-Command'] };
      }
    }

    // Default shell detection
    if (process.platform === 'win32') {
      return { command: 'cmd', args: ['/c'] };
    } else {
      return { command: 'sh', args: ['-c'] };
    }
  }

  /**
   * Prepare environment variables for command execution
   */
  private prepareEnvironment(
    command: ComplexCommand,
    actionContext: ActionContext
  ): Record<string, string> {
    const env: Record<string, string> = {};

    // Start with action context environment variables
    Object.assign(env, actionContext.environmentVariables);

    // Add global environment variables from configuration
    if (this.options.environmentConfig.variables) {
      Object.assign(env, this.options.environmentConfig.variables);
    }

    // Add command-specific environment variables
    if (command.environment) {
      Object.assign(env, command.environment);
    }

    return env;
  }

  /**
   * Default confirmation handler (always returns true)
   */
  private async defaultConfirmationHandler(message: string): Promise<boolean> {
    // In a real implementation, this would show a prompt to the user
    // For now, we always allow execution (tests can override this)
    console.warn(`Dangerous action: ${message}`);
    return true;
  }

  /**
   * Default builtin handler (throws error for unknown builtins)
   */
  private async defaultBuiltinHandler(
    builtin: string,
    context: ActionExecutionContext
  ): Promise<ActionExecutionResult> {
    throw new ActionExecutorError(
      ActionExecutorErrorType.UNKNOWN_BUILTIN,
      `Unknown builtin action: ${builtin}`,
      { builtin, context }
    );
  }
}

/**
 * Convenience function to create and execute an action
 */
export async function executeAction(
  action: ActionDefinition,
  executionContext: ActionExecutionContext,
  actionContext: ActionContext,
  options: ActionExecutorOptions = {}
): Promise<ActionExecutionResult> {
  const executor = new ActionExecutor(options);
  return await executor.executeAction(action, executionContext, actionContext);
}

/**
 * Create a builtin handler that handles common builtin actions
 */
export function createBuiltinHandler(
  handlers: Partial<Record<string, (context: ActionExecutionContext) => Promise<ActionExecutionResult> | ActionExecutionResult>>
): BuiltinActionHandler {
  return async (builtin: string, context: ActionExecutionContext): Promise<ActionExecutionResult> => {
    const handler = handlers[builtin];
    if (!handler) {
      throw new ActionExecutorError(
        ActionExecutorErrorType.UNKNOWN_BUILTIN,
        `No handler registered for builtin action: ${builtin}`,
        { builtin, availableBuiltins: Object.keys(handlers) }
      );
    }

    try {
      return await handler(context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        messageType: 'error',
        message: `Builtin action '${builtin}' failed`
      };
    }
  };
}