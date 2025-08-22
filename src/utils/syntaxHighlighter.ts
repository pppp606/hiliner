import { createHighlighter, type Highlighter, bundledLanguages, bundledThemes, type BundledLanguage, type BundledTheme } from 'shiki';

// Global highlighter instance for reuse
let highlighterInstance: Highlighter | null = null;
let currentTheme = 'dark-plus';

/**
 * Initialize the Shiki highlighter with the specified theme
 * @param theme Theme name to use (defaults to 'dark-plus')
 * @returns Promise resolving to the highlighter instance
 */
export async function initializeHighlighter(theme: string = 'dark-plus'): Promise<Highlighter> {
  // If highlighter exists and theme hasn't changed, return existing instance
  if (highlighterInstance && currentTheme === theme) {
    return highlighterInstance;
  }
  
  // Clean up existing highlighter if theme changed
  if (highlighterInstance && currentTheme !== theme) {
    highlighterInstance.dispose?.();
    highlighterInstance = null;
  }
  
  try {
    // Validate theme exists
    const availableThemes = Object.keys(bundledThemes) as BundledTheme[];
    const selectedTheme = availableThemes.includes(theme as BundledTheme) ? theme : 'dark-plus';
    
    // Initialize highlighter with all bundled languages and the selected theme
    highlighterInstance = await createHighlighter({
      themes: [selectedTheme as BundledTheme],
      langs: Object.keys(bundledLanguages) as BundledLanguage[],
    });
    
    currentTheme = selectedTheme;
    return highlighterInstance!; // We just created it, so it's not null
  } catch (error) {
    console.error('Failed to initialize syntax highlighter:', error);
    throw error;
  }
}

/**
 * Convert HTML with color styles to ANSI escape sequences for terminal display
 * @param html HTML string with inline styles
 * @returns String with ANSI escape sequences
 */
function htmlToAnsi(html: string): string {
  // Remove HTML structure tags but keep content
  let ansiString = html
    .replace(/<pre[^>]*>/g, '')
    .replace(/<\/pre>/g, '')
    .replace(/<code[^>]*>/g, '')
    .replace(/<\/code>/g, '');
  
  // Convert span tags with color styles to ANSI escape sequences
  ansiString = ansiString.replace(/<span[^>]*style="color:([^"]+)"[^>]*>([^<]*)<\/span>/g, (match, color, text) => {
    return convertColorToAnsi(color, text);
  });
  
  // Convert span tags with CSS classes to ANSI (fallback)
  ansiString = ansiString.replace(/<span[^>]*class="[^"]*"[^>]*>([^<]*)<\/span>/g, (match, text) => {
    // For now, just return the text without specific colors
    // We could enhance this by mapping CSS classes to ANSI colors
    return text;
  });
  
  // Remove any remaining HTML tags
  ansiString = ansiString.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  ansiString = ansiString
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
  
  return ansiString;
}

/**
 * Convert a color value to appropriate ANSI escape sequence
 * @param color Color in CSS format (hex, rgb, etc.)
 * @param text Text to apply color to
 * @returns Text wrapped with ANSI color codes
 */
function convertColorToAnsi(color: string, text: string): string {
  // Color mapping from common syntax highlighting colors to ANSI
  const colorMap: Record<string, string> = {
    // Keywords (blue variants)
    '#569cd6': '\x1b[34m', // Blue
    '#4ec9b0': '\x1b[36m', // Cyan  
    '#c586c0': '\x1b[35m', // Magenta
    
    // Strings (green variants)
    '#ce9178': '\x1b[33m', // Yellow/Orange for strings
    '#6a9955': '\x1b[32m', // Green for comments
    
    // Numbers and constants
    '#b5cea8': '\x1b[32m', // Light green for numbers
    
    // Functions and methods
    '#dcdcaa': '\x1b[33m', // Yellow
    
    // Types
    '#4fc1ff': '\x1b[36m', // Light cyan
    
    // Default colors
    '#d4d4d4': '\x1b[37m', // White/default
    '#ffffff': '\x1b[37m', // White
    
    // Error/warning colors  
    '#f44747': '\x1b[31m', // Red
    '#ff8c00': '\x1b[33m', // Orange
  };
  
  // Normalize color (remove spaces, convert to lowercase)
  const normalizedColor = color.trim().toLowerCase();
  
  // Try exact match first
  if (colorMap[normalizedColor]) {
    return `${colorMap[normalizedColor]}${text}\x1b[0m`;
  }
  
  // Parse RGB values and convert to nearest ANSI color
  if (normalizedColor.startsWith('#')) {
    const ansiColor = hexToAnsi(normalizedColor);
    return `${ansiColor}${text}\x1b[0m`;
  }
  
  if (normalizedColor.startsWith('rgb')) {
    const ansiColor = rgbToAnsi(normalizedColor);
    return `${ansiColor}${text}\x1b[0m`;
  }
  
  // Fallback: return text without color
  return text;
}

