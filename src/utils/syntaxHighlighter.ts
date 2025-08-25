import { createHighlighter, type Highlighter, bundledLanguages, bundledThemes, type BundledLanguage, type BundledTheme } from 'shiki';
import chalk from 'chalk';

// Global highlighter instance for reuse
let highlighterInstance: Highlighter | null = null;
let currentTheme = 'dark-plus';

// Fast initialization with common languages only
const COMMON_LANGUAGES: BundledLanguage[] = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'html', 'css', 'json', 'markdown', 'bash', 'yaml'
];

// Background initialization flag
let isBackgroundInitializationComplete = false;

// Light themes that need color adjustment for dark terminals
const LIGHT_THEMES = [
  'github-light',
  'github-light-default',
  'light-plus',
  'quiet-light',
  'red',
  'slack-theme',
  'solarized-light',
  'min-light',
  'one-light',
  'rose-pine-dawn',
  'vitesse-light',
  'catppuccin-latte'
];

/**
 * Initialize the Shiki highlighter with the specified theme
 * @param theme Theme name to use (defaults to 'dark-plus')
 * @param fastInit Whether to use fast initialization with common languages only (default: true)
 * @returns Promise resolving to the highlighter instance
 */
export async function initializeHighlighter(theme: string = 'dark-plus', fastInit: boolean = true): Promise<Highlighter> {
  const startTime = performance.now();
  
  // If highlighter exists and theme hasn't changed, return existing instance
  if (highlighterInstance && currentTheme === theme) {
    console.debug(`Syntax highlighter: Reused existing instance (${(performance.now() - startTime).toFixed(2)}ms)`);
    // Start background loading if not complete
    if (fastInit && !isBackgroundInitializationComplete) {
      scheduleBackgroundInit();
    }
    return highlighterInstance;
  }
  
  // Clean up existing highlighter if theme changed
  if (highlighterInstance && currentTheme !== theme) {
    const cleanupStart = performance.now();
    highlighterInstance.dispose?.();
    highlighterInstance = null;
    isBackgroundInitializationComplete = false;
    console.debug(`Syntax highlighter: Cleanup took ${(performance.now() - cleanupStart).toFixed(2)}ms`);
  }
  
  try {
    // Validate theme exists
    const themeValidationStart = performance.now();
    const availableThemes = Object.keys(bundledThemes) as BundledTheme[];
    const selectedTheme = availableThemes.includes(theme as BundledTheme) ? theme : 'dark-plus';
    console.debug(`Syntax highlighter: Theme validation took ${(performance.now() - themeValidationStart).toFixed(2)}ms`);
    
    // Choose languages to load based on initialization mode
    const initStart = performance.now();
    const languagesToLoad = fastInit ? COMMON_LANGUAGES : Object.keys(bundledLanguages) as BundledLanguage[];
    
    highlighterInstance = await createHighlighter({
      themes: [selectedTheme as BundledTheme],
      langs: languagesToLoad,
    });
    console.debug(`Syntax highlighter: Core initialization with ${languagesToLoad.length} languages took ${(performance.now() - initStart).toFixed(2)}ms`);
    
    currentTheme = selectedTheme;
    
    // Schedule background loading of remaining languages if using fast init
    if (fastInit && !isBackgroundInitializationComplete) {
      scheduleBackgroundInit();
    } else {
      isBackgroundInitializationComplete = true;
    }
    
    console.debug(`Syntax highlighter: Total initialization time ${(performance.now() - startTime).toFixed(2)}ms`);
    return highlighterInstance!; // We just created it, so it's not null
  } catch (error) {
    console.error('Failed to initialize syntax highlighter:', error);
    throw error;
  }
}

/**
 * Schedule background initialization of all languages
 */
function scheduleBackgroundInit(): void {
  if (isBackgroundInitializationComplete) return;
  
  // Use setTimeout to avoid blocking the main thread
  setTimeout(async () => {
    try {
      const bgStartTime = performance.now();
      console.debug('Syntax highlighter: Starting background initialization of all languages...');
      
      // Get all languages that aren't already loaded
      const allLanguages = Object.keys(bundledLanguages) as BundledLanguage[];
      const remainingLanguages = allLanguages.filter(lang => !COMMON_LANGUAGES.includes(lang));
      
      if (remainingLanguages.length > 0) {
        // Load remaining languages
        await highlighterInstance?.loadLanguage(...remainingLanguages);
        console.debug(`Syntax highlighter: Background loaded ${remainingLanguages.length} additional languages in ${(performance.now() - bgStartTime).toFixed(2)}ms`);
      }
      
      isBackgroundInitializationComplete = true;
    } catch (error) {
      console.warn('Background language loading failed:', error);
    }
  }, 0);
}

/**
 * Convert HTML with color styles to ANSI escape sequences for terminal display
 * @param html HTML string with inline styles
 * @param theme Theme name for light theme detection
 * @returns String with ANSI escape sequences
 */
