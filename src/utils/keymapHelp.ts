/**
 * Keymap Help System for Hiliner
 * 
 * Provides functionality to display comprehensive help including:
 * - Built-in key bindings
 * - Custom actions from user configuration
 * - Merged and categorized key mapping information
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ActionDefinition, ActionConfig } from '../types/actionConfig.js';

// Load builtin keymap from JSON file
function loadBuiltinKeymap(): { actions: ActionDefinition[] } {
  try {
    // Try different possible paths
    const possiblePaths = [
      // For compiled dist version
      path.resolve(process.cwd(), 'dist/data/builtinKeymap.json'),
      // For development
      path.resolve(process.cwd(), 'src/data/builtinKeymap.json'),
      // Relative to current module
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../data/builtinKeymap.json')
    ];
    
    for (const keymapPath of possiblePaths) {
      try {
        const keymapData = fs.readFileSync(keymapPath, 'utf-8');
        return JSON.parse(keymapData);
      } catch {
        // Try next path
        continue;
      }
    }
    
    throw new Error('Could not find builtinKeymap.json in any expected location');
  } catch (error) {
    console.error('Warning: Could not load builtin keymap:', error);
    return { actions: [] };
  }
}

const builtinKeymap = loadBuiltinKeymap();

export interface KeymapEntry {
  key: string;
  alternativeKeys?: string[];
  name: string;
  description: string;
  category: string;
  builtin: boolean;
  source?: string; // For custom actions, indicates which file it came from
}

export interface KeymapHelpResult {
  categories: Record<string, KeymapEntry[]>;
  totalBuiltin: number;
  totalCustom: number;
  conflicts: string[];
}

/**
 * Generate comprehensive keymap help information
 */
export function generateKeymapHelp(
  customActions: ActionDefinition[] = [],
  configSources?: Record<string, string> // Maps action ID to source file
): KeymapHelpResult {
  const categories: Record<string, KeymapEntry[]> = {};
  const conflicts: string[] = [];
  const usedKeys = new Set<string>();
  
  let totalBuiltin = 0;
  let totalCustom = 0;

  // Process built-in actions first
  for (const action of builtinKeymap.actions) {
    const entry: KeymapEntry = {
      key: action.key,
      alternativeKeys: action.alternativeKeys,
      name: action.name || action.id,
      description: action.description || 'Built-in action',
      category: action.category || 'general',
      builtin: true
    };

    // Track used keys for conflict detection
    usedKeys.add(action.key);
    if (action.alternativeKeys) {
      action.alternativeKeys.forEach(key => usedKeys.add(key));
    }

    // Add to category
    const categoryName = entry.category;
    if (!categories[categoryName]) {
      categories[categoryName] = [];
    }
    categories[categoryName].push(entry);
    totalBuiltin++;
  }

  // Process custom actions
  for (const action of customActions) {
    // Check for key conflicts
    if (usedKeys.has(action.key)) {
      conflicts.push(`Key '${action.key}' conflicts between built-in and custom action '${action.id}'`);
    }

    const entry: KeymapEntry = {
      key: action.key,
      alternativeKeys: action.alternativeKeys,
      name: action.name || action.id,
      description: action.description || 'Custom action',
      category: action.category || 'custom',
      builtin: false,
      source: configSources?.[action.id]
    };

    usedKeys.add(action.key);
    if (action.alternativeKeys) {
      action.alternativeKeys.forEach(key => usedKeys.add(key));
    }

    // Add to category
    const categoryName = entry.category;
    if (!categories[categoryName]) {
      categories[categoryName] = [];
    }
    categories[categoryName].push(entry);
    totalCustom++;
  }

  // Sort categories and entries within categories
  const sortedCategories: Record<string, KeymapEntry[]> = {};
  const categoryOrder = ['navigation', 'selection', 'file', 'help', 'custom', 'general'];
  
  for (const cat of categoryOrder) {
    if (categories[cat]) {
      sortedCategories[cat] = categories[cat].sort((a, b) => a.key.localeCompare(b.key));
    }
  }
  
  // Add any remaining categories
  for (const [cat, entries] of Object.entries(categories)) {
    if (!categoryOrder.includes(cat)) {
      sortedCategories[cat] = entries.sort((a, b) => a.key.localeCompare(b.key));
    }
  }

  return {
    categories: sortedCategories,
    totalBuiltin,
    totalCustom,
    conflicts
  };
}

/**
 * Convert arrow key names to symbols
 */
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    'space': 'Space',
    'tab': 'Tab',
    'shift+tab': 'Shift+Tab',
  };
  return keyMap[key.toLowerCase()] || key;
}

/**
 * Format keymap help as a readable string
 */
export function formatKeymapHelp(helpResult: KeymapHelpResult): string {
  const lines: string[] = [];
  
  // Header
  lines.push('🗺️  HILINER KEYMAP');
  lines.push(`📊 Total: ${helpResult.totalBuiltin} built-in, ${helpResult.totalCustom} custom actions`);
  lines.push('');

  // Conflicts (if any)
  if (helpResult.conflicts.length > 0) {
    lines.push('⚠️  KEY CONFLICTS');
    lines.push(''.padEnd(50, '-'));
    helpResult.conflicts.forEach(conflict => lines.push(conflict));
    lines.push('');
  }

  // Categories
  for (const [categoryName, entries] of Object.entries(helpResult.categories)) {
    const categoryTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    lines.push(`${categoryTitle.toUpperCase()} ${'-'.repeat(50 - categoryTitle.length)}`);
    
    // Find the maximum key width for this category for better alignment
    let maxKeyWidth = 0;
    for (const entry of entries) {
      const keys = [formatKey(entry.key), ...(entry.alternativeKeys || []).map(formatKey)].join(', ');
      maxKeyWidth = Math.max(maxKeyWidth, keys.length);
    }
    // Ensure minimum width
    maxKeyWidth = Math.max(maxKeyWidth, 12);
    
    for (const entry of entries) {
      const keys = [formatKey(entry.key), ...(entry.alternativeKeys || []).map(formatKey)].join(', ');
      const source = entry.source ? ` (${entry.source})` : '';
      const description = `${entry.name} - ${entry.description}${source}`;
      
      // Format: "keys | description"
      lines.push(`${keys.padEnd(maxKeyWidth)} | ${description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get icon for category
 */
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    navigation: '🧭',
    selection: '✅',
    file: '📁',
    help: '❓',
    custom: '⚙️',
    general: '🔧'
  };
  return icons[category] || '📋';
}

/**
 * Generate compact keymap summary for status display
 */
export function generateKeymapSummary(helpResult: KeymapHelpResult): string {
  const totalActions = helpResult.totalBuiltin + helpResult.totalCustom;
  const conflictsText = helpResult.conflicts.length > 0 ? ` (${helpResult.conflicts.length} conflicts)` : '';
  return `${totalActions} actions: ${helpResult.totalBuiltin} built-in, ${helpResult.totalCustom} custom${conflictsText}`;
}