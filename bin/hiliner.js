#!/usr/bin/env node

/**
 * CLI entry point for hiliner
 * This script bootstraps the TypeScript CLI module
 */

const path = require('path');

// Try to load from dist first (production), then src (development)
try {
  require(path.join(__dirname, '..', 'dist', 'cli.js'));
} catch (error) {
  // Fallback to ts-node for development
  try {
    require('ts-node/register');
    require(path.join(__dirname, '..', 'src', 'cli.ts'));
  } catch (tsError) {
    console.error('Error: Could not load hiliner CLI');
    console.error('Make sure to run "npm run build" or install ts-node for development');
    console.error('Original error:', error.message);
    process.exit(1);
  }
}