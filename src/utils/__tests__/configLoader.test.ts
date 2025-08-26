/**
 * Tests for configuration loading system (TDD Red phase)
 * 
 * These tests define the expected behavior for JSON configuration file loading
 * based on Issue #13 specifications before implementation of configLoader.ts
 * 
 * Configuration Loading System Requirements:
 * - File Priority System with CLI override capability
 * - JSON Schema validation against actionConfig.schema.json
 * - Graceful error handling for missing/invalid files
 * - Configuration merging with conflict detection
 * - Cross-platform path resolution
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadConfig, ConfigLoadResult, ConfigLoadError, ConfigErrorType, MergeStrategy } from '../configLoader.js';
import type { ActionConfig } from '../../types/actionConfig.js';

// Mock fs module for testing different scenarios
jest.mock('fs/promises');
jest.mock('os');

const mockFs = {
  access: jest.fn(),
  readFile: jest.fn(),
} as any;
const mockOs = os as jest.Mocked<typeof os>;

// Replace the actual fs with our mocks
Object.assign(fs, mockFs);

describe('Config Loader System (TDD Red Phase)', () => {
  const testWorkingDir = '/test/project';
  const testHomeDir = '/home/user';
  const testProjectConfig = path.join(testWorkingDir, 'hiliner-actions.json');
  const testUserConfig = path.join(testHomeDir, '.hiliner', 'actions.json');
  const testCustomConfig = '/custom/path/config.json';

  // Valid test configuration objects
  const validProjectConfig: ActionConfig = {
    version: '1.0.0',
    metadata: {
      name: 'Project Config',
      description: 'Project-specific actions',
    },
    actions: [
      {
        id: 'project-action',
        name: 'Project Action',
        description: 'A project-specific action',
        key: 'p',
        script: 'echo "project action"',
        category: 'custom',
      },
    ],
    keyBindings: {
      'p': 'project-action',
    },
    environment: {
      timeout: 5000,
      shell: 'bash',
    },
  };

  const validUserConfig: ActionConfig = {
    version: '1.0.0',
    metadata: {
      name: 'User Config',
      description: 'User-specific actions',
    },
    actions: [
      {
        id: 'user-action',
        name: 'User Action',
        description: 'A user-specific action',
        key: 'u',
        script: 'echo "user action"',
        category: 'custom',
      },
    ],
    keyBindings: {
      'u': 'user-action',
    },
    environment: {
      timeout: 10000,
      shell: 'zsh',
      variables: {
        'USER_VAR': 'user_value',
      },
    },
  };

  const validCustomConfig: ActionConfig = {
    version: '1.0.0',
    metadata: {
      name: 'Custom Config',
      description: 'Custom CLI-specified config',
    },
    actions: [
      {
        id: 'custom-action',
        name: 'Custom Action',
        description: 'A custom CLI action',
        key: 'c',
        script: 'echo "custom action"',
        category: 'custom',
      },
    ],
  };

  const conflictingConfig: ActionConfig = {
    version: '1.0.0',
    actions: [
      {
        id: 'project-action', // Same ID as project config
        name: 'Conflicting Action',
        description: 'This action conflicts with project config',
        key: 'p', // Same key as project config
        script: 'echo "conflicting action"',
      },
    ],
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default OS mocks
    mockOs.homedir.mockReturnValue(testHomeDir);
    
    // Default to files not existing
    mockFs.access.mockRejectedValue(new Error('ENOENT: no such file'));
    mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));
  });

  describe('File Priority System (Issue #13 - Decision Q1=b)', () => {
    it('should load project config when only project config exists', async () => {
      // Mock project config exists and is valid
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });
      
      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.config).toEqual(validProjectConfig);
      expect(result.sources).toEqual([testProjectConfig]);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should load user config when only user config exists', async () => {
      // Mock user config exists and is valid
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testUserConfig) return;
        throw new Error('ENOENT');
      });
      
      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testUserConfig) {
          return JSON.stringify(validUserConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.config).toEqual(validUserConfig);
      expect(result.sources).toEqual([testUserConfig]);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should merge configs with project taking priority over user', async () => {
      // Mock both configs exist
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig || filePath === testUserConfig) return;
        throw new Error('ENOENT');
      });
      
      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        if (filePath === testUserConfig) {
          return JSON.stringify(validUserConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.sources).toEqual([testUserConfig, testProjectConfig]);
      
      // Project config should take priority
      expect(result.config?.metadata?.name).toBe('Project Config');
      expect(result.config?.environment?.timeout).toBe(5000); // Project value
      expect(result.config?.environment?.shell).toBe('bash'); // Project value
      
      // Should contain actions from both configs
      expect(result.config?.actions).toHaveLength(2);
      expect(result.config?.actions?.map(a => a.id)).toEqual(['user-action', 'project-action']);
    });

    it('should give CLI config absolute priority over all other configs', async () => {
      // Mock all configs exist
      mockFs.access.mockResolvedValue(undefined);
      
      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        if (filePath === testUserConfig) {
          return JSON.stringify(validUserConfig);
        }
        if (filePath === testCustomConfig) {
          return JSON.stringify(validCustomConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { customConfigPath: testCustomConfig });

      expect(result.success).toBe(true);
      expect(result.sources).toEqual([testUserConfig, testProjectConfig, testCustomConfig]);
      
      // CLI config should override everything
      expect(result.config?.metadata?.name).toBe('Custom Config');
      expect(result.config?.actions).toHaveLength(1);
      expect(result.config?.actions?.[0].id).toBe('custom-action');
    });

    it('should handle non-existent CLI config path gracefully', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testCustomConfig) throw new Error('ENOENT');
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { customConfigPath: testCustomConfig });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.FILE_NOT_FOUND);
      expect(result.error?.path).toBe(testCustomConfig);
      expect(result.error?.message).toContain('specified config file not found');
    });

    it('should handle relative custom config paths', async () => {
      const relativeCustomPath = './config/hiliner.json';
      const resolvedPath = path.resolve(testWorkingDir, relativeCustomPath);

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === resolvedPath) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === resolvedPath) {
          return JSON.stringify(validCustomConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { customConfigPath: relativeCustomPath });

      expect(result.success).toBe(true);
      expect(result.config).toEqual(validCustomConfig);
      expect(result.sources).toEqual([resolvedPath]);
    });
  });

  describe('JSON Schema Validation', () => {
    it('should validate valid configuration against schema', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should reject configuration with invalid schema', async () => {
      const invalidConfig = {
        version: 'invalid-version', // Should be semver
        actions: [
          {
            id: 'invalid-id-with-spaces', // Invalid ID format
            // missing required fields: key, script, description
          },
        ],
      };

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(invalidConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.VALIDATION_ERROR);
      expect(result.validationErrors).toContain(
        expect.objectContaining({
          path: expect.stringContaining('version'),
          message: expect.stringContaining('pattern'),
        })
      );
      expect(result.validationErrors).toContain(
        expect.objectContaining({
          path: expect.stringContaining('actions[0]'),
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should validate action key binding format', async () => {
      const invalidKeyConfig = {
        version: '1.0.0',
        actions: [
          {
            id: 'test-action',
            name: 'Test',
            description: 'Test action',
            key: 'invalid-key', // Should be single character
            script: 'echo "test"',
          },
        ],
      };

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(invalidKeyConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.VALIDATION_ERROR);
      expect(result.validationErrors).toContain(
        expect.objectContaining({
          path: expect.stringContaining('key'),
          message: expect.stringContaining('pattern'),
        })
      );
    });

    it('should validate complex command structures', async () => {
      const invalidComplexCommand = {
        version: '1.0.0',
        actions: [
          {
            id: 'test-complex',
            name: 'Test Complex',
            description: 'Test complex command',
            key: 't',
            script: {
              type: 'external',
              // missing required 'command' field for external type
              args: ['--help'],
            },
          },
        ],
      };

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(invalidComplexCommand);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.VALIDATION_ERROR);
      expect(result.validationErrors).toContain(
        expect.objectContaining({
          path: expect.stringContaining('script'),
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should validate environment variable naming', async () => {
      const invalidEnvConfig = {
        version: '1.0.0',
        actions: [
          {
            id: 'test-env',
            name: 'Test Env',
            description: 'Test environment',
            key: 'e',
            script: 'echo "test"',
          },
        ],
        environment: {
          variables: {
            'invalid-env-name': 'value', // Should be uppercase with underscores
            '123INVALID': 'value', // Cannot start with number
          },
        },
      };

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(invalidEnvConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.VALIDATION_ERROR);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('File Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return 'invalid json content {[}';
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.PARSE_ERROR);
      expect(result.error?.path).toBe(testProjectConfig);
      expect(result.error?.message).toContain('JSON');
    });

    it('should handle file permission errors', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
          error.code = 'EACCES';
          throw error;
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.PERMISSION_ERROR);
      expect(result.error?.path).toBe(testProjectConfig);
      expect(result.error?.message).toContain('permission');
    });

    it('should handle corrupted configuration files', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          // Valid JSON but missing required fields
          return JSON.stringify({
            version: '1.0.0',
            // missing required 'actions' field
          });
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.VALIDATION_ERROR);
      expect(result.validationErrors).toContain(
        expect.objectContaining({
          path: expect.stringContaining('actions'),
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should handle empty configuration files', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return '';
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.PARSE_ERROR);
      expect(result.error?.message).toContain('empty');
    });

    it('should handle file system I/O errors', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          const error = new Error('EIO: i/o error') as NodeJS.ErrnoException;
          error.code = 'EIO';
          throw error;
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ConfigErrorType.FILE_SYSTEM_ERROR);
      expect(result.error?.message).toContain('I/O');
    });
  });

  describe('Configuration Merge Strategy', () => {
    it('should merge actions from multiple configs without conflicts', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig || filePath === testUserConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        if (filePath === testUserConfig) {
          return JSON.stringify(validUserConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.config?.actions).toHaveLength(2);
      expect(result.config?.actions?.map(a => a.id).sort()).toEqual(['project-action', 'user-action']);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect and handle key binding conflicts', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig || filePath === testUserConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        if (filePath === testUserConfig) {
          return JSON.stringify(conflictingConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { mergeStrategy: MergeStrategy.DETECT_CONFLICTS });

      expect(result.success).toBe(true);
      expect(result.conflicts).toEqual([
        {
          type: 'duplicate_action_id',
          key: 'project-action',
          sources: [testUserConfig, testProjectConfig],
          resolution: 'project config takes priority',
        },
        {
          type: 'duplicate_key_binding',
          key: 'p',
          sources: [testUserConfig, testProjectConfig],
          resolution: 'project config takes priority',
        },
      ]);
    });

    it('should merge environment configurations correctly', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig || filePath === testUserConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        if (filePath === testUserConfig) {
          return JSON.stringify(validUserConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      
      // Project config should override user config
      expect(result.config?.environment?.timeout).toBe(5000); // Project value
      expect(result.config?.environment?.shell).toBe('bash'); // Project value
      
      // User variables should be preserved if not conflicting
      expect(result.config?.environment?.variables?.['USER_VAR']).toBe('user_value');
    });

    it('should handle merge strategy: replace', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig || filePath === testUserConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        if (filePath === testUserConfig) {
          return JSON.stringify(validUserConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { mergeStrategy: MergeStrategy.REPLACE });

      expect(result.success).toBe(true);
      
      // Should only have project config (highest priority)
      expect(result.config).toEqual(validProjectConfig);
      expect(result.sources).toEqual([testProjectConfig]);
    });

    it('should handle merge strategy: merge_all', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig || filePath === testUserConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        if (filePath === testUserConfig) {
          return JSON.stringify(conflictingConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { mergeStrategy: MergeStrategy.MERGE_ALL });

      expect(result.success).toBe(true);
      
      // Should merge all actions despite conflicts
      expect(result.config?.actions).toHaveLength(2);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-platform Path Resolution', () => {
    it('should resolve user config path correctly on Unix-like systems', async () => {
      mockOs.homedir.mockReturnValue('/Users/testuser');

      const expectedUserConfigPath = path.join('/Users/testuser', '.hiliner', 'actions.json');

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === expectedUserConfigPath) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === expectedUserConfigPath) {
          return JSON.stringify(validUserConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.sources).toEqual([expectedUserConfigPath]);
    });

    it('should resolve user config path correctly on Windows', async () => {
      mockOs.homedir.mockReturnValue('C:\\Users\\testuser');

      const expectedUserConfigPath = path.join('C:\\Users\\testuser', '.hiliner', 'actions.json');

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === expectedUserConfigPath) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === expectedUserConfigPath) {
          return JSON.stringify(validUserConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.sources).toEqual([expectedUserConfigPath]);
    });

    it('should handle tilde expansion in custom config paths', async () => {
      const tildeConfigPath = '~/custom/config.json';
      const expandedPath = path.join(testHomeDir, 'custom', 'config.json');

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === expandedPath) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === expandedPath) {
          return JSON.stringify(validCustomConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { customConfigPath: tildeConfigPath });

      expect(result.success).toBe(true);
      expect(result.sources).toEqual([expandedPath]);
    });
  });

  describe('Configuration Loading Options', () => {
    it('should respect strictMode option', async () => {
      const partiallyInvalidConfig = {
        version: '1.0.0',
        actions: [
          {
            id: 'valid-action',
            name: 'Valid Action',
            description: 'A valid action',
            key: 'v',
            script: 'echo "valid"',
          },
          {
            id: 'invalid-action',
            // missing required fields
            key: 'i',
          },
        ],
      };

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(partiallyInvalidConfig);
        }
        throw new Error('ENOENT');
      });

      // Strict mode should fail completely
      const strictResult = await loadConfig(testWorkingDir, { strictMode: true });
      expect(strictResult.success).toBe(false);

      // Non-strict mode should ignore invalid actions but succeed
      const lenientResult = await loadConfig(testWorkingDir, { strictMode: false });
      expect(lenientResult.success).toBe(true);
      expect(lenientResult.config?.actions).toHaveLength(1);
      expect(lenientResult.warnings?.length).toBeGreaterThan(0);
    });

    it('should support dryRun mode', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.config).toBeNull(); // No config loaded in dry run
      expect(result.sources).toEqual([testProjectConfig]); // But sources are detected
      expect(result.validationErrors).toHaveLength(0); // Validation should still occur
    });

    it('should handle includeSource option', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir, { includeSource: true });

      expect(result.success).toBe(true);
      expect(result.config?.actions?.[0]).toEqual(
        expect.objectContaining({
          ...validProjectConfig.actions[0],
          __source: testProjectConfig,
        })
      );
    });
  });

  describe('Integration with ActionRegistry', () => {
    it('should return config in format compatible with ActionRegistry', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(validProjectConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      expect(result.config?.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            key: expect.any(String),
            script: expect.any(String),
            description: expect.any(String),
          }),
        ])
      );
    });

    it('should provide error types compatible with ActionRegistry error handling', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return 'invalid json';
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(
        expect.objectContaining({
          type: expect.any(String),
          message: expect.any(String),
          path: expect.any(String),
          recoverable: expect.any(Boolean),
        })
      );
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large configuration files efficiently', async () => {
      const largeConfig = {
        version: '1.0.0',
        actions: Array.from({ length: 1000 }, (_, i) => ({
          id: `action-${i}`,
          name: `Action ${i}`,
          description: `Generated action ${i}`,
          key: String.fromCharCode(65 + (i % 26)), // A-Z cycling
          script: `echo "action ${i}"`,
        })),
      };

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(largeConfig);
        }
        throw new Error('ENOENT');
      });

      const startTime = Date.now();
      const result = await loadConfig(testWorkingDir);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.config?.actions).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should load within 1 second
    });

    it('should handle concurrent config loading operations', async () => {
      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          // Simulate slow file read
          await new Promise(resolve => setTimeout(resolve, 100));
          return JSON.stringify(validProjectConfig);
        }
        throw new Error('ENOENT');
      });

      // Start multiple concurrent loads
      const promises = Array.from({ length: 5 }, () => loadConfig(testWorkingDir));
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.config).toEqual(validProjectConfig);
      });
    });

    it('should handle circular references in merged configurations', async () => {
      // This would be detected during the merge process
      const circularConfig = {
        version: '1.0.0',
        actions: [
          {
            id: 'action1',
            name: 'Action 1',
            description: 'First action',
            key: 'a',
            script: {
              type: 'sequence',
              sequence: [
                {
                  type: 'external',
                  command: 'echo',
                  args: ['action1'],
                },
              ],
            },
          },
        ],
      };

      mockFs.access.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) return;
        throw new Error('ENOENT');
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath === testProjectConfig) {
          return JSON.stringify(circularConfig);
        }
        throw new Error('ENOENT');
      });

      const result = await loadConfig(testWorkingDir);

      expect(result.success).toBe(true);
      // Should handle complex structures without infinite recursion
      expect(result.config?.actions?.[0].script).toEqual(circularConfig.actions[0].script);
    });
  });
});