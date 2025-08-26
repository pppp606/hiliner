/**
 * Tests for Action Registry System (TDD RED Phase)
 * 
 * These tests define the expected behavior of the Action Registry system 
 * before implementation exists. They are designed to FAIL initially to
 * validate the TDD methodology based on issue #13 specifications.
 * 
 * Key Requirements Tested:
 * - Config file loading with priority system
 * - Key binding conflict detection and error handling
 * - Action retrieval by ID and key binding  
 * - Action validation against schema
 * - Built-in action registration
 * - Error handling for invalid configurations
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  ActionRegistry,
  ActionRegistryError,
  ActionRegistryErrorType,
  createActionRegistry,
  loadActionConfig,
  validateActionConfig,
  resolveConfigPath,
  detectKeyBindingConflicts
} from '../actionRegistry.js';
import type {
  ActionConfig,
  ActionDefinition,
  KeyBindingValidation,
  ActionExecutionContext
} from '../../types/actionConfig.js';

describe('Action Registry System (TDD RED Phase)', () => {
  const tempConfigDir = path.join(os.tmpdir(), 'hiliner-test-config');
  const projectConfigPath = path.join(tempConfigDir, '.hiliner', 'action-config.json');
  const userConfigPath = path.join(tempConfigDir, '.hiliner-user', 'action-config.json');
  const xdgConfigPath = path.join(tempConfigDir, '.config', 'hiliner', 'action-config.json');

  // Mock process.cwd() and os.homedir() for consistent testing
  const originalCwd = process.cwd();
  const originalHomedir = os.homedir();

  beforeEach(async () => {
    // Create temp config directories
    await fs.mkdir(path.dirname(projectConfigPath), { recursive: true });
    await fs.mkdir(path.dirname(userConfigPath), { recursive: true });
    await fs.mkdir(path.dirname(xdgConfigPath), { recursive: true });

    // Mock environment paths
    jest.spyOn(process, 'cwd').mockReturnValue(tempConfigDir);
    jest.spyOn(os, 'homedir').mockReturnValue(path.join(tempConfigDir, '.hiliner-user'));
  });

  afterEach(async () => {
    // Restore original functions
    (process.cwd as jest.MockedFunction<typeof process.cwd>).mockRestore();
    (os.homedir as jest.MockedFunction<typeof os.homedir>).mockRestore();

    // Clean up temp files
    try {
      await fs.rm(tempConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('ActionRegistry Class', () => {
    it('should create registry instance with built-in actions loaded', async () => {
      const registry = await createActionRegistry();

      expect(registry).toBeInstanceOf(ActionRegistry);
      expect(registry.getBuiltinActions()).toBeDefined();
      expect(registry.getBuiltinActions().length).toBeGreaterThan(0);
      
      // Verify essential built-in actions exist
      const builtinIds = registry.getBuiltinActions().map(a => a.id);
      expect(builtinIds).toContain('quit');
      expect(builtinIds).toContain('toggleSelection');
      expect(builtinIds).toContain('scrollUp');
      expect(builtinIds).toContain('scrollDown');
    });

    it('should load configuration files in correct priority order', async () => {
      // Create config files with different priorities
      const projectConfig: ActionConfig = {
        actions: [
          {
            id: 'project-action',
            description: 'Project-specific action',
            key: 'P',
            script: 'echo "project"'
          }
        ]
      };

      const userConfig: ActionConfig = {
        actions: [
          {
            id: 'user-action',
            description: 'User-specific action',
            key: 'U',
            script: 'echo "user"'
          },
          {
            id: 'project-action', // Same ID as project - should be overridden
            description: 'User version of project action',
            key: 'P',
            script: 'echo "user override"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(projectConfig));
      await fs.writeFile(userConfigPath, JSON.stringify(userConfig));

      const registry = await createActionRegistry();

      // Project config should take priority over user config
      const projectAction = registry.getActionById('project-action');
      expect(projectAction).toBeDefined();
      expect(projectAction?.script).toBe('echo "project"');
      expect(projectAction?.description).toBe('Project-specific action');

      // User-only action should still be available
      const userAction = registry.getActionById('user-action');
      expect(userAction).toBeDefined();
      expect(userAction?.script).toBe('echo "user"');
    });

    it('should detect and prevent key binding conflicts', async () => {
      const conflictingConfig: ActionConfig = {
        actions: [
          {
            id: 'action1',
            description: 'First action',
            key: 'q', // Conflicts with built-in quit
            script: 'echo "first"'
          },
          {
            id: 'action2', 
            description: 'Second action',
            key: 'T',
            script: 'echo "second"'
          },
          {
            id: 'action3',
            description: 'Third action', 
            key: 'T', // Conflicts with action2
            script: 'echo "third"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(conflictingConfig));

      // Registry creation should fail due to conflicts
      await expect(createActionRegistry()).rejects.toThrow(ActionRegistryError);
      await expect(createActionRegistry()).rejects.toThrow(/key binding conflict/i);
    });

    it('should retrieve actions by ID', async () => {
      const config: ActionConfig = {
        actions: [
          {
            id: 'test-action',
            description: 'Test action for ID lookup',
            key: 'T',
            script: 'echo "test"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(config));
      const registry = await createActionRegistry();

      const action = registry.getActionById('test-action');
      expect(action).toBeDefined();
      expect(action?.id).toBe('test-action');
      expect(action?.description).toBe('Test action for ID lookup');
      expect(action?.key).toBe('T');

      const nonExistent = registry.getActionById('does-not-exist');
      expect(nonExistent).toBeUndefined();
    });

    it('should retrieve actions by key binding', async () => {
      const config: ActionConfig = {
        actions: [
          {
            id: 'key-test',
            description: 'Action bound to K',
            key: 'K',
            script: 'echo "K pressed"'
          },
          {
            id: 'ctrl-test',
            description: 'Action bound to Ctrl+S',
            key: 'ctrl+s',
            script: 'echo "Ctrl+S pressed"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(config));
      const registry = await createActionRegistry();

      const kAction = registry.getActionByKey('K');
      expect(kAction).toBeDefined();
      expect(kAction?.id).toBe('key-test');

      const ctrlAction = registry.getActionByKey('ctrl+s');
      expect(ctrlAction).toBeDefined();
      expect(ctrlAction?.id).toBe('ctrl-test');

      const nonExistent = registry.getActionByKey('Z');
      expect(nonExistent).toBeUndefined();
    });

    it('should handle alternative key bindings', async () => {
      const config: ActionConfig = {
        actions: [
          {
            id: 'multi-key-action',
            description: 'Action with multiple key bindings',
            key: 'M',
            alternativeKeys: ['m', 'ctrl+m'],
            script: 'echo "multi-key"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(config));
      const registry = await createActionRegistry();

      // Should be accessible via primary key
      expect(registry.getActionByKey('M')).toBeDefined();
      
      // Should be accessible via alternative keys
      expect(registry.getActionByKey('m')).toBeDefined();
      expect(registry.getActionByKey('ctrl+m')).toBeDefined();

      // All should return the same action
      const action1 = registry.getActionByKey('M');
      const action2 = registry.getActionByKey('m');
      const action3 = registry.getActionByKey('ctrl+m');
      
      expect(action1?.id).toBe('multi-key-action');
      expect(action2?.id).toBe('multi-key-action');
      expect(action3?.id).toBe('multi-key-action');
    });

    it('should validate action definitions against schema', async () => {
      const invalidConfig = {
        actions: [
          {
            // Missing required 'id' field
            description: 'Invalid action',
            key: 'I',
            script: 'echo "invalid"'
          },
          {
            id: 'invalid-key',
            description: 'Action with invalid key',
            key: '', // Empty key should be invalid
            script: 'echo "test"'
          },
          {
            id: 'invalid-script',
            description: 'Action with invalid script',
            key: 'S'
            // Missing script field
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(invalidConfig));

      await expect(createActionRegistry()).rejects.toThrow(ActionRegistryError);
      await expect(createActionRegistry()).rejects.toThrow(/validation failed/i);
    });

    it('should handle when conditions for action filtering', async () => {
      const config: ActionConfig = {
        actions: [
          {
            id: 'js-only-action',
            description: 'JavaScript-only action',
            key: 'J',
            script: 'echo "js action"',
            when: {
              fileTypes: ['js', 'ts', 'jsx', 'tsx'],
              mode: 'interactive'
            }
          },
          {
            id: 'selection-required',
            description: 'Requires text selection',
            key: 'S',
            script: 'echo "selection action"',
            when: {
              hasSelection: true
            }
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(config));
      const registry = await createActionRegistry();

      const context: ActionExecutionContext = {
        currentFile: '/test/file.py',
        currentLine: 1,
        currentColumn: 0,
        selectedLines: [],
        selectedText: '',
        fileName: 'file.py',
        fileDir: '/test',
        totalLines: 10,
        viewportStart: 1,
        viewportEnd: 10,
        theme: 'dark',
        hasSelection: false,
        fileMetadata: {
          size: 100,
          encoding: 'utf8',
          isBinary: false,
          detectedLanguage: 'python'
        }
      };

      const availableActions = registry.getAvailableActions(context);
      
      // JS-only action should not be available for Python file
      const jsAction = availableActions.find(a => a.id === 'js-only-action');
      expect(jsAction).toBeUndefined();

      // Selection-required action should not be available without selection
      const selectionAction = availableActions.find(a => a.id === 'selection-required');
      expect(selectionAction).toBeUndefined();
    });

    it('should merge keyBindings configuration with action keys', async () => {
      const config: ActionConfig = {
        actions: [
          {
            id: 'direct-action',
            description: 'Action with direct key binding',
            key: 'D',
            script: 'echo "direct"'
          }
        ],
        keyBindings: {
          'G': 'direct-action', // Alternative binding via keyBindings
          'ctrl+g': 'direct-action'
        }
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(config));
      const registry = await createActionRegistry();

      // Should be accessible via original key
      expect(registry.getActionByKey('D')).toBeDefined();
      
      // Should be accessible via keyBindings mapping
      expect(registry.getActionByKey('G')).toBeDefined();
      expect(registry.getActionByKey('ctrl+g')).toBeDefined();

      // All should reference the same action
      const action1 = registry.getActionByKey('D');
      const action2 = registry.getActionByKey('G');
      const action3 = registry.getActionByKey('ctrl+g');

      expect(action1?.id).toBe('direct-action');
      expect(action2?.id).toBe('direct-action');
      expect(action3?.id).toBe('direct-action');
    });

    it('should provide environment context for action execution', async () => {
      const config: ActionConfig = {
        actions: [
          {
            id: 'env-action',
            description: 'Action needing environment context',
            key: 'E',
            script: 'echo $HILINER_CURRENT_FILE'
          }
        ],
        environment: {
          variables: {
            CUSTOM_VAR: 'custom-value'
          },
          timeout: 15000,
          shell: 'bash'
        }
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(config));
      const registry = await createActionRegistry();

      const environmentContext = registry.getEnvironmentContext();
      expect(environmentContext).toBeDefined();
      expect(environmentContext.variables).toEqual({
        CUSTOM_VAR: 'custom-value'
      });
      expect(environmentContext.timeout).toBe(15000);
      expect(environmentContext.shell).toBe('bash');
    });
  });

  describe('Configuration File Loading', () => {
    it('should resolve config paths in correct priority order', () => {
      const paths = resolveConfigPath();
      
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBe(3);
      
      // Should prioritize project-local config first
      expect(paths[0]).toContain('.hiliner');
      expect(paths[0]).toContain('action-config.json');
      
      // User config should be second priority
      expect(paths[1]).toContain(os.homedir());
      expect(paths[1]).toContain('.hiliner');
      
      // XDG config should be third priority  
      expect(paths[2]).toContain('.config');
      expect(paths[2]).toContain('hiliner');
    });

    it('should load valid configuration file', async () => {
      const validConfig: ActionConfig = {
        $schema: 'https://hiliner.dev/schemas/actionConfig.schema.json',
        version: '1.0.0',
        metadata: {
          name: 'Test Config',
          description: 'Test configuration',
          author: 'Test Author',
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        },
        actions: [
          {
            id: 'load-test',
            description: 'Test loading action',
            key: 'L',
            script: 'echo "loaded"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(validConfig));
      
      const config = await loadActionConfig(projectConfigPath);
      expect(config).toBeDefined();
      expect(config.actions).toHaveLength(1);
      expect(config.actions[0].id).toBe('load-test');
      expect(config.version).toBe('1.0.0');
      expect(config.metadata?.name).toBe('Test Config');
    });

    it('should handle missing configuration files gracefully', async () => {
      const nonExistentPath = path.join(tempConfigDir, 'does-not-exist.json');
      
      const config = await loadActionConfig(nonExistentPath);
      expect(config).toBeNull();
    });

    it('should handle malformed JSON configuration files', async () => {
      const malformedJson = '{ "actions": [ { "id": "test", "key": } ] }'; // Invalid JSON
      await fs.writeFile(projectConfigPath, malformedJson);

      await expect(loadActionConfig(projectConfigPath)).rejects.toThrow(ActionRegistryError);
      await expect(loadActionConfig(projectConfigPath)).rejects.toThrow(/invalid JSON/i);
    });

    it('should validate configuration schema', async () => {
      const invalidSchema = {
        actions: 'not an array', // Should be array
        keyBindings: ['not', 'an', 'object'] // Should be object
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(invalidSchema));

      await expect(loadActionConfig(projectConfigPath)).rejects.toThrow(ActionRegistryError);
      await expect(loadActionConfig(projectConfigPath)).rejects.toThrow(/schema validation/i);
    });

    it('should merge multiple configuration files correctly', async () => {
      const baseConfig: ActionConfig = {
        actions: [
          {
            id: 'base-action',
            description: 'Base action',
            key: 'B',
            script: 'echo "base"'
          }
        ],
        environment: {
          timeout: 30000
        }
      };

      const overrideConfig: ActionConfig = {
        actions: [
          {
            id: 'override-action',
            description: 'Override action',
            key: 'O',
            script: 'echo "override"'
          },
          {
            id: 'base-action', // Override base action
            description: 'Overridden base action',
            key: 'B',
            script: 'echo "overridden"'
          }
        ],
        environment: {
          timeout: 60000, // Override timeout
          shell: 'zsh'
        }
      };

      await fs.writeFile(userConfigPath, JSON.stringify(baseConfig));
      await fs.writeFile(projectConfigPath, JSON.stringify(overrideConfig));

      const registry = await createActionRegistry();

      // Should have both actions
      expect(registry.getActionById('override-action')).toBeDefined();
      expect(registry.getActionById('base-action')).toBeDefined();

      // Base action should be overridden by project config
      const baseAction = registry.getActionById('base-action');
      expect(baseAction?.description).toBe('Overridden base action');
      expect(baseAction?.script).toBe('echo "overridden"');

      // Environment should be merged with project taking priority
      const env = registry.getEnvironmentContext();
      expect(env.timeout).toBe(60000); // Overridden
      expect(env.shell).toBe('zsh'); // From override
    });
  });

  describe('Key Binding Conflict Detection', () => {
    it('should detect conflicts between custom actions', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action1',
          description: 'First action',
          key: 'A',
          script: 'echo "1"'
        },
        {
          id: 'action2',
          description: 'Second action', 
          key: 'A', // Conflict!
          script: 'echo "2"'
        }
      ];

      const conflicts = detectKeyBindingConflicts(actions, []);
      expect(conflicts.valid).toBe(false);
      expect(conflicts.error).toContain('duplicate key binding');
      expect(conflicts.conflicts).toContain('A');
    });

    it('should detect conflicts with built-in actions', () => {
      const builtinActions: ActionDefinition[] = [
        {
          id: 'builtin-quit',
          description: 'Quit application',
          key: 'q',
          script: { type: 'builtin', builtin: 'quit' }
        }
      ];

      const customActions: ActionDefinition[] = [
        {
          id: 'custom-action',
          description: 'Custom action',
          key: 'q', // Conflicts with built-in quit
          script: 'echo "custom"'
        }
      ];

      const conflicts = detectKeyBindingConflicts(customActions, builtinActions);
      expect(conflicts.valid).toBe(false);
      expect(conflicts.error).toContain('conflicts with built-in');
      expect(conflicts.conflicts).toContain('builtin-quit');
    });

    it('should detect conflicts with alternative key bindings', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action1',
          description: 'Action with alternatives',
          key: 'A',
          alternativeKeys: ['a', 'ctrl+a'],
          script: 'echo "1"'
        },
        {
          id: 'action2',
          description: 'Conflicting action',
          key: 'ctrl+a', // Conflicts with alternative key
          script: 'echo "2"'
        }
      ];

      const conflicts = detectKeyBindingConflicts(actions, []);
      expect(conflicts.valid).toBe(false);
      expect(conflicts.error).toContain('key binding');
      expect(conflicts.conflicts).toContain('ctrl+a');
    });

    it('should validate non-conflicting key bindings', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action1',
          description: 'First action',
          key: 'A',
          script: 'echo "1"'
        },
        {
          id: 'action2',
          description: 'Second action',
          key: 'B',
          alternativeKeys: ['b', 'ctrl+b'],
          script: 'echo "2"'
        }
      ];

      const conflicts = detectKeyBindingConflicts(actions, []);
      expect(conflicts.valid).toBe(true);
      expect(conflicts.error).toBeUndefined();
      expect(conflicts.conflicts).toBeUndefined();
    });

    it('should handle case sensitivity in key binding conflicts', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action1',
          description: 'Upper case',
          key: 'A',
          script: 'echo "upper"'
        },
        {
          id: 'action2', 
          description: 'Lower case',
          key: 'a',
          script: 'echo "lower"'
        }
      ];

      const conflicts = detectKeyBindingConflicts(actions, []);
      // Should NOT conflict - A and a are different keys
      expect(conflicts.valid).toBe(true);
    });

    it('should detect modifier key conflicts correctly', () => {
      const actions: ActionDefinition[] = [
        {
          id: 'action1',
          description: 'Control S',
          key: 'ctrl+s',
          script: 'echo "ctrl+s"'
        },
        {
          id: 'action2',
          description: 'Alt S',
          key: 'alt+s',
          script: 'echo "alt+s"'
        },
        {
          id: 'action3',
          description: 'Control S duplicate',
          key: 'ctrl+s', // Conflict!
          script: 'echo "duplicate"'
        }
      ];

      const conflicts = detectKeyBindingConflicts(actions, []);
      expect(conflicts.valid).toBe(false);
      expect(conflicts.conflicts).toContain('ctrl+s');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate complete configuration structure', async () => {
      const validConfig: ActionConfig = {
        $schema: 'https://hiliner.dev/schemas/actionConfig.schema.json',
        version: '1.0.0',
        metadata: {
          name: 'Valid Config',
          description: 'Complete valid configuration',
          author: 'Test Author'
        },
        actions: [
          {
            id: 'valid-action',
            description: 'Valid action definition',
            key: 'V',
            script: 'echo "valid"',
            category: 'custom',
            enabled: true
          }
        ],
        keyBindings: {
          'G': 'valid-action'
        },
        environment: {
          timeout: 30000,
          shell: 'bash',
          variables: {
            TEST_VAR: 'test-value'
          }
        }
      };

      const validation = await validateActionConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should validate individual action definitions', async () => {
      const invalidActions: ActionConfig = {
        actions: [
          {
            id: '', // Empty ID - invalid
            description: 'Invalid action',
            key: 'I',
            script: 'echo "invalid"'
          },
          {
            id: 'invalid-key-action',
            description: 'Action with invalid key',
            key: 'invalid-key-combo', // Invalid key format
            script: 'echo "test"'
          },
          {
            id: 'missing-script',
            description: 'Action without script',
            key: 'M'
            // Missing script - invalid
          } as ActionDefinition
        ]
      };

      const validation = await validateActionConfig(invalidActions);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors.some(e => e.includes('empty ID'))).toBe(true);
      expect(validation.errors.some(e => e.includes('invalid key'))).toBe(true);
      expect(validation.errors.some(e => e.includes('missing script'))).toBe(true);
    });

    it('should validate when conditions', async () => {
      const configWithConditions: ActionConfig = {
        actions: [
          {
            id: 'conditional-action',
            description: 'Action with conditions',
            key: 'C',
            script: 'echo "conditional"',
            when: {
              fileTypes: ['js', 'ts'],
              hasSelection: true,
              lineCount: {
                min: 1,
                max: 1000
              },
              mode: 'interactive'
            }
          }
        ]
      };

      const validation = await validateActionConfig(configWithConditions);
      expect(validation.valid).toBe(true);
    });

    it('should validate complex script commands', async () => {
      const configWithComplexScript: ActionConfig = {
        actions: [
          {
            id: 'external-command',
            description: 'External command action',
            key: 'E',
            script: {
              type: 'external',
              command: 'git',
              args: ['status'],
              timeout: 10000,
              captureOutput: true
            }
          },
          {
            id: 'builtin-command',
            description: 'Built-in command action',
            key: 'B',
            script: {
              type: 'builtin',
              builtin: 'quit'
            }
          },
          {
            id: 'sequence-command',
            description: 'Sequence command action',
            key: 'S',
            script: {
              type: 'sequence',
              sequence: [
                {
                  type: 'external',
                  command: 'echo',
                  args: ['step 1']
                },
                {
                  type: 'external', 
                  command: 'echo',
                  args: ['step 2']
                }
              ]
            }
          }
        ]
      };

      const validation = await validateActionConfig(configWithComplexScript);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid script command types', async () => {
      const configWithInvalidScript: ActionConfig = {
        actions: [
          {
            id: 'invalid-script',
            description: 'Invalid script type',
            key: 'I',
            script: {
              type: 'invalid-type' as any,
              command: 'echo "test"'
            }
          }
        ]
      };

      const validation = await validateActionConfig(configWithInvalidScript);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('invalid script type'))).toBe(true);
    });
  });

  describe('Built-in Actions Integration', () => {
    it('should include essential built-in actions', async () => {
      const registry = await createActionRegistry();
      const builtins = registry.getBuiltinActions();

      const builtinIds = builtins.map(a => a.id);
      
      // Essential navigation actions
      expect(builtinIds).toContain('quit');
      expect(builtinIds).toContain('scrollUp');
      expect(builtinIds).toContain('scrollDown');
      expect(builtinIds).toContain('pageUp');
      expect(builtinIds).toContain('pageDown');
      expect(builtinIds).toContain('goToStart');
      expect(builtinIds).toContain('goToEnd');

      // Selection actions
      expect(builtinIds).toContain('toggleSelection');
      expect(builtinIds).toContain('selectAll');
      expect(builtinIds).toContain('clearSelection');

      // Utility actions
      expect(builtinIds).toContain('showHelp');
      expect(builtinIds).toContain('reload');
    });

    it('should prevent overriding critical built-in actions', async () => {
      const configWithOverride: ActionConfig = {
        actions: [
          {
            id: 'quit', // Attempt to override critical built-in
            description: 'Custom quit action',
            key: 'q',
            script: 'echo "custom quit"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(configWithOverride));

      // Should prevent overriding critical built-ins
      await expect(createActionRegistry()).rejects.toThrow(ActionRegistryError);
      await expect(createActionRegistry()).rejects.toThrow(/cannot override critical built-in/i);
    });

    it('should allow overriding non-critical built-in actions', async () => {
      const configWithOverride: ActionConfig = {
        actions: [
          {
            id: 'showHelp', // Non-critical built-in - should be allowed
            description: 'Custom help action',
            key: 'H',
            script: 'echo "custom help"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(configWithOverride));

      const registry = await createActionRegistry();
      const helpAction = registry.getActionById('showHelp');
      
      expect(helpAction).toBeDefined();
      expect(helpAction?.script).toBe('echo "custom help"');
      expect(helpAction?.description).toBe('Custom help action');
    });

    it('should maintain built-in action key bindings', async () => {
      const registry = await createActionRegistry();

      // Test standard built-in key bindings
      expect(registry.getActionByKey('q')?.id).toBe('quit');
      expect(registry.getActionByKey('j')?.id).toBe('scrollDown');
      expect(registry.getActionByKey('k')?.id).toBe('scrollUp');
      expect(registry.getActionByKey(' ')?.id).toBe('toggleSelection');
      expect(registry.getActionByKey('?')?.id).toBe('showHelp');
    });
  });

  describe('Error Handling', () => {
    it('should create ActionRegistryError with correct properties', () => {
      const error = new ActionRegistryError(
        ActionRegistryErrorType.KEY_BINDING_CONFLICT,
        'Key binding conflict detected',
        { conflictingKey: 'q', actions: ['quit', 'custom-quit'] }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ActionRegistryError);
      expect(error.type).toBe(ActionRegistryErrorType.KEY_BINDING_CONFLICT);
      expect(error.message).toBe('Key binding conflict detected');
      expect(error.details).toEqual({
        conflictingKey: 'q',
        actions: ['quit', 'custom-quit']
      });
      expect(error.name).toBe('ActionRegistryError');
    });

    it('should handle file system errors gracefully', async () => {
      // Mock file system error
      jest.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const configPath = path.join(tempConfigDir, 'inaccessible-config.json');
      
      await expect(loadActionConfig(configPath)).rejects.toThrow(ActionRegistryError);
      await expect(loadActionConfig(configPath)).rejects.toThrow(/permission denied/i);
    });

    it('should handle registry initialization failures', async () => {
      // Create invalid config that will cause initialization to fail
      const corruptConfig = 'not valid json at all';
      await fs.writeFile(projectConfigPath, corruptConfig);

      await expect(createActionRegistry()).rejects.toThrow(ActionRegistryError);
      await expect(createActionRegistry()).rejects.toThrow(/failed to initialize/i);
    });

    it('should provide detailed error information for debugging', async () => {
      const configWithMultipleIssues: ActionConfig = {
        actions: [
          {
            id: '',
            description: 'Empty ID action',
            key: 'E',
            script: 'echo "test"'
          },
          {
            id: 'duplicate-key-1',
            description: 'First duplicate',
            key: 'D',
            script: 'echo "1"'
          },
          {
            id: 'duplicate-key-2',
            description: 'Second duplicate',
            key: 'D',
            script: 'echo "2"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(configWithMultipleIssues));

      try {
        await createActionRegistry();
        fail('Expected ActionRegistryError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ActionRegistryError);
        const registryError = error as ActionRegistryError;
        
        // Should provide detailed information about all issues
        expect(registryError.message).toContain('multiple errors');
        expect(registryError.details).toBeDefined();
        expect(registryError.details?.errors).toBeInstanceOf(Array);
        expect(registryError.details?.errors?.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large configuration files efficiently', async () => {
      // Create a large configuration with many actions
      const largeConfig: ActionConfig = {
        actions: Array.from({ length: 1000 }, (_, i) => ({
          id: `action-${i}`,
          description: `Action number ${i}`,
          key: `F${Math.floor(i / 12) + 1}`, // Use function keys to avoid conflicts
          script: `echo "Action ${i}"`
        }))
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(largeConfig));

      const startTime = Date.now();
      const registry = await createActionRegistry();
      const loadTime = Date.now() - startTime;

      // Should load in reasonable time (< 1 second for 1000 actions)
      expect(loadTime).toBeLessThan(1000);
      
      // Should have all actions loaded
      expect(registry.getActionById('action-999')).toBeDefined();
    });

    it('should handle empty configuration gracefully', async () => {
      const emptyConfig: ActionConfig = {
        actions: []
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(emptyConfig));

      const registry = await createActionRegistry();
      
      // Should still have built-in actions
      expect(registry.getBuiltinActions().length).toBeGreaterThan(0);
      
      // Should handle empty custom actions
      const customActions = registry.getAllActions().filter(a => 
        !registry.getBuiltinActions().some(b => b.id === a.id)
      );
      expect(customActions).toEqual([]);
    });

    it('should handle Unicode and special characters in action definitions', async () => {
      const unicodeConfig: ActionConfig = {
        actions: [
          {
            id: 'unicode-action-🚀',
            description: 'Action with emoji 🚀 and Unicode: café',
            key: 'U',
            script: 'echo "Unicode test: 你好世界"'
          },
          {
            id: 'special-chars',
            description: 'Action with special chars: @#$%^&*()',
            key: 'S',
            script: 'echo "Special: !@#$%^&*()"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(unicodeConfig));

      const registry = await createActionRegistry();
      
      const unicodeAction = registry.getActionById('unicode-action-🚀');
      expect(unicodeAction).toBeDefined();
      expect(unicodeAction?.description).toContain('🚀');
      expect(unicodeAction?.description).toContain('café');
      
      const specialAction = registry.getActionById('special-chars');
      expect(specialAction).toBeDefined();
      expect(specialAction?.script).toBe('echo "Special: !@#$%^&*()"');
    });

    it('should handle concurrent registry access safely', async () => {
      const config: ActionConfig = {
        actions: [
          {
            id: 'concurrent-test',
            description: 'Test concurrent access',
            key: 'C',
            script: 'echo "concurrent"'
          }
        ]
      };

      await fs.writeFile(projectConfigPath, JSON.stringify(config));

      // Create multiple registries concurrently
      const registries = await Promise.all([
        createActionRegistry(),
        createActionRegistry(),
        createActionRegistry()
      ]);

      // All should be successful and consistent
      registries.forEach(registry => {
        expect(registry.getActionById('concurrent-test')).toBeDefined();
        expect(registry.getBuiltinActions().length).toBeGreaterThan(0);
      });
    });
  });
});