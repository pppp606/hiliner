/**
 * Action System Integration Tests
 * 
 * Tests the complete end-to-end functionality of the action system including:
 * - Action Registry → Context building → Variable substitution
 * - Built-in actions integration with the system
 * - Error handling across components
 */

import { ActionRegistry, ActionRegistryError, ActionRegistryErrorType } from '../src/utils/actionRegistry.js';
import { buildActionContext, substituteVariables } from '../src/utils/actionContext.js';
import type { ActionConfig, ActionDefinition } from '../src/types/actionConfig.js';
import type { SelectionState, FileData } from '../src/types.js';

// Test data fixtures
const mockFileData: FileData = {
  content: 'console.log("Hello, World!");\nconst x = 42;\nfunction test() {\n  return x * 2;\n}',
  lines: ['console.log("Hello, World!");', 'const x = 42;', 'function test() {', '  return x * 2;', '}'],
  totalLines: 5,
  filePath: '/Users/test/example.js',
  metadata: {
    size: 1024,
    lastModified: new Date('2024-01-15T10:00:00Z'),
    encoding: 'utf-8',
    detectedLanguage: 'javascript'
  }
};

const mockSelection: SelectionState = {
  selectedLines: new Set([1, 2, 3]),
  selectionCount: 3,
  lastSelectedLine: 3
};

const sampleActions: ActionDefinition[] = [
  {
    id: 'copy-selection',
    name: 'Copy Selection',
    description: 'Copy selected text to clipboard',
    key: 'c',
    script: 'echo "{{selectedText}}" | pbcopy',
    category: 'editing'
  },
  {
    id: 'open-editor',
    name: 'Open in Editor', 
    description: 'Open file in external editor',
    key: 'e',
    script: {
      type: 'external',
      command: 'code',
      args: ['{{filePath}}:{{currentLine}}'],
      timeout: 5000
    },
    category: 'file'
  },
  {
    id: 'format-and-reload',
    name: 'Format and Reload',
    description: 'Format file and reload content',
    key: 'f',
    script: {
      type: 'sequence',
      sequence: [
        {
          type: 'external',
          command: 'prettier',
          args: ['--write', '{{filePath}}']
        },
        {
          type: 'builtin',
          builtin: 'reload'
        }
      ]
    },
    when: {
      fileTypes: ['.js', '.ts', '.json']
    },
    category: 'editing'
  },
  {
    id: 'dangerous-delete',
    name: 'Delete File',
    description: 'Delete the current file',
    key: 'D',
    script: 'rm "{{filePath}}"',
    dangerous: true,
    confirmPrompt: 'Are you sure you want to delete this file?',
    category: 'file'
  }
];

const sampleKeyBindings = {
  'r': 'reload-file',
  '?': 'show-help'
};

const sampleEnvironment = {
  variables: {
    EDITOR: 'code',
    PAGER: 'less',
    HILINER_TEST: 'integration'
  },
  timeout: 10000,
  shell: 'bash' as const
};

