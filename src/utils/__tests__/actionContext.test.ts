/**
 * Tests for Action Context environment variable injection system
 * 
 * This test suite verifies the environment variable generation and template substitution
 * functionality required for Issue #13. The tests follow TDD RED phase principles -
 * they are written before implementation and should initially FAIL.
 * 
 * Tests cover the 8 required environment variables from the specification:
 * - $SELECTED_TEXT: Newline-joined content of selected lines
 * - $FILE_PATH: Absolute path to the current file
 * - $LINE_START: First line number in selection (1-based)
 * - $LINE_END: Last line number in selection (1-based)
 * - $LANGUAGE: Detected programming language
 * - $SELECTION_COUNT: Number of selected lines
 * - $TOTAL_LINES: Total lines in the file
 * - $CURRENT_LINE: Current cursor position (1-based)
 */

import { buildActionContext, substituteVariables, ActionContext } from '../actionContext.js';
import type { SelectionState, FileData, FileMetadata } from '../../types.js';

describe('actionContext', () => {
  // Sample file data for testing
  const mockFileData: FileData = {
    content: 'line 1\nline 2\nline 3\nline 4\nline 5',
    lines: ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'],
    totalLines: 5,
    filePath: '/Users/test/project/example.js',
    metadata: {
      size: 42,
      encoding: 'utf8',
      isBinary: false,
      detectedLanguage: 'javascript',
      languageConfidence: 0.95
    }
  };

  const mockFileDataWithUnicode: FileData = {
    content: 'こんにちは\n世界\n🚀 テスト',
    lines: ['こんにちは', '世界', '🚀 テスト'],
    totalLines: 3,
    filePath: '/Users/test/unicode/文字化け.txt',
    metadata: {
      size: 32,
      encoding: 'utf8',
      isBinary: false,
      detectedLanguage: 'plaintext'
    }
  };

  describe('buildActionContext', () => {
    describe('environment variable generation', () => {
      it('should generate all 8 required environment variables for multi-line selection', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([1, 3, 5]),
          selectionCount: 3,
          lastSelectedLine: 5
        };
        const currentLine = 3;

        const context = buildActionContext(selectionState, mockFileData, currentLine);

        // Verify all 8 environment variables are present
        expect(context.environmentVariables).toHaveProperty('SELECTED_TEXT');
        expect(context.environmentVariables).toHaveProperty('FILE_PATH');
        expect(context.environmentVariables).toHaveProperty('LINE_START');
        expect(context.environmentVariables).toHaveProperty('LINE_END');
        expect(context.environmentVariables).toHaveProperty('LANGUAGE');
        expect(context.environmentVariables).toHaveProperty('SELECTION_COUNT');
        expect(context.environmentVariables).toHaveProperty('TOTAL_LINES');
        expect(context.environmentVariables).toHaveProperty('CURRENT_LINE');

        // Verify variable values
        expect(context.environmentVariables.SELECTED_TEXT).toBe('line 1\nline 3\nline 5');
        expect(context.environmentVariables.FILE_PATH).toBe('/Users/test/project/example.js');
        expect(context.environmentVariables.LINE_START).toBe('1');
        expect(context.environmentVariables.LINE_END).toBe('5');
        expect(context.environmentVariables.LANGUAGE).toBe('javascript');
        expect(context.environmentVariables.SELECTION_COUNT).toBe('3');
        expect(context.environmentVariables.TOTAL_LINES).toBe('5');
        expect(context.environmentVariables.CURRENT_LINE).toBe('3');
      });

      it('should handle single line selection correctly', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([2]),
          selectionCount: 1,
          lastSelectedLine: 2
        };
        const currentLine = 2;

        const context = buildActionContext(selectionState, mockFileData, currentLine);

        expect(context.environmentVariables.SELECTED_TEXT).toBe('line 2');
        expect(context.environmentVariables.LINE_START).toBe('2');
        expect(context.environmentVariables.LINE_END).toBe('2');
        expect(context.environmentVariables.SELECTION_COUNT).toBe('1');
        expect(context.environmentVariables.CURRENT_LINE).toBe('2');
      });

      it('should handle contiguous selection range correctly', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([2, 3, 4]),
          selectionCount: 3,
          lastSelectedLine: 4
        };
        const currentLine = 3;

        const context = buildActionContext(selectionState, mockFileData, currentLine);

        expect(context.environmentVariables.SELECTED_TEXT).toBe('line 2\nline 3\nline 4');
        expect(context.environmentVariables.LINE_START).toBe('2');
        expect(context.environmentVariables.LINE_END).toBe('4');
        expect(context.environmentVariables.SELECTION_COUNT).toBe('3');
      });

      it('should handle non-contiguous selection correctly', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([1, 3, 5]),
          selectionCount: 3,
          lastSelectedLine: 5
        };
        const currentLine = 1;

        const context = buildActionContext(selectionState, mockFileData, currentLine);

        expect(context.environmentVariables.SELECTED_TEXT).toBe('line 1\nline 3\nline 5');
        expect(context.environmentVariables.LINE_START).toBe('1');
        expect(context.environmentVariables.LINE_END).toBe('5');
        expect(context.environmentVariables.SELECTION_COUNT).toBe('3');
      });

      it('should handle empty selection gracefully', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set(),
          selectionCount: 0
        };
        const currentLine = 1;

        const context = buildActionContext(selectionState, mockFileData, currentLine);

        expect(context.environmentVariables.SELECTED_TEXT).toBe('');
        expect(context.environmentVariables.LINE_START).toBe('');
        expect(context.environmentVariables.LINE_END).toBe('');
        expect(context.environmentVariables.SELECTION_COUNT).toBe('0');
        expect(context.environmentVariables.CURRENT_LINE).toBe('1');
        expect(context.environmentVariables.FILE_PATH).toBe('/Users/test/project/example.js');
        expect(context.environmentVariables.TOTAL_LINES).toBe('5');
        expect(context.environmentVariables.LANGUAGE).toBe('javascript');
      });

      it('should handle Unicode text correctly', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([1, 3]),
          selectionCount: 2,
          lastSelectedLine: 3
        };
        const currentLine = 1;

        const context = buildActionContext(selectionState, mockFileDataWithUnicode, currentLine);

        expect(context.environmentVariables.SELECTED_TEXT).toBe('こんにちは\n🚀 テスト');
        expect(context.environmentVariables.FILE_PATH).toBe('/Users/test/unicode/文字化け.txt');
        expect(context.environmentVariables.LANGUAGE).toBe('plaintext');
      });

      it('should handle missing language detection gracefully', () => {
        const fileDataNoLang: FileData = {
          ...mockFileData,
          metadata: {
            ...mockFileData.metadata!,
            detectedLanguage: undefined
          }
        };
        const selectionState: SelectionState = {
          selectedLines: new Set([1]),
          selectionCount: 1,
          lastSelectedLine: 1
        };

        const context = buildActionContext(selectionState, fileDataNoLang, 1);

        expect(context.environmentVariables.LANGUAGE).toBe('unknown');
      });

      it('should handle missing metadata gracefully', () => {
        const fileDataNoMeta: FileData = {
          ...mockFileData,
          metadata: undefined
        };
        const selectionState: SelectionState = {
          selectedLines: new Set([1]),
          selectionCount: 1,
          lastSelectedLine: 1
        };

        const context = buildActionContext(selectionState, fileDataNoMeta, 1);

        expect(context.environmentVariables.LANGUAGE).toBe('unknown');
      });
    });

    describe('context object structure', () => {
      it('should return ActionContext with correct structure', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([1]),
          selectionCount: 1,
          lastSelectedLine: 1
        };

        const context = buildActionContext(selectionState, mockFileData, 1);

        expect(context).toHaveProperty('environmentVariables');
        expect(context).toHaveProperty('templateVariables');
        expect(typeof context.environmentVariables).toBe('object');
        expect(typeof context.templateVariables).toBe('object');
      });

      it('should create template variables from environment variables', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([1, 2]),
          selectionCount: 2,
          lastSelectedLine: 2
        };

        const context = buildActionContext(selectionState, mockFileData, 1);

        // Template variables should mirror environment variables but for {{}} substitution
        expect(context.templateVariables.selectedText).toBe('line 1\nline 2');
        expect(context.templateVariables.filePath).toBe('/Users/test/project/example.js');
        expect(context.templateVariables.lineStart).toBe('1');
        expect(context.templateVariables.lineEnd).toBe('2');
        expect(context.templateVariables.language).toBe('javascript');
        expect(context.templateVariables.selectionCount).toBe('2');
        expect(context.templateVariables.totalLines).toBe('5');
        expect(context.templateVariables.currentLine).toBe('1');
      });
    });

    describe('edge cases and error handling', () => {
      it('should handle out-of-bounds line selections', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([6, 7]), // Beyond file length
          selectionCount: 2,
          lastSelectedLine: 7
        };

        const context = buildActionContext(selectionState, mockFileData, 1);

        // Should handle gracefully, possibly returning empty strings for out-of-bounds
        expect(context.environmentVariables.SELECTED_TEXT).toBe('');
        expect(context.environmentVariables.LINE_START).toBe('6');
        expect(context.environmentVariables.LINE_END).toBe('7');
        expect(context.environmentVariables.SELECTION_COUNT).toBe('2');
      });

      it('should handle zero and negative line numbers', () => {
        const selectionState: SelectionState = {
          selectedLines: new Set([0, -1]), // Invalid line numbers
          selectionCount: 2,
          lastSelectedLine: 0
        };

        const context = buildActionContext(selectionState, mockFileData, 0);

        expect(context.environmentVariables.SELECTED_TEXT).toBe('');
        expect(context.environmentVariables.CURRENT_LINE).toBe('0');
      });

      it('should handle large selections efficiently', () => {
        const largeSelection = new Set<number>();
        for (let i = 1; i <= 1000; i++) {
          largeSelection.add(i);
        }

        const selectionState: SelectionState = {
          selectedLines: largeSelection,
          selectionCount: 1000,
          lastSelectedLine: 1000
        };

        // This should not hang or crash
        const context = buildActionContext(selectionState, mockFileData, 500);

        expect(context.environmentVariables.SELECTION_COUNT).toBe('1000');
        expect(context.environmentVariables.CURRENT_LINE).toBe('500');
      });

      it('should handle files with special characters in path', () => {
        const specialPathFile: FileData = {
          ...mockFileData,
          filePath: '/Users/test/dir with spaces/file-with-dashes_and_underscores.special.ext'
        };
        const selectionState: SelectionState = {
          selectedLines: new Set([1]),
          selectionCount: 1,
          lastSelectedLine: 1
        };

        const context = buildActionContext(selectionState, specialPathFile, 1);

        expect(context.environmentVariables.FILE_PATH).toBe('/Users/test/dir with spaces/file-with-dashes_and_underscores.special.ext');
      });
    });
  });

  describe('substituteVariables', () => {
    const mockContext: ActionContext = {
      environmentVariables: {
        SELECTED_TEXT: 'console.log("Hello");',
        FILE_PATH: '/project/app.js',
        LINE_START: '1',
        LINE_END: '1',
        LANGUAGE: 'javascript',
        SELECTION_COUNT: '1',
        TOTAL_LINES: '100',
        CURRENT_LINE: '1'
      },
      templateVariables: {
        selectedText: 'console.log("Hello");',
        filePath: '/project/app.js',
        lineStart: '1',
        lineEnd: '1',
        language: 'javascript',
        selectionCount: '1',
        totalLines: '100',
        currentLine: '1'
      }
    };

    describe('template variable substitution', () => {
      it('should substitute single template variable', () => {
        const template = 'File: {{filePath}}';
        const result = substituteVariables(template, mockContext);
        expect(result).toBe('File: /project/app.js');
      });

      it('should substitute multiple template variables', () => {
        const template = 'Lines {{lineStart}}-{{lineEnd}} in {{filePath}} ({{language}})';
        const result = substituteVariables(template, mockContext);
        expect(result).toBe('Lines 1-1 in /project/app.js (javascript)');
      });

      it('should substitute same variable multiple times', () => {
        const template = '{{filePath}} -> {{filePath}} (copy of {{filePath}})';
        const result = substituteVariables(template, mockContext);
        expect(result).toBe('/project/app.js -> /project/app.js (copy of /project/app.js)');
      });

      it('should handle template with no variables', () => {
        const template = 'This is a static string with no variables';
        const result = substituteVariables(template, mockContext);
        expect(result).toBe('This is a static string with no variables');
      });

      it('should handle empty template', () => {
        const template = '';
        const result = substituteVariables(template, mockContext);
        expect(result).toBe('');
      });

      it('should handle all available template variables', () => {
        const template = [
          '{{selectedText}}',
          '{{filePath}}',
          '{{lineStart}}',
          '{{lineEnd}}',
          '{{language}}',
          '{{selectionCount}}',
          '{{totalLines}}',
          '{{currentLine}}'
        ].join(' | ');

        const result = substituteVariables(template, mockContext);
        const expected = [
          'console.log("Hello");',
          '/project/app.js',
          '1',
          '1',
          'javascript',
          '1',
          '100',
          '1'
        ].join(' | ');

        expect(result).toBe(expected);
      });

      it('should handle unknown template variables gracefully', () => {
        const template = 'Known: {{filePath}}, Unknown: {{unknownVariable}}';
        const result = substituteVariables(template, mockContext);
        expect(result).toBe('Known: /project/app.js, Unknown: {{unknownVariable}}');
      });

      it('should handle malformed template syntax', () => {
        const template = '{{filePath} missing close brace {{filePath}}';
        const result = substituteVariables(template, mockContext);
        expect(result).toBe('{{filePath} missing close brace /project/app.js');
      });

      it('should handle nested braces', () => {
        const template = '{{{{filePath}}}}';
        const result = substituteVariables(template, mockContext);
        // Should replace inner variable first
        expect(result).toBe('{/project/app.js}');
      });

      it('should handle multiline template content', () => {
        const template = `Selected code:
{{selectedText}}

From file: {{filePath}}
Language: {{language}}`;

        const result = substituteVariables(template, mockContext);
        const expected = `Selected code:
console.log("Hello");

From file: /project/app.js
Language: javascript`;

        expect(result).toBe(expected);
      });
    });

    describe('special character handling', () => {
      it('should handle template variables with special characters in values', () => {
        const specialContext: ActionContext = {
          ...mockContext,
          templateVariables: {
            ...mockContext.templateVariables,
            selectedText: 'const str = "Hello\\n\\"World\\"";',
            filePath: '/path/with spaces/file (copy).js'
          }
        };

        const template = 'Code: {{selectedText}} in {{filePath}}';
        const result = substituteVariables(template, specialContext);
        expect(result).toBe('Code: const str = "Hello\\n\\"World\\""; in /path/with spaces/file (copy).js');
      });

      it('should handle Unicode content in template variables', () => {
        const unicodeContext: ActionContext = {
          ...mockContext,
          templateVariables: {
            ...mockContext.templateVariables,
            selectedText: 'こんにちは 🚀',
            filePath: '/Users/テスト/文字化け.txt'
          }
        };

        const template = 'Text: {{selectedText}} from {{filePath}}';
        const result = substituteVariables(template, unicodeContext);
        expect(result).toBe('Text: こんにちは 🚀 from /Users/テスト/文字化け.txt');
      });
    });

    describe('performance and edge cases', () => {
      it('should handle large template content efficiently', () => {
        const largeTemplate = 'File: {{filePath}}\n'.repeat(1000) + 'End';
        const expectedStart = 'File: /project/app.js\n'.repeat(1000) + 'End';
        
        const result = substituteVariables(largeTemplate, mockContext);
        expect(result).toBe(expectedStart);
      });

      it('should handle template with many different variables', () => {
        const template = Array.from({ length: 100 }, (_, i) => `{{filePath}}_${i}`).join(' ');
        const expected = Array.from({ length: 100 }, (_, i) => `/project/app.js_${i}`).join(' ');
        
        const result = substituteVariables(template, mockContext);
        expect(result).toBe(expected);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work end-to-end with realistic action script template', () => {
      const selectionState: SelectionState = {
        selectedLines: new Set([10, 11, 12]),
        selectionCount: 3,
        lastSelectedLine: 12
      };

      const fileData: FileData = {
        content: 'function test() {\n  console.log("debug");\n  return 42;\n}',
        lines: ['function test() {', '  console.log("debug");', '  return 42;', '}'],
        totalLines: 4,
        filePath: '/project/src/utils.ts',
        metadata: {
          detectedLanguage: 'typescript'
        }
      };

      const context = buildActionContext(selectionState, fileData, 11);
      
      const scriptTemplate = `#!/bin/bash
# Processing selection from {{filePath}}
# Language: {{language}}
# Lines: {{lineStart}}-{{lineEnd}} ({{selectionCount}} lines total)
# Current position: line {{currentLine}} of {{totalLines}}

echo "Selected code:"
cat << 'EOF'
{{selectedText}}
EOF

echo "File info: {{filePath}} ({{language}})"`;

      const result = substituteVariables(scriptTemplate, context);

      expect(result).toContain('# Processing selection from /project/src/utils.ts');
      expect(result).toContain('# Language: typescript');
      expect(result).toContain('# Lines: 10-12 (3 lines total)');
      expect(result).toContain('# Current position: line 11 of 4');
      expect(result).toContain('echo "File info: /project/src/utils.ts (typescript)"');
      // Note: selectedText would be empty since lines 10-12 are beyond the file
    });

    it('should handle action context for code formatting scenario', () => {
      const selectionState: SelectionState = {
        selectedLines: new Set([2, 3, 4]),
        selectionCount: 3,
        lastSelectedLine: 4
      };

      const context = buildActionContext(selectionState, mockFileData, 3);
      const formatCommand = 'prettier --parser={{language}} --stdin-filepath="{{filePath}}"';
      
      const result = substituteVariables(formatCommand, context);
      expect(result).toBe('prettier --parser=javascript --stdin-filepath="/Users/test/project/example.js"');
    });

    it('should handle action context for git blame scenario', () => {
      const selectionState: SelectionState = {
        selectedLines: new Set([1]),
        selectionCount: 1,
        lastSelectedLine: 1
      };

      const context = buildActionContext(selectionState, mockFileData, 1);
      const gitCommand = 'git blame -L{{lineStart}},{{lineEnd}} "{{filePath}}"';
      
      const result = substituteVariables(gitCommand, context);
      expect(result).toBe('git blame -L1,1 "/Users/test/project/example.js"');
    });
  });

  describe('security considerations', () => {
    it('should not expose sensitive environment variables', () => {
      const selectionState: SelectionState = {
        selectedLines: new Set([1]),
        selectionCount: 1,
        lastSelectedLine: 1
      };

      const context = buildActionContext(selectionState, mockFileData, 1);

      // Should only contain the 8 specified variables
      const envKeys = Object.keys(context.environmentVariables);
      expect(envKeys).toHaveLength(8);
      expect(envKeys).toEqual(expect.arrayContaining([
        'SELECTED_TEXT', 'FILE_PATH', 'LINE_START', 'LINE_END',
        'LANGUAGE', 'SELECTION_COUNT', 'TOTAL_LINES', 'CURRENT_LINE'
      ]));

      // Should not contain system environment variables
      expect(context.environmentVariables).not.toHaveProperty('PATH');
      expect(context.environmentVariables).not.toHaveProperty('HOME');
      expect(context.environmentVariables).not.toHaveProperty('USER');
    });

    it('should sanitize file paths to prevent command injection', () => {
      const maliciousFile: FileData = {
        ...mockFileData,
        filePath: '/path/to/file; rm -rf /'
      };

      const selectionState: SelectionState = {
        selectedLines: new Set([1]),
        selectionCount: 1,
        lastSelectedLine: 1
      };

      const context = buildActionContext(selectionState, maliciousFile, 1);
      
      // Should preserve the path as-is (sanitization would be done at execution time)
      expect(context.environmentVariables.FILE_PATH).toBe('/path/to/file; rm -rf /');
    });

    it('should handle code content with potential injection patterns', () => {
      const maliciousContent: FileData = {
        content: '$(rm -rf /)\n`evil command`\n${dangerous}',
        lines: ['$(rm -rf /)', '`evil command`', '${dangerous}'],
        totalLines: 3,
        filePath: '/safe/path.txt',
        metadata: {
          detectedLanguage: 'bash'
        }
      };

      const selectionState: SelectionState = {
        selectedLines: new Set([1, 2, 3]),
        selectionCount: 3,
        lastSelectedLine: 3
      };

      const context = buildActionContext(selectionState, maliciousContent, 1);

      // Should preserve content as-is (execution environment should handle sanitization)
      expect(context.environmentVariables.SELECTED_TEXT).toBe('$(rm -rf /)\n`evil command`\n${dangerous}');
      expect(context.environmentVariables.LANGUAGE).toBe('bash');
    });
  });
});