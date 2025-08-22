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
import { highlightLines } from './highlighter.js';
import { parseLineSpecs } from './parser.js';
import { type CLIArgs } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_JSON = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8')
);

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
${PACKAGE_JSON.name} v${PACKAGE_JSON.version}

Usage: 
  hiliner <file>                           # Interactive file viewer (default)
  hiliner [options] <file> <line-specs>    # Static line highlighting (legacy)

Arguments:
  file              Input file to view or highlight
  line-specs        Line specifications for static mode (e.g., "1", "5-10", "15+3")

Interactive Mode (default):
  When only a file is provided, hiliner opens an interactive terminal viewer
  
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

Static Mode Options:
  -o, --output <file>     Write output to file instead of stdout
  -m, --marker <char>     Character(s) to use for highlighting (default: ">")
  -n, --line-numbers      Show line numbers (default: true)
  -r, --relative          Use relative line numbers from highlighted sections
  -c, --context <num>     Show context lines around highlighted sections (default: 0)
  --static               Force static mode even with single file
  -h, --help             Show this help message
  -v, --version          Show version number

Examples:
  hiliner file.js                     # Interactive viewer
  hiliner file.js --static            # Static mode with no highlighting  
  hiliner file.js 1                   # Static mode: highlight line 1
  hiliner file.js 1-5                 # Static mode: highlight lines 1-5
  hiliner file.js 10+3                # Static mode: highlight 3 lines from line 10
  hiliner file.js 1 5-8 15            # Static mode: multiple line specs
  hiliner file.js 1-5 -m ">>>"        # Static mode: custom marker
  hiliner file.js 1-5 -c 2            # Static mode: context lines
  hiliner file.js 1-5 -o out.txt      # Static mode: output to file
`);
}

/**
 * Parse command line arguments
 */
function parseCliArgs(): CLIArgs {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        output: { type: 'string', short: 'o' },
        marker: { type: 'string', short: 'm' },
        'line-numbers': { type: 'boolean', short: 'n' },
        relative: { type: 'boolean', short: 'r' },
        context: { type: 'string', short: 'c' },
        static: { type: 'boolean' },
        debug: { type: 'boolean' },
      },
    });

    const [file, ...lines] = positionals;

    return {
      help: values.help,
      version: values.version,
      file,
      lines,
      output: values.output,
      marker: values.marker,
      lineNumbers: values['line-numbers'],
      relative: values.relative,
      context: values.context ? parseInt(values.context, 10) : undefined,
      static: values.static,
      debug: values.debug,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error parsing arguments:', errorMessage);
    process.exit(1);
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

  // Validate file argument
  if (!args.file) {
    console.error('Error: File path is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Determine mode: Interactive vs Static
  const isInteractiveMode = !args.static && (!args.lines || args.lines.length === 0);

  if (isInteractiveMode) {
    // Launch interactive mode with Ink
    try {
      // Clear terminal before starting
      process.stdout.write('\x1Bc'); // Clear terminal
      process.stdout.write('\x1B[?1049h'); // Enter alternate screen buffer
      
      const { clear } = render(React.createElement(App, { filePath: resolve(args.file) }));
      
      // Handle graceful exit
      process.on('SIGINT', () => {
        clear();
        process.stdout.write('\x1B[?1049l'); // Exit alternate screen buffer
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        clear();
        process.stdout.write('\x1B[?1049l'); // Exit alternate screen buffer
        process.exit(0);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error starting interactive mode:', errorMessage);
      process.exit(1);
    }
  } else {
    // Static mode - require line specifications
    if (!args.lines || args.lines.length === 0) {
      console.error('Error: Line specifications are required for static mode');
      console.error('Use --help for usage information');
      process.exit(1);
    }

    try {
      // Read input file
      const content = readFileSync(resolve(args.file), 'utf-8');

      // Parse line specifications
      const lineSpecs = parseLineSpecs(args.lines);

      // Highlight lines
      const result = highlightLines(content, lineSpecs, {
        marker: args.marker,
        showLineNumbers: args.lineNumbers,
        relativeLineNumbers: args.relative,
        context: args.context,
      });

      // Output result
      if (args.output) {
        writeFileSync(resolve(args.output), result);
        console.error(`Output written to ${args.output}`);
      } else {
        console.log(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error:', errorMessage);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
