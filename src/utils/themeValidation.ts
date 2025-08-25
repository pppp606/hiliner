import { getAvailableThemes, isThemeSupported as shikiIsThemeSupported } from './syntaxHighlighter.js';

/**
 * Validate a theme name with exact lowercase matching
 * @param theme Theme name to validate
 * @returns The validated theme name
 * @throws Error with available themes list if theme is not supported
 */
export function validateTheme(theme: string): string {
  if (!theme || typeof theme !== 'string') {
    const availableThemes = getAvailableThemes();
    const themeList = availableThemes.length > 10 
      ? availableThemes.slice(0, 10).join(', ') + ', ...'
      : availableThemes.join(', ');
    throw new Error(`Theme '${theme}' is not supported. Available themes: ${themeList}`);
  }

  // Exact lowercase matching only - no case insensitive matching
  if (!shikiIsThemeSupported(theme)) {
    const availableThemes = getAvailableThemes();
    const themeList = availableThemes.length > 10 
      ? availableThemes.slice(0, 10).join(', ') + ', ...'
      : availableThemes.join(', ');
    throw new Error(`Theme '${theme}' is not supported. Available themes: ${themeList}`);
  }

  return theme;
}

/**
 * Check if a theme is supported (exact lowercase matching)
 * @param theme Theme name to check
 * @returns True if theme is supported, false otherwise
 */
export function isThemeSupported(theme: string): boolean {
  if (!theme || typeof theme !== 'string') {
    return false;
  }
  
  return shikiIsThemeSupported(theme);
}

/**
 * Get list of available theme names
 * @returns Array of available theme names
 */
export { getAvailableThemes } from './syntaxHighlighter.js';

/**
 * Get the default theme name
 * @returns Default theme name
 */
export function getDefaultTheme(): string {
  return 'dark-plus';
}