/**
 * Convert hex color to nearest ANSI color code
 * @param hex Hex color string (e.g., '#ff0000')
 * @returns ANSI escape sequence
 */
function hexToAnsi(hex: string): string {
  // Remove # and parse RGB values
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  return rgbToAnsiCode(r, g, b);
}

/**
 * Convert RGB color to nearest ANSI color code
 * @param rgb RGB color string (e.g., 'rgb(255, 0, 0)')
 * @returns ANSI escape sequence
 */
function rgbToAnsi(rgb: string): string {
  const matches = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!matches) return '\x1b[37m'; // Default to white
  
  const r = parseInt(matches[1]);
  const g = parseInt(matches[2]);
  const b = parseInt(matches[3]);
  
  return rgbToAnsiCode(r, g, b);
}

/**
 * Convert RGB values to nearest ANSI color code
 * @param r Red value (0-255)
 * @param g Green value (0-255) 
 * @param b Blue value (0-255)
 * @returns ANSI escape sequence
 */
function rgbToAnsiCode(r: number, g: number, b: number): string {
  // Simple mapping to 16 basic ANSI colors based on dominant channel
  const brightness = (r + g + b) / 3;
  
  if (brightness < 64) return '\x1b[30m';      // Black
  if (r > g && r > b && r > 128) return '\x1b[31m'; // Red
  if (g > r && g > b && g > 128) return '\x1b[32m'; // Green
  if (r > 128 && g > 128 && b < 128) return '\x1b[33m'; // Yellow
  if (b > r && b > g && b > 128) return '\x1b[34m'; // Blue
  if (r > 128 && b > 128 && g < 128) return '\x1b[35m'; // Magenta
  if (g > 128 && b > 128 && r < 128) return '\x1b[36m'; // Cyan
  
  return '\x1b[37m'; // White (default)
}

/**
 * Highlight source code with syntax highlighting and convert to ANSI escape sequences
 * @param code Source code to highlight
 * @param language Programming language identifier
 * @param theme Theme name (optional, defaults to current theme)
 * @returns Promise resolving to highlighted code with ANSI escape sequences
 */
export async function highlightCode(
  code: string,
  language: string,
  theme?: string
): Promise<string> {
  // Handle edge cases
  if (!code || code === null || code === undefined) {
    return '';
  }
  
  if (typeof code !== 'string') {
    return String(code);
  }
  
  // For plain text, return as-is
  if (language === 'text' || language === 'plaintext') {
    return code;
  }
  
  try {
    // Initialize highlighter with specified theme
    const highlighter = await initializeHighlighter(theme || currentTheme);
    
    // Get available languages
    const availableLanguages = Object.keys(bundledLanguages);
    
    // Check if language is supported
    if (!availableLanguages.includes(language)) {
      // Fallback to plain text for unsupported languages
      return code;
    }
    
    // Generate highlighted HTML
    const html = highlighter.codeToHtml(code, {
      lang: language as BundledLanguage,
      theme: (theme || currentTheme) as BundledTheme,
    });
    
    // Convert HTML to ANSI escape sequences
    const ansiCode = htmlToAnsi(html);
    
    return ansiCode;
    
  } catch (error) {
    console.warn(`Failed to highlight ${language} code:`, error);
    // Fallback to original code without highlighting
    return code;
  }
}

/**
 * Get list of available theme names
 * @returns Array of theme names supported by Shiki
 */
export function getAvailableThemes(): string[] {
  return Object.keys(bundledThemes);
}

/**
 * Get list of available language identifiers
 * @returns Array of language identifiers supported by Shiki
 */
export function getAvailableLanguages(): string[] {
  return Object.keys(bundledLanguages);
}

/**
 * Check if a language is supported by the highlighter
 * @param language Language identifier to check
 * @returns True if language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return Object.keys(bundledLanguages).includes(language);
}

/**
 * Check if a theme is supported by the highlighter
 * @param theme Theme name to check
 * @returns True if theme is supported
 */
export function isThemeSupported(theme: string): boolean {
  return Object.keys(bundledThemes).includes(theme);
}

/**
 * Cleanup highlighter resources
 * Should be called when the application exits
 */
export async function cleanup(): Promise<void> {
  if (highlighterInstance) {
    try {
      highlighterInstance.dispose?.();
    } catch (error) {
      console.warn('Error during highlighter cleanup:', error);
    } finally {
      highlighterInstance = null;
      currentTheme = 'dark-plus';
    }
  }
}