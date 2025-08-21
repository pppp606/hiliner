#!/usr/bin/env node

/**
 * CLI entry point for hiliner
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parseArgs } from 'util';
import { highlightLines } from './highlighter';
import { parseLineSpecs } from './parser';
import { type CLIArgs } from './types';

const PACKAGE_JSON = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8')
);

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
${PACKAGE_JSON.name} v${PACKAGE_JSON.version}

Usage: hiliner [options] <file> <line-specs...>

Arguments:
  file              Input file to highlight lines from
  line-specs        Line specifications (e.g., "1", "5-10", "15+3")

Options:
  -o, --output <file>     Write output to file instead of stdout
  -m, --marker <char>     Character(s) to use for highlighting (default: ">")
  -n, --line-numbers      Show line numbers (default: true)
  -r, --relative          Use relative line numbers from highlighted sections
  -c, --context <num>     Show context lines around highlighted sections (default: 0)
  -h, --help             Show this help message
  -v, --version          Show version number

Examples:
  hiliner file.js 1               # Highlight line 1
  hiliner file.js 1-5             # Highlight lines 1 through 5
  hiliner file.js 10+3            # Highlight 3 lines starting from line 10
  hiliner file.js 1 5-8 15        # Multiple line specifications
  hiliner file.js 1-5 -m ">>>"    # Use custom marker
  hiliner file.js 1-5 -c 2        # Show 2 context lines around highlights
  hiliner file.js 1-5 -o out.txt  # Write to file instead of stdout
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
    };
  } catch (error) {
    console.error('Error parsing arguments:', error.message);
    process.exit(1);
  }
}

/**
 * Main CLI function
 */
export async function main(): Promise<void> {
  const args = parseCliArgs();

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

  // Validate required arguments
  if (!args.file) {
    console.error('Error: File path is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  if (!args.lines || args.lines.length === 0) {
    console.error('Error: At least one line specification is required');
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
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}