#!/usr/bin/env node

/**
 * CLI entry point for hiliner
 * This script bootstraps the TypeScript CLI module
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load from dist first (production), then src (development)
try {
  await import(join(__dirname, '..', 'dist', 'cli.js'));
} catch (error) {
  console.error('Error: Could not load hiliner CLI');
  console.error('Make sure to run "npm run build" first');
  console.error('Original error:', error.message);
  process.exit(1);
}