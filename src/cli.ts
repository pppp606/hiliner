#!/usr/bin/env node

/**
 * CLI entry point for hiliner
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { render } from 'ink';
import React from 'react';
import { App } from './components/App.js';
import { type CLIArgs } from './types.js';
import { validateTheme, getDefaultTheme } from './utils/themeValidation.js';
import { createActionRegistry } from './utils/actionRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_JSON = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8')
);

// Terminal control sequences
const TERMINAL_SEQUENCES = {
  CLEAR_SCREEN: '\x1Bc',
  ENTER_ALT_SCREEN: '\x1B[?1049h',
  EXIT_ALT_SCREEN: '\x1B[?1049l'
} as const;

/**
 * Show complete keymap (built-in + custom actions)
 */
async function showKeymap(configPath?: string): Promise<void> {
  try {
    console.log('🔄 Loading keymap...\n');
    
    // Create action registry to get complete keymap
    const registry = await createActionRegistry(configPath);
    const keymapHelp = registry.getFormattedKeymapHelp();
    
    console.log(keymapHelp);
    
    // Show additional examples
    console.log('\n📚 USAGE EXAMPLES:');
    console.log('   hiliner file.js              # Interactive mode');
    console.log('   hiliner --config my.json file.js  # With custom actions');
    console.log('   hiliner --keymap             # Show this keymap');
    console.log('\n💡 TIP: Press ? in interactive mode for basic help');
    
  } catch (error) {
    console.error('❌ Error loading keymap:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Show help message
 */
export function showHelp(): void {
  console.log(`
${PACKAGE_JSON.name} v${PACKAGE_JSON.version}

Interactive CLI file viewer with syntax highlighting

Usage: 
  hiliner <file>                      # Interactive file viewer
  hiliner [options] <file>            # Interactive file viewer with options

Arguments:
  file              Input file to view

Options:
  -c, --config <path>    Path to custom configuration file
  -t, --theme <name>     Syntax highlighting theme (default: dark-plus)
  -h, --help             Show this help message
  -v, --version          Show version number
  -k, --keymap           Show complete keymap (built-in + custom actions)
  --debug                Enable debug mode

Interactive Mode:
  Navigation shortcuts:
    ↑/↓               Scroll line by line
    Space/b           Page down/up
    g/G               Go to start/end of file
    q or Ctrl+C       Quit

  Multi-selection shortcuts:
    Tab               Toggle selection of current line
    Shift+Tab         Range selection (from previously selected line)
    a                 Select all visible lines
    d or Escape       Clear all selections

Examples:
  hiliner file.js                     # Interactive viewer with default theme
  hiliner --theme github-light file.js # Interactive viewer with GitHub Light theme
  hiliner --config custom.json file.js # Interactive viewer with custom config
  hiliner --theme monokai file.js     # Interactive viewer with Monokai theme
`);
}

/**
 * Handle CLI errors consistently
 */
function handleCliError(message: string, exitCode: number = 1): never {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
}

/**
 * Parse command line arguments
 */
export function parseCliArgs(): CLIArgs {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        keymap: { type: 'boolean', short: 'k' },
        theme: { type: 'string', short: 't' },
        config: { type: 'string', short: 'c' },
        debug: { type: 'boolean' },
      },
    });

    const [file] = positionals;

    return {
      help: values.help,
      version: values.version,
      keymap: values.keymap,
      file,
      theme: values.theme,
      config: values.config,
      debug: values.debug,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    handleCliError(`parsing arguments: ${errorMessage}`);
  }
}

/**
 * Main CLI function
 */
export async function main(): Promise<void> {
  const args = parseCliArgs();

  // Enable debug mode if --debug flag is passed
  if (args.debug) {
    process.env.DEBUG_MODE = 'true';
    console.debug('Debug mode enabled');
    console.debug(`Parsed arguments: ${JSON.stringify(args, null, 2)}`);
  }

  // Show help
  if (args.help) {
    showHelp();
    return;
  }

  // Show version
  if (args.version) {
    console.log(`${PACKAGE_JSON.name} v${PACKAGE_JSON.version}`);
    return;
  }

  // Show keymap
  if (args.keymap) {
    await showKeymap(args.config);
    return;
  }

  // Validate file argument
  if (!args.file) {
    console.error('Use --help for usage information');
    handleCliError('File path is required');
  }

  // Validate theme if provided
  let validatedTheme = getDefaultTheme();
  if (args.theme) {
    try {
      validatedTheme = validateTheme(args.theme);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      handleCliError(errorMessage);
    }
  }

  // Launch interactive mode with Ink
  try {
    // Clear terminal before starting
    process.stdout.write(TERMINAL_SEQUENCES.CLEAR_SCREEN);
    process.stdout.write(TERMINAL_SEQUENCES.ENTER_ALT_SCREEN);
    
    const { clear } = render(React.createElement(App, { 
      filePath: resolve(args.file),
      theme: validatedTheme,
      configPath: args.config ? resolve(args.config) : undefined
    }));
    
    // Handle graceful exit
    const handleExit = () => {
      clear();
      process.stdout.write(TERMINAL_SEQUENCES.EXIT_ALT_SCREEN);
      process.exit(0);
    };
    
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    handleCliError(`starting interactive mode: ${errorMessage}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