describe('Action System Integration Tests', () => {
  describe('Action Registry and Context Building Integration', () => {
    test('should register actions and build context for execution', () => {
      // Initialize Action Registry with sample actions
      const actionRegistry = new ActionRegistry(
        sampleActions,
        sampleKeyBindings,
        sampleEnvironment
      );

      // Verify actions are registered
      const allActions = actionRegistry.getAllActions();
      expect(allActions.length).toBeGreaterThanOrEqual(4); // At least 4 custom + built-ins
      
      const copyAction = actionRegistry.getActionById('copy-selection');
      expect(copyAction).toBeDefined();
      expect(copyAction?.key).toBe('c');
      expect(copyAction?.script).toBe('echo "{{selectedText}}" | pbcopy');

      // Build context as would happen during runtime
      const context = buildActionContext(mockSelection, mockFileData, 2);
      
      // Test that we can get action and substitute variables
      if (copyAction) {
        const substitutedScript = substituteVariables(
          copyAction.script as string, 
          context
        );
        expect(substitutedScript).toContain('console.log');
      }
    });

    test('should handle built-in and custom actions together', () => {
      const actionRegistry = new ActionRegistry(sampleActions, sampleKeyBindings, sampleEnvironment);

      // Verify both built-in and custom actions are available
      const allActions = actionRegistry.getAllActions();
      expect(allActions.length).toBeGreaterThanOrEqual(7); // built-ins + 4 custom

      // Check specific built-in action
      const quitAction = actionRegistry.getActionById('quit');
      expect(quitAction).toBeDefined();
      expect(quitAction?.script).toMatchObject({
        type: 'builtin',
        builtin: 'quit'
      });

      // Check custom action  
      const copyAction = actionRegistry.getActionById('copy-selection');
      expect(copyAction?.script).toBe('echo "{{selectedText}}" | pbcopy');
    });
  });

  describe('Context Building and Variable Substitution', () => {
    test('should build action context correctly from file data and selection', () => {
      const context = buildActionContext(mockSelection, mockFileData, 2);

      // Check environment variables
      expect(context.environmentVariables).toMatchObject({
        SELECTED_TEXT: expect.stringContaining('console.log("Hello, World!")'),
        FILE_PATH: '/Users/test/example.js',
        LINE_START: '1',
        LINE_END: '3',
        LANGUAGE: 'javascript',
        SELECTION_COUNT: '3',
        TOTAL_LINES: '5',
        CURRENT_LINE: '2'
      });

      // Check template variables
      expect(context.templateVariables).toMatchObject({
        selectedText: expect.stringContaining('console.log("Hello, World!")'),
        filePath: '/Users/test/example.js',
        lineStart: '1',
        lineEnd: '3',
        language: 'javascript',
        selectionCount: '3',
        totalLines: '5',
        currentLine: '2'
      });
    });

    test('should substitute variables in action scripts correctly', () => {
      const context = buildActionContext(mockSelection, mockFileData, 2);

      // Test simple string substitution
      const simpleScript = 'echo "Selected: {{selectedText}}" > {{filePath}}.backup';
      const substituted = substituteVariables(simpleScript, context);
      expect(substituted).toContain('/Users/test/example.js.backup');
      expect(substituted).toContain('console.log');

      // Test multiple variable substitution
      const complexScript = 'grep -n "test" {{filePath}} | head -{{selectionCount}}';
      const substituted2 = substituteVariables(complexScript, context);
      expect(substituted2).toContain('/Users/test/example.js');
      expect(substituted2).toContain('head -3');
    });

    test('should handle missing variables gracefully', () => {
      const context = buildActionContext(mockSelection, mockFileData, 2);
      const scriptWithMissingVar = 'echo "{{nonExistentVariable}}" {{filePath}}';
      
      const substituted = substituteVariables(scriptWithMissingVar, context);
      // Missing variables should remain as-is
      expect(substituted).toBe('echo "{{nonExistentVariable}}" /Users/test/example.js');
    });
  });

  describe('Built-in Actions Integration', () => {
    test('should handle key binding conflicts between built-in and custom actions', () => {
      const conflictingActions: ActionDefinition[] = [
        {
          id: 'custom-quit',
          name: 'Custom Quit',
          description: 'Custom quit action',
          key: 'q', // Conflicts with built-in quit
          script: 'echo "custom quit"',
          category: 'custom'
        }
      ];

      // This should either handle the conflict or throw an error
      expect(() => {
        new ActionRegistry(conflictingActions);
      }).not.toThrow(); // ActionRegistry should handle conflicts gracefully
      
      const actionRegistry = new ActionRegistry(conflictingActions);
      const action = actionRegistry.getActionByKey('q');
      expect(action).toBeDefined();
    });
  });

  describe('Error Handling Across Components', () => {
    test('should handle action registry errors appropriately', () => {
      const invalidActions: ActionDefinition[] = [
        {
          id: 'test',
          key: '', // Invalid empty key
          script: 'echo "test"',
          category: 'custom',
          description: 'Test action'
        } as ActionDefinition
      ];

      expect(() => {
        new ActionRegistry(invalidActions);
      }).not.toThrow(); // ActionRegistry handles invalid actions gracefully
    });

    test('should handle context building with invalid data', () => {
      // Test with empty file data
      const emptyFileData: FileData = {
        content: '',
        lines: [],
        totalLines: 0,
        filePath: '',
        metadata: {
          size: 0,
          lastModified: new Date(),
          encoding: 'utf-8'
        }
      };

      const emptySelection: SelectionState = {
        selectedLines: new Set(),
        selectionCount: 0,
        lastSelectedLine: 1
      };

      const context = buildActionContext(emptySelection, emptyFileData, 1);
      
      expect(context.environmentVariables.SELECTED_TEXT).toBe('');
      expect(context.environmentVariables.FILE_PATH).toBe('');
      expect(context.environmentVariables.SELECTION_COUNT).toBe('0');
      expect(context.environmentVariables.TOTAL_LINES).toBe('0');

      // Test variable substitution with empty context
      const script = 'echo "{{selectedText}}" {{filePath}}';
      const substituted = substituteVariables(script, context);
      expect(substituted).toBe('echo "" ');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large action configurations efficiently', () => {
      // Create a large configuration with many actions
      const largeActions: ActionDefinition[] = [];

      // Generate 100 test actions
      for (let i = 0; i < 100; i++) {
        largeActions.push({
          id: `action-${i}`,
          name: `Action ${i}`,
          description: `Test action number ${i}`,
          key: `${i}`, // Use number as key to avoid conflicts
          script: `echo "Action ${i} executed"`,
          category: 'custom'
        });
      }

      const startTime = Date.now();
      const actionRegistry = new ActionRegistry(largeActions);
      
      // Should complete within reasonable time (< 1 second)
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify actions were loaded
      const allActions = actionRegistry.getAllActions();
      expect(allActions.length).toBeGreaterThan(100); // 100 custom + built-ins
    });

    test('should handle large text selections efficiently', () => {
      // Create large file content
      const largeContent = Array(10000).fill(0).map((_, i) => `Line ${i + 1}: This is a test line with some content`);
      const largeFileData: FileData = {
        content: largeContent.join('\n'),
        lines: largeContent,
        totalLines: largeContent.length,
        filePath: '/test/large-file.txt',
        metadata: {
          size: largeContent.join('\n').length,
          lastModified: new Date(),
          encoding: 'utf-8',
          detectedLanguage: 'text'
        }
      };

      // Select a large range
      const largeSelection: SelectionState = {
        selectedLines: new Set(Array.from({ length: 1001 }, (_, i) => i + 1000)),
        selectionCount: 1001,
        lastSelectedLine: 2000
      };

      const startTime = Date.now();
      const context = buildActionContext(largeSelection, largeFileData, 1500);
      const endTime = Date.now();

      // Should complete quickly even with large selection
      expect(endTime - startTime).toBeLessThan(100);

      // Verify correct calculation
      expect(context.environmentVariables.SELECTION_COUNT).toBe('1001');
      expect(context.environmentVariables.TOTAL_LINES).toBe('10000');
      expect(context.environmentVariables.CURRENT_LINE).toBe('1500');

      // Verify selected text contains expected content
      expect(context.environmentVariables.SELECTED_TEXT).toContain('Line 1000:');
      expect(context.environmentVariables.SELECTED_TEXT).toContain('Line 2000:');
    });
  });

  describe('Full Action Execution Workflow', () => {
    test('should simulate complete action execution workflow', () => {
      // Step 1: Initialize system (as would happen in CLI)
      const actionRegistry = new ActionRegistry(sampleActions, sampleKeyBindings, sampleEnvironment);

      // Step 2: User navigates and makes selection (as would happen in UI)
      const currentSelection = mockSelection;
      const currentFile = mockFileData;
      const currentLine = 2;

      // Step 3: User presses key to trigger action
      const triggeredKey = 'c';
      const action = actionRegistry.getActionByKey(triggeredKey);
      expect(action).toBeDefined();
      expect(action?.id).toBe('copy-selection');

      // Step 4: Build context for action execution
      const context = buildActionContext(currentSelection, currentFile, currentLine);

      // Step 5: Substitute variables in action script
      if (action) {
        const executableScript = substituteVariables(action.script as string, context);
        expect(executableScript).toContain('console.log');
        expect(executableScript).toContain('pbcopy');
      }
    });

    test('should handle complex action with external command structure', () => {
      const actionRegistry = new ActionRegistry(sampleActions, sampleKeyBindings, sampleEnvironment);
      
      // Get the open-editor action which has external command structure
      const action = actionRegistry.getActionById('open-editor');
      expect(action).toBeDefined();
      expect(action?.script).toMatchObject({
        type: 'external',
        command: 'code',
        args: expect.arrayContaining(['{{filePath}}:{{currentLine}}'])
      });

      const context = buildActionContext(mockSelection, mockFileData, 2);
      
      // For complex script structures, variable substitution would happen
      // at the individual arg/command level during execution
      if (action && typeof action.script === 'object' && 'args' in action.script) {
        const substitutedArgs = action.script.args?.map(arg => 
          substituteVariables(arg, context)
        );
        expect(substitutedArgs?.[0]).toBe('/Users/test/example.js:2');
      }
    });

    test('should handle sequence actions with multiple steps', () => {
      const actionRegistry = new ActionRegistry(sampleActions, sampleKeyBindings, sampleEnvironment);
      
      // Get the format-and-reload action which has sequence structure
      const action = actionRegistry.getActionById('format-and-reload');
      expect(action).toBeDefined();
      expect(action?.script).toMatchObject({
        type: 'sequence',
        sequence: expect.arrayContaining([
          expect.objectContaining({ type: 'external', command: 'prettier' }),
          expect.objectContaining({ type: 'builtin', builtin: 'reload' })
        ])
      });

      // This demonstrates that the system can handle complex action structures
      // The actual execution would iterate through sequence steps
      const context = buildActionContext(mockSelection, mockFileData, 2);
      
      if (action && typeof action.script === 'object' && 'sequence' in action.script) {
        const sequence = action.script.sequence;
        
        // First step should be external prettier command
        const firstStep = sequence[0];
        expect(firstStep.type).toBe('external');
        expect(firstStep.command).toBe('prettier');
        
        // Second step should be builtin reload
        const secondStep = sequence[1];
        expect(secondStep.type).toBe('builtin');
        if ('builtin' in secondStep) {
          expect(secondStep.builtin).toBe('reload');
        }
      }
    });
  });
});