function htmlToAnsi(html: string, theme: string = currentTheme): string {
  // Remove HTML structure tags but keep content
  let ansiString = html
    .replace(/<pre[^>]*>/g, '')
    .replace(/<\/pre>/g, '')
    .replace(/<code[^>]*>/g, '')
    .replace(/<\/code>/g, '');
  
  // Track if we need to maintain background color for light themes
  const lightThemes = ['github-light', 'light-plus', 'quiet-light', 'solarized-light'];
  const needsBackground = theme && lightThemes.includes(theme);
  
  // Convert span tags with color styles to ANSI escape sequences
  ansiString = ansiString.replace(/<span[^>]*style="color:([^"]+)"[^>]*>([^<]*)<\/span>/g, (match, color, text) => {
    return convertColorToAnsi(color, text, theme, needsBackground || false);
  });
  
  // Convert span tags with CSS classes to ANSI (fallback)
  ansiString = ansiString.replace(/<span[^>]*class="[^"]*"[^>]*>([^<]*)<\/span>/g, (match, text) => {
    // For now, just return the text without specific colors
    // We could enhance this by mapping CSS classes to ANSI colors
    return text;
  });
  
  // Remove any remaining HTML tags
  ansiString = ansiString.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities (including numeric entities)
  ansiString = ansiString
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#x26;/g, '&')  // Hexadecimal entity for &
    .replace(/&#38;/g, '&')   // Decimal entity for &
    .replace(/&quot;/g, '"')
    .replace(/&#x22;/g, '"')  // Hexadecimal entity for "
    .replace(/&#34;/g, '"')   // Decimal entity for "
    .replace(/&#x27;/g, "'")  // Hexadecimal entity for '
    .replace(/&#39;/g, "'")   // Decimal entity for '
    .replace(/&apos;/g, "'");
  
  return ansiString;
}

/**
 * Check if a theme is a light theme that needs color adjustment
 * @param theme Theme name to check
 * @returns True if theme is light and needs adjustment
 */
function isLightTheme(theme: string): boolean {
  return LIGHT_THEMES.includes(theme);
}

/**
 * Convert a color value to appropriate ANSI escape sequence
 * @param color Color in CSS format (hex, rgb, etc.)
 * @param text Text to apply color to
 * @param theme Theme name for light theme detection
 * @param maintainBackground Whether to maintain background color after reset
 * @returns Text wrapped with ANSI color codes
 */
function convertColorToAnsi(color: string, text: string, theme: string = currentTheme, maintainBackground: boolean = false): string {
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
    const basicColor = maintainBackground ? `${colorMap[normalizedColor]}\x1b[47m` : colorMap[normalizedColor];
    return `${basicColor}${text}`;
  }
  
  // Parse RGB values and convert to ANSI color (background already included if needed)
  if (normalizedColor.startsWith('#')) {
    const ansiColor = hexToAnsi(normalizedColor, theme);
    return `${ansiColor}${text}`;
  }
  
  if (normalizedColor.startsWith('rgb')) {
    const ansiColor = rgbToAnsi(normalizedColor, theme);
    return `${ansiColor}${text}`;
  }
  
  // Fallback: return text without color
  return text;
}

/**
 * Convert hex color to nearest ANSI color code
 * @param hex Hex color string (e.g., '#ff0000')
 * @param theme Theme name for light theme detection
 * @returns ANSI escape sequence
 */
function hexToAnsi(hex: string, theme: string = currentTheme): string {
  // Remove # and parse RGB values
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  return rgbToAnsiCode(r, g, b, theme);
}

/**
 * Convert RGB color to nearest ANSI color code
 * @param rgb RGB color string (e.g., 'rgb(255, 0, 0)')
 * @param theme Theme name for light theme detection
 * @returns ANSI escape sequence
 */
function rgbToAnsi(rgb: string, theme: string = currentTheme): string {
  const matches = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!matches) return '\x1b[37m'; // Default to white
  
  const r = parseInt(matches[1]);
  const g = parseInt(matches[2]);
  const b = parseInt(matches[3]);
  
  return rgbToAnsiCode(r, g, b, theme);
}

/**
 * Detect True Color support in the terminal
 * @returns True if terminal supports 24-bit color
 */
function supportsTrueColor(): boolean {
  // Check common environment variables for True Color support
  const colorterm = process.env.COLORTERM;
  if (colorterm === 'truecolor' || colorterm === '24bit') {
    return true;
  }
  
  // Check TERM variable for known True Color terminals
  const term = process.env.TERM || '';
  if (term.includes('256color') || term.includes('truecolor')) {
    // 256color doesn't guarantee True Color, but modern terminals usually support it
    return true;
  }
  
  // Default to 256-color for safety
  return false;
}

// Cache the result for performance
const hasTrueColor = supportsTrueColor();

/**
 * Convert RGB values to ANSI color code
 * @param r Red value (0-255)
 * @param g Green value (0-255) 
 * @param b Blue value (0-255)
 * @param theme Theme name for light theme detection
 * @returns ANSI escape sequence
 */
function rgbToAnsiCode(r: number, g: number, b: number, theme: string = currentTheme): string {
  const isLight = isLightTheme(theme);
  
  // For very dark colors in light themes, ensure visibility
  const brightness = (r + g + b) / 3;
  if (isLight && brightness < 64) {
    // Brighten very dark colors for visibility on dark terminals
    const factor = 2.5;
    r = Math.min(255, Math.round(r * factor));
    g = Math.min(255, Math.round(g * factor));
    b = Math.min(255, Math.round(b * factor));
  }
  
  if (hasTrueColor) {
    // Use 24-bit True Color with proper background handling for light themes
    if (isLight) {
      // Separate foreground and background color codes
      return `\x1b[38;2;${r};${g};${b}m\x1b[47m`;
    } else {
      // ESC[38;2;{r};{g};{b}m for foreground color only
      return `\x1b[38;2;${r};${g};${b}m`;
    }
  } else {
    // Fallback to 256-color mode for compatibility
    const r6 = Math.round(r / 255 * 5);
    const g6 = Math.round(g / 255 * 5);
    const b6 = Math.round(b / 255 * 5);
    const color256 = 16 + 36 * r6 + 6 * g6 + b6;
    
    if (isLight) {
      // Separate 256-color foreground and background codes
      return `\x1b[38;5;${color256}m\x1b[47m`;
    } else {
      return `\x1b[38;5;${color256}m`;
    }
  }
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
    
    // Check if the specific language is loaded, load it if needed
    const loadedLanguages = highlighter.getLoadedLanguages();
    if (!loadedLanguages.includes(language as BundledLanguage)) {
      console.debug(`Syntax highlighter: Loading language '${language}' on demand`);
      try {
        await highlighter.loadLanguage(language as BundledLanguage);
      } catch (error) {
        console.warn(`Failed to load language '${language}':`, error);
        return code; // Fallback to plain text
      }
    }
    
    // Generate highlighted HTML
    const html = highlighter.codeToHtml(code, {
      lang: language as BundledLanguage,
      theme: (theme || currentTheme) as BundledTheme,
    });
    
    
    // Convert HTML to ANSI escape sequences
    const ansiCode = htmlToAnsi(html, theme || currentTheme);
    
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
 * Interface for theme base colors
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  secondaryForeground: string;
  accent: string;
  selection: string;
  lineNumber: string;
  lineNumberActive: string;
  comment: string;
}

/**
 * Get base colors for a theme (simplified approach)
 * @param theme Theme name
 * @returns Theme color palette
 */
export async function getThemeColors(theme: string): Promise<ThemeColors> {
  // Use a simplified approach with predefined color schemes for known themes
  const isLight = isLightTheme(theme);
  
  // Define color schemes for popular themes
  const themeSchemes: Record<string, Partial<ThemeColors>> = {
    'github-light': {
      background: '#ffffff',
      foreground: '#24292f',
      secondaryForeground: '#656d76',
      accent: '#0969da',
      selection: '#dbeafe',
      lineNumber: '#656d76',
      lineNumberActive: '#24292f',
      comment: '#6e7781'
    },
    'github-dark': {
      background: '#0d1117',
      foreground: '#e6edf3',
      secondaryForeground: '#8b949e',
      accent: '#79c0ff',
      selection: '#264f78',
      lineNumber: '#8b949e',
      lineNumberActive: '#e6edf3',
      comment: '#8b949e'
    },
    'dark-plus': {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      secondaryForeground: '#969696',
      accent: '#007acc',
      selection: '#264f78',
      lineNumber: '#858585',
      lineNumberActive: '#d4d4d4',
      comment: '#6a9955'
    },
    'monokai': {
      background: '#272822',
      foreground: '#f8f8f2',
      secondaryForeground: '#75715e',
      accent: '#66d9ef',
      selection: '#49483e',
      lineNumber: '#90908a',
      lineNumberActive: '#f8f8f2',
      comment: '#75715e'
    }
  };

  const scheme = themeSchemes[theme];
  const fallback = {
    background: isLight ? '#ffffff' : '#000000',
    foreground: isLight ? '#000000' : '#ffffff',
    secondaryForeground: isLight ? '#666666' : '#999999',
    accent: isLight ? '#005CC5' : '#79B8FF',
    selection: isLight ? '#e6f3ff' : '#264f78',
    lineNumber: isLight ? '#999999' : '#666666',
    lineNumberActive: isLight ? '#000000' : '#ffffff',
    comment: isLight ? '#888888' : '#999999'
  };

  return { ...fallback, ...scheme };
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