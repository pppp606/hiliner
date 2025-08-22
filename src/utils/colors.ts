/**
 * Color palette for Hiliner
 * Using uni-color-palette library with PaulTol light color scheme
 */

import chalk from 'chalk';

// PaulTol light color scheme - using #99DDFF for selection
// Reference: https://github.com/pppp606/uni-color-palette
const PAUL_TOL_LIGHT_BLUE = '#99DDFF';

/**
 * Color definitions using PaulTol light palette
 * Blue from the palette: #99DDFF
 */
export const colors = {
  // Selection colors
  selection: {
    primary: PAUL_TOL_LIGHT_BLUE, // #99DDFF from PaulTol light
  },
} as const;

/**
 * Chalk color functions
 * Pre-configured chalk functions for common use cases
 */
export const chalkColors = {
  // Selection styling using PaulTol light blue
  selectedLineNumber: chalk.hex(colors.selection.primary),
} as const;

/**
 * Get a chalk color function for a hex color
 * @param hex - Hex color string (e.g., '#99DDFF')
 * @returns Chalk color function
 */
export function getChalkColor(hex: string) {
  return chalk.hex(hex);
}