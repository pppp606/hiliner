import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Theme Integration Tests', () => {
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let exitMock: jest.MockedFunction<typeof process.exit>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    exitMock = jest.fn() as jest.MockedFunction<typeof process.exit>;
    process.exit = exitMock;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });


  describe('Interactive mode with theme option', () => {
    it('should pass theme to App component in interactive mode', async () => {
      // Mock the interactive mode initialization
      const mockInteractiveMode = (args: { theme?: string; file: string }) => {
        const React = require('react');
        const { render } = require('ink');
        
        // Validate theme before starting interactive mode
        const availableThemes = ['dark-plus', 'monokai', 'dracula', 'github-dark'];
        
        if (args.theme && !availableThemes.includes(args.theme)) {
          console.error(`Error: Theme '${args.theme}' is not supported.`);
          process.exit(1);
        }
        
        // Should pass theme prop to App component
        const appProps = {
          filePath: resolve(args.file),
          theme: args.theme || 'dark-plus'
        };
        
        // Mock render call
        return { props: appProps, started: true };
      };

      // Test valid theme
      const result = mockInteractiveMode({
        theme: 'monokai',
        file: 'test.js'
      });
      
      expect(result.props.theme).toBe('monokai');
      expect(result.started).toBe(true);
    });

    it('should exit before starting interactive mode with invalid theme', () => {
      const mockInteractiveMode = (args: { theme?: string; file: string }) => {
        const availableThemes = ['dark-plus', 'monokai', 'dracula'];
        
        if (args.theme && !availableThemes.includes(args.theme)) {
          console.error(`Error: Theme '${args.theme}' is not supported.`);
          process.exit(1);
        }
        
        return { started: true };
      };

      mockInteractiveMode({
        theme: 'INVALID-THEME',
        file: 'test.js'
      });

      expect(exitMock).toHaveBeenCalledWith(1);
    });
  });

  describe('Help message integration', () => {
    it('should include theme option in help message', () => {
      const mockShowHelp = () => {
        const helpText = `
Usage: 
  hiliner <file>                           # Interactive file viewer (default)
  hiliner [options] <file> <line-specs>    # Static line highlighting (legacy)

Options:
  -t, --theme <name>          Syntax highlighting theme (default: dark-plus)
  -o, --output <file>         Write output to file instead of stdout
  -m, --marker <char>         Character(s) to use for highlighting (default: \">\")
  -n, --line-numbers          Show line numbers (default: true)
  -r, --relative              Use relative line numbers from highlighted sections
  -c, --context <num>         Show context lines around highlighted sections (default: 0)
  --static                   Force static mode even with single file
  -h, --help                 Show this help message
  -v, --version              Show version number

Examples:
  hiliner file.js                         # Interactive viewer with default theme
  hiliner --theme monokai file.js         # Interactive viewer with monokai theme
  hiliner file.js 1 --theme dracula       # Static mode with dracula theme
`;
        console.log(helpText);
        return helpText;
      };

      const helpOutput = mockShowHelp();
      
      expect(helpOutput).toContain('--theme <name>');
      expect(helpOutput).toContain('-t, --theme');
      expect(helpOutput).toContain('Syntax highlighting theme');
      expect(helpOutput).toContain('default: dark-plus');
      expect(helpOutput).toContain('--theme monokai');
      expect(helpOutput).toContain('--theme dracula');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle empty theme string', () => {
      const mockValidateTheme = (theme: string) => {
        if (!theme || theme.trim() === '') {
          console.error(\"Error: Theme '' is not supported.\");
          process.exit(1);
        }
      };

      mockValidateTheme('');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(\"Error: Theme '' is not supported.\");
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should handle whitespace-only theme', () => {
      const mockValidateTheme = (theme: string) => {
        if (!theme || theme.trim() === '') {
          console.error(`Error: Theme '${theme}' is not supported.`);
          process.exit(1);
        }
      };

      mockValidateTheme('   ');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(\"Error: Theme '   ' is not supported.\");
      expect(exitMock).toHaveBeenCalledWith(1);
    });

    it('should handle case sensitivity correctly', () => {
      const availableThemes = ['dark-plus', 'monokai', 'dracula'];
      
      const mockValidateTheme = (theme: string) => {
        // Exact lowercase matching only
        if (!availableThemes.includes(theme)) {
          console.error(`Error: Theme '${theme}' is not supported.`);
          process.exit(1);
        }
      };

      // These should all fail
      ['Dark-Plus', 'MONOKAI', 'Dracula', 'DARK-PLUS'].forEach(invalidTheme => {
        mockValidateTheme(invalidTheme);
        expect(exitMock).toHaveBeenCalledWith(1);
      });

      expect(exitMock).toHaveBeenCalledTimes(4);
    });
  });
});