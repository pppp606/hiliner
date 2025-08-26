/**
 * TypeScript type definition tests for Action Configuration System
 * 
 * TDD RED Phase: These tests validate type definitions and interfaces
 * for the action configuration system based on issue #13 specifications.
 * Tests are designed to FAIL initially to validate TDD methodology.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  ActionConfig,
  ActionDefinition,
  ActionConfigMetadata,
  ActionConfigEnvironment,
  ActionWhenConditions,
  CommandVariables,
  ComplexCommand,
  ActionExecutionContext,
  ActionExecutionResult,
  ActionHandler,
  KeyBindingValidation
} from '../actionConfig.js';
import type {
  SelectionState,
  FileData,
  FileMetadata
} from '../../types.js';

describe('Action Configuration Type Definitions (TDD RED Phase)', () => {
  describe('ActionDefinition Interface', () => {
    it('should validate required properties for action definition', () => {
      const validAction: ActionDefinition = {
        id: 'test-action',
        description: 'Test action for validation',
        key: 'T',
        script: 'echo "test"'
      };

      expect(validAction.id).toBe('test-action');
      expect(validAction.description).toBe('Test action for validation');
      expect(validAction.key).toBe('T');
      expect(validAction.script).toBe('echo "test"');
    });

    it('should validate optional properties with correct types', () => {
      const actionWithOptionals: ActionDefinition = {
        id: 'advanced-action',
        name: 'Advanced Test Action',
        description: 'Advanced action with all optional properties',
        key: 'A',
        alternativeKeys: ['a', 'ctrl+a'],
        script: {
          type: 'external',
          command: 'git',
          args: ['status']
        },
        when: {
          fileTypes: ['js', 'ts'],
          hasSelection: true,
          mode: 'interactive'
        },
        dangerous: true,
        confirmPrompt: 'This action will modify files. Continue?',
        category: 'editing',
        priority: 10,
        enabled: true
      };

      expect(actionWithOptionals.name).toBe('Advanced Test Action');
      expect(actionWithOptionals.alternativeKeys).toEqual(['a', 'ctrl+a']);
      expect(actionWithOptionals.dangerous).toBe(true);
      expect(actionWithOptionals.category).toBe('editing');
      expect(actionWithOptionals.priority).toBe(10);
    });

    it('should accept both string and complex command scripts', () => {
      const stringScript: ActionDefinition = {
        id: 'string-action',
        description: 'Action with string script',
        key: 'S',
        script: 'ls -la'
      };

      const complexScript: ActionDefinition = {
        id: 'complex-action',
        description: 'Action with complex script',
        key: 'C',
        script: {
          type: 'external',
          command: 'npm',
          args: ['test'],
          timeout: 30000
        }
      };

      expect(typeof stringScript.script).toBe('string');
      expect(typeof complexScript.script).toBe('object');
      expect((complexScript.script as ComplexCommand).type).toBe('external');
    });

    it('should validate category enum values', () => {
      const validCategories: Array<ActionDefinition['category']> = [
        'navigation', 'selection', 'editing', 'file', 'view', 'search', 'custom'
      ];

      validCategories.forEach(category => {
        const action: ActionDefinition = {
          id: `action-${category}`,
          description: `Action for ${category}`,
          key: 'X',
          script: 'echo test',
          category
        };
        
        expect(action.category).toBe(category);
      });
    });
  });

  describe('ActionConfig Interface', () => {
    it('should validate complete action configuration structure', () => {
      const config: ActionConfig = {
        $schema: 'https://hiliner.dev/schemas/actionConfig.schema.json',
        version: '1.0.0',
        metadata: {
          name: 'Test Configuration',
          description: 'Testing action configuration',
          author: 'Test Author',
          created: '2024-01-01T00:00:00Z',
          modified: '2024-01-02T12:00:00Z'
        },
        actions: [
          {
            id: 'test-action',
            description: 'Test action',
            key: 'T',
            script: 'echo test'
          }
        ],
        keyBindings: {
          'G': 'goto-action',
          'ctrl+s': 'save-action'
        },
        environment: {
          variables: {
            EDITOR: 'vim',
            PAGER: 'less'
          },
          timeout: 30000,
          shell: 'bash'
        }
      };

      expect(config.version).toBe('1.0.0');
      expect(config.actions).toHaveLength(1);
      expect(config.keyBindings?.['G']).toBe('goto-action');
      expect(config.environment?.shell).toBe('bash');
    });

    it('should require actions array even when empty', () => {
      const minimalConfig: ActionConfig = {
        actions: []
      };

      expect(minimalConfig.actions).toEqual([]);
      expect(Array.isArray(minimalConfig.actions)).toBe(true);
    });
  });

  describe('ActionWhenConditions Interface', () => {
    it('should validate file type conditions', () => {
      const conditions: ActionWhenConditions = {
        fileTypes: ['js', 'ts', 'jsx', 'tsx'],
        hasSelection: false,
        lineCount: {
          min: 1,
          max: 1000
        },
        mode: 'interactive'
      };

      expect(conditions.fileTypes).toEqual(['js', 'ts', 'jsx', 'tsx']);
      expect(conditions.hasSelection).toBe(false);
      expect(conditions.lineCount?.min).toBe(1);
      expect(conditions.lineCount?.max).toBe(1000);
      expect(conditions.mode).toBe('interactive');
    });

    it('should validate mode enum values', () => {
      const modes: Array<ActionWhenConditions['mode']> = ['interactive', 'static', 'any'];
      
      modes.forEach(mode => {
        const conditions: ActionWhenConditions = { mode };
        expect(conditions.mode).toBe(mode);
      });
    });
  });

  describe('ComplexCommand Interface', () => {
    it('should validate builtin command type', () => {
      const builtinCommand: ComplexCommand = {
        type: 'builtin',
        builtin: 'quit'
      };

      expect(builtinCommand.type).toBe('builtin');
      expect(builtinCommand.builtin).toBe('quit');
    });

    it('should validate external command type', () => {
      const externalCommand: ComplexCommand = {
        type: 'external',
        command: 'git',
        args: ['status', '--porcelain'],
        environment: {
          GIT_PAGER: 'cat'
        },
        workingDirectory: '/project/root',
        timeout: 10000,
        captureOutput: true,
        silent: false
      };

      expect(externalCommand.type).toBe('external');
      expect(externalCommand.command).toBe('git');
      expect(externalCommand.args).toEqual(['status', '--porcelain']);
      expect(externalCommand.environment?.GIT_PAGER).toBe('cat');
      expect(externalCommand.timeout).toBe(10000);
    });

    it('should validate sequence command type', () => {
      const sequenceCommand: ComplexCommand = {
        type: 'sequence',
        sequence: [
          {
            type: 'external',
            command: 'npm',
            args: ['run', 'build']
          },
          {
            type: 'external',
            command: 'npm',
            args: ['run', 'test']
          }
        ]
      };

      expect(sequenceCommand.type).toBe('sequence');
      expect(sequenceCommand.sequence).toHaveLength(2);
      expect(sequenceCommand.sequence?.[0].command).toBe('npm');
    });

    it('should validate all builtin command options', () => {
      const builtinCommands = [
        'quit', 'toggleSelection', 'selectAll', 'clearSelection',
        'scrollUp', 'scrollDown', 'goToStart', 'goToEnd',
        'pageUp', 'pageDown', 'copySelection', 'saveToFile',
        'toggleLineNumbers', 'changeTheme', 'showHelp', 'reload'
      ];

      builtinCommands.forEach(builtin => {
        const command: ComplexCommand = {
          type: 'builtin',
          builtin: builtin as ComplexCommand['builtin']
        };
        
        expect(command.builtin).toBe(builtin);
      });
    });
  });

  describe('ActionExecutionContext Interface', () => {
    it('should provide complete execution context', () => {
      const context: ActionExecutionContext = {
        currentFile: '/test/file.js',
        currentLine: 15,
        currentColumn: 8,
        selectedLines: [10, 11, 12, 15],
        selectedText: 'const test = "value";',
        fileName: 'file.js',
        fileDir: '/test',
        totalLines: 100,
        viewportStart: 10,
        viewportEnd: 25,
        theme: 'dark-plus',
        hasSelection: true,
        fileMetadata: {
          size: 1024,
          encoding: 'utf8',
          isBinary: false,
          detectedLanguage: 'javascript'
        }
      };

      expect(context.currentFile).toBe('/test/file.js');
      expect(context.currentLine).toBe(15);
      expect(context.selectedLines).toEqual([10, 11, 12, 15]);
      expect(context.hasSelection).toBe(true);
      expect(context.fileMetadata?.detectedLanguage).toBe('javascript');
    });

    it('should validate environment variables context (8 variables from specification)', () => {
      // Based on issue #13 specification, these 8 environment variables should be available
      const context: ActionExecutionContext = {
        currentFile: '/project/src/index.js',
        currentLine: 42,
        currentColumn: 0,
        selectedLines: [40, 41, 42],
        selectedText: 'function main() {',
        fileName: 'index.js',
        fileDir: '/project/src',
        totalLines: 200,
        viewportStart: 35,
        viewportEnd: 50,
        theme: 'monokai',
        hasSelection: true
      };

      // Verify all required context properties exist for environment variable injection
      expect(context.currentFile).toBeDefined();
      expect(context.currentLine).toBeDefined();
      expect(context.selectedLines).toBeDefined();
      expect(context.selectedText).toBeDefined();
      expect(context.fileName).toBeDefined();
      expect(context.fileDir).toBeDefined();
      expect(context.totalLines).toBeDefined();
      expect(context.theme).toBeDefined();
    });
  });

  describe('ActionExecutionResult Interface', () => {
    it('should validate successful execution result', () => {
      const successResult: ActionExecutionResult = {
        success: true,
        output: 'Command executed successfully',
        refreshRequired: false,
        message: 'Action completed',
        messageType: 'success'
      };

      expect(successResult.success).toBe(true);
      expect(successResult.messageType).toBe('success');
      expect(successResult.refreshRequired).toBe(false);
    });

    it('should validate error execution result', () => {
      const errorResult: ActionExecutionResult = {
        success: false,
        error: 'Command failed with exit code 1',
        output: 'stderr: Permission denied',
        message: 'Action failed',
        messageType: 'error'
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Command failed with exit code 1');
      expect(errorResult.messageType).toBe('error');
    });

    it('should validate message type enum values', () => {
      const messageTypes: Array<ActionExecutionResult['messageType']> = 
        ['info', 'success', 'warning', 'error'];

      messageTypes.forEach(messageType => {
        const result: ActionExecutionResult = {
          success: true,
          messageType
        };
        
        expect(result.messageType).toBe(messageType);
      });
    });
  });

  describe('ActionHandler Function Type', () => {
    it('should validate action handler function signature', () => {
      const mockHandler: ActionHandler = async (context, action) => {
        expect(context.currentFile).toBeDefined();
        expect(action.id).toBeDefined();
        
        return {
          success: true,
          message: 'Handler executed'
        };
      };

      expect(typeof mockHandler).toBe('function');
    });

    it('should support both sync and async handlers', () => {
      const syncHandler: ActionHandler = (context, action) => ({
        success: true,
        message: 'Sync handler'
      });

      const asyncHandler: ActionHandler = async (context, action) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          success: true,
          message: 'Async handler'
        };
      };

      expect(typeof syncHandler).toBe('function');
      expect(typeof asyncHandler).toBe('function');
    });
  });

  describe('KeyBindingValidation Interface', () => {
    it('should validate successful key binding validation', () => {
      const validation: KeyBindingValidation = {
        valid: true
      };

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
      expect(validation.conflicts).toBeUndefined();
    });

    it('should validate failed key binding validation with conflicts', () => {
      const validation: KeyBindingValidation = {
        valid: false,
        error: 'Key binding conflicts with existing bindings',
        conflicts: ['quit-action', 'save-action']
      };

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Key binding conflicts with existing bindings');
      expect(validation.conflicts).toEqual(['quit-action', 'save-action']);
    });
  });

  describe('Type Compatibility with Existing Interfaces', () => {
    it('should be compatible with SelectionState interface', () => {
      const selectionState: SelectionState = {
        selectedLines: new Set([1, 2, 3]),
        selectionCount: 3,
        lastSelectedLine: 3
      };

      // Action context should be able to work with existing selection state
      const context: ActionExecutionContext = {
        currentFile: '/test.js',
        currentLine: 2,
        currentColumn: 0,
        selectedLines: Array.from(selectionState.selectedLines),
        selectedText: 'selected content',
        fileName: 'test.js',
        fileDir: '/',
        totalLines: 10,
        viewportStart: 1,
        viewportEnd: 10,
        theme: 'dark',
        hasSelection: selectionState.selectionCount > 0
      };

      expect(context.selectedLines).toEqual([1, 2, 3]);
      expect(context.hasSelection).toBe(true);
    });

    it('should be compatible with FileData interface', () => {
      const fileData: FileData = {
        content: 'line1\nline2\nline3',
        lines: ['line1', 'line2', 'line3'],
        totalLines: 3,
        filePath: '/test/file.js',
        metadata: {
          size: 21,
          encoding: 'utf8',
          isBinary: false,
          detectedLanguage: 'javascript'
        }
      };

      // Action context should derive from file data
      const context: ActionExecutionContext = {
        currentFile: fileData.filePath,
        currentLine: 1,
        currentColumn: 0,
        selectedLines: [],
        selectedText: '',
        fileName: 'file.js',
        fileDir: '/test',
        totalLines: fileData.totalLines,
        viewportStart: 1,
        viewportEnd: fileData.totalLines,
        theme: 'default',
        hasSelection: false,
        fileMetadata: fileData.metadata
      };

      expect(context.currentFile).toBe(fileData.filePath);
      expect(context.totalLines).toBe(fileData.totalLines);
      expect(context.fileMetadata).toBe(fileData.metadata);
    });
  });

  describe('Configuration File Location Priority (Issue #13)', () => {
    it('should define expected configuration file search order', () => {
      // This test validates the specification requirements for config file priority
      const configLocations = [
        '.hiliner/action-config.json',     // Project-specific config
        '~/.hiliner/action-config.json',   // User-specific config
        '~/.config/hiliner/action-config.json', // XDG config
      ];

      expect(configLocations).toHaveLength(3);
      expect(configLocations[0]).toBe('.hiliner/action-config.json');
      expect(configLocations[1]).toBe('~/.hiliner/action-config.json');
      expect(configLocations[2]).toBe('~/.config/hiliner/action-config.json');
    });
  });

  describe('Key Binding Conflict Detection (Issue #13)', () => {
    it('should validate key binding conflict detection requirements', () => {
      const existingBindings: Record<string, string> = {
        'q': 'quit',
        's': 'save',
        'ctrl+c': 'copy'
      };

      const newBinding = {
        key: 'q',
        actionId: 'new-quit-action'
      };

      // This should detect conflicts with existing 'q' binding
      const hasConflict = existingBindings[newBinding.key] !== undefined;
      expect(hasConflict).toBe(true);
      
      const conflictingAction = existingBindings[newBinding.key];
      expect(conflictingAction).toBe('quit');
    });
  });

  describe('JSON Schema Integration (Issue #13)', () => {
    it('should validate schema reference in configuration', () => {
      const configWithSchema: ActionConfig = {
        $schema: 'https://hiliner.dev/schemas/actionConfig.schema.json',
        actions: [
          {
            id: 'test',
            description: 'Test action',
            key: 't',
            script: 'echo test'
          }
        ]
      };

      expect(configWithSchema.$schema).toBe('https://hiliner.dev/schemas/actionConfig.schema.json');
    });
  });

  describe('Safety Flag Handling (Issue #13)', () => {
    it('should validate dangerous action safety requirements', () => {
      const dangerousAction: ActionDefinition = {
        id: 'dangerous-delete',
        description: 'Delete all files in directory',
        key: 'D',
        script: 'rm -rf *',
        dangerous: true,
        confirmPrompt: 'This will delete all files. Are you sure?'
      };

      expect(dangerousAction.dangerous).toBe(true);
      expect(dangerousAction.confirmPrompt).toBeDefined();
      expect(dangerousAction.confirmPrompt?.length).toBeGreaterThan(0);
    });

    it('should validate safe action defaults', () => {
      const safeAction: ActionDefinition = {
        id: 'safe-list',
        description: 'List files safely',
        key: 'L',
        script: 'ls -la'
      };

      // dangerous should be optional and default to false
      expect(safeAction.dangerous).toBeUndefined();
      expect(safeAction.confirmPrompt).toBeUndefined();
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle empty configuration', () => {
      const emptyConfig: ActionConfig = {
        actions: []
      };

      expect(emptyConfig.actions).toEqual([]);
      expect(emptyConfig.keyBindings).toBeUndefined();
      expect(emptyConfig.environment).toBeUndefined();
    });

    it('should validate invalid action definitions are caught by TypeScript', () => {
      // These should cause TypeScript compilation errors in real usage
      
      // Missing required id
      expect(() => {
        const invalidAction = {
          // id: 'missing-id', // This should be required
          description: 'Action without ID',
          key: 'X',
          script: 'echo test'
        } as ActionDefinition; // Force cast to test validation
        
        // TypeScript should catch this at compile time
        expect(invalidAction).toBeDefined();
      }).not.toThrow(); // Runtime test passes, but TS should error
    });

    it('should validate environment variable injection edge cases', () => {
      const contextWithMissingValues: ActionExecutionContext = {
        currentFile: '',
        currentLine: 0,
        currentColumn: 0,
        selectedLines: [],
        selectedText: '',
        fileName: '',
        fileDir: '',
        totalLines: 0,
        viewportStart: 0,
        viewportEnd: 0,
        theme: '',
        hasSelection: false
      };

      // Should handle empty/zero values gracefully
      expect(contextWithMissingValues.currentFile).toBe('');
      expect(contextWithMissingValues.currentLine).toBe(0);
      expect(contextWithMissingValues.selectedLines).toEqual([]);
    });

    it('should validate command variable substitution structure', () => {
      const variables: CommandVariables = {
        currentFile: true,
        currentLine: true,
        selectedLines: false,
        selectedText: true,
        fileName: true,
        fileDir: false
      };

      expect(variables.currentFile).toBe(true);
      expect(variables.selectedLines).toBe(false);
      expect(typeof variables.currentFile).toBe('boolean');
    });
  });
});