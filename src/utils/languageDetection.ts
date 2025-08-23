// Import the language detection library
import pkg from '@vscode/vscode-languagedetection';

// Type for ModelOperations constructor
type ModelOperationsConstructor = new () => {
  runModel(content: string): Promise<Array<{ languageId: string; confidence: number }>>;
};

// Handle both ESM and CommonJS environments
let ModelOperations: ModelOperationsConstructor;
if (pkg && typeof pkg === 'object' && 'ModelOperations' in pkg) {
  ModelOperations = (pkg as { ModelOperations: ModelOperationsConstructor }).ModelOperations;
} else if (pkg && typeof pkg === 'function') {
  ModelOperations = pkg as ModelOperationsConstructor;
} else {
  // Fallback - try to find ModelOperations in the package
  const fallback = (pkg as { default?: { ModelOperations: ModelOperationsConstructor }; ModelOperations?: ModelOperationsConstructor })?.default?.ModelOperations 
    || (pkg as { ModelOperations: ModelOperationsConstructor })?.ModelOperations 
    || pkg as ModelOperationsConstructor;
  ModelOperations = fallback;
}
import { extname } from 'path';

// Language detection instance
let languageDetector: InstanceType<typeof ModelOperations> | null = null;

// Cache for language detection results to avoid repeated analysis
const languageCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

// Common file extension mappings to language identifiers
const EXTENSION_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.cc': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.fish': 'fish',
  '.ps1': 'powershell',
  '.html': 'html',
  '.htm': 'html',
  '.xml': 'xml',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.cfg': 'ini',
  '.conf': 'ini',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.sql': 'sql',
  '.r': 'r',
  '.R': 'r',
  '.m': 'matlab',
  '.pl': 'perl',
  '.lua': 'lua',
  '.vim': 'vim',
  '.dockerfile': 'dockerfile',
  '.dockerignore': 'ignore',
  '.gitignore': 'ignore',
  '.txt': 'text',
  '.log': 'text',
};

// Shebang patterns to language mappings
const SHEBANG_MAP: Record<string, string> = {
  'node': 'javascript',
  'python': 'python',
  'python3': 'python',
  'bash': 'bash',
  'sh': 'bash',
  'zsh': 'zsh',
  'fish': 'fish',
  'ruby': 'ruby',
  'perl': 'perl',
  'php': 'php',
};

/**
 * Initialize the language detector if not already initialized
 */
async function initializeDetector(): Promise<InstanceType<typeof ModelOperations>> {
  if (!languageDetector) {
    if (typeof ModelOperations !== 'function') {
      throw new Error(`ModelOperations is not a constructor: ${typeof ModelOperations}`);
    }
    languageDetector = new ModelOperations();
  }
  return languageDetector;
}

/**
 * Extract language from shebang line (e.g., #!/bin/bash)
 */
function detectFromShebang(content: string): string | null {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim();
  
  if (!firstLine?.startsWith('#!')) {
    return null;
  }
  
  const shebangLine = firstLine.substring(2); // Remove #!
  
  // Check for common interpreter patterns
  for (const [pattern, language] of Object.entries(SHEBANG_MAP)) {
    if (shebangLine.includes(pattern)) {
      return language;
    }
  }
  
  return null;
}

/**
 * Detect language from file extension
 */
function detectFromExtension(filename: string): string | null {
  if (!filename) {
    return null;
  }
  
  const extension = extname(filename).toLowerCase();
  return EXTENSION_MAP[extension] || null;
}

/**
 * Detect language from content using VS Code's language detection
 */
async function detectFromContent(content: string): Promise<string | null> {
  try {
    // Skip detection for empty or whitespace-only content
    if (!content || !content.trim()) {
      return null;
    }
    
    // Skip detection for very short content (less than 10 characters)
    if (content.trim().length < 10) {
      return null;
    }
    
    // Skip detection for binary content (contains null bytes)
    if (content.includes('\0')) {
      return null;
    }
    
    const detector = await initializeDetector();
    const result = await detector.runModel(content);
    
    // Get the language with the highest confidence
    if (result && result.length > 0) {
      const topResult = result[0];
      
      // Only return result if confidence is reasonable (> 0.03)
      if (topResult.confidence > 0.03) {
        return mapVSCodeLanguageToShiki(topResult.languageId);
      }
    }
    
    return null;
  } catch (error) {
    // Fallback gracefully on any detection error
    console.warn('Language detection from content failed:', error);
    return null;
  }
}

/**
 * Map VS Code language identifiers to Shiki language identifiers
 * Some languages may have different identifiers between the two systems
 */
function mapVSCodeLanguageToShiki(vscodeLanguageId: string): string {
  // Most language IDs are the same, but handle any exceptions here
  const mappings: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'bash',
    'bat': 'batch',
    'ps1': 'powershell',
    'md': 'markdown',
    'cpp': 'cpp',
    'cs': 'csharp',
    'kt': 'kotlin',
    'rs': 'rust',
    'ex': 'elixir',
    'hs': 'haskell',
    'jl': 'julia',
    'f90': 'fortran',
    'pm': 'perl',
    'mm': 'objective-cpp',
    'cbl': 'cobol',
    'pas': 'pascal',
    'plaintext': 'text',
  };
  
  return mappings[vscodeLanguageId] || vscodeLanguageId;
}

/**
 * Generate a cache key for language detection results
 * Uses filename extension + content hash for efficient caching
 */
function generateCacheKey(filename: string, content: string): string {
  const extension = extname(filename).toLowerCase();
  // Use first/last 100 chars + content length for fast fingerprinting
  const contentFingerprint = content.length + ':' + 
    (content.length > 200 ? content.slice(0, 100) + content.slice(-100) : content);
  return `${extension}:${contentFingerprint}`;
}

/**
 * Manage cache size to prevent memory bloat
 */
function maintainCacheSize(): void {
  if (languageCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(languageCache.keys()).slice(0, languageCache.size - MAX_CACHE_SIZE + 100);
    for (const key of keysToDelete) {
      languageCache.delete(key);
    }
  }
}

/**
 * Detect programming language from filename and content with caching
 * Priority: Cache > Shebang > File Extension > Content Analysis > Plain Text
 * 
 * @param filename The name of the file (including extension)
 * @param content The content of the file
 * @returns Promise resolving to the detected language identifier
 */
export async function detectLanguage(filename: string, content: string): Promise<string> {
  const startTime = performance.now();
  
  try {
    // 0. Check cache first (fastest)
    const cacheKey = generateCacheKey(filename, content);
    const cachedResult = languageCache.get(cacheKey);
    if (cachedResult) {
      console.debug(`Language detection: Cache hit for '${filename}' (${(performance.now() - startTime).toFixed(2)}ms)`);
      return cachedResult;
    }
    
    let detectedLanguage: string | null = null;
    
    // 1. Check for shebang line (highest priority)
    const shebangStart = performance.now();
    const shebangLanguage = detectFromShebang(content);
    if (shebangLanguage) {
      detectedLanguage = shebangLanguage;
      console.debug(`Language detection: Shebang detection (${(performance.now() - shebangStart).toFixed(2)}ms)`);
    }
    
    // 2. Check file extension (second priority)
    if (!detectedLanguage) {
      const extensionStart = performance.now();
      const extensionLanguage = detectFromExtension(filename);
      if (extensionLanguage && content.trim()) {
        detectedLanguage = extensionLanguage;
        console.debug(`Language detection: Extension detection (${(performance.now() - extensionStart).toFixed(2)}ms)`);
      }
    }
    
    // 3. Analyze content (third priority - slowest)
    if (!detectedLanguage) {
      const contentStart = performance.now();
      const contentLanguage = await detectFromContent(content);
      if (contentLanguage) {
        detectedLanguage = contentLanguage;
        console.debug(`Language detection: Content analysis (${(performance.now() - contentStart).toFixed(2)}ms)`);
      }
    }
    
    // 4. Default to plain text
    const finalLanguage = detectedLanguage || 'text';
    
    // Cache the result
    languageCache.set(cacheKey, finalLanguage);
    maintainCacheSize();
    
    console.debug(`Language detection: Total time for '${filename}': ${(performance.now() - startTime).toFixed(2)}ms -> ${finalLanguage}`);
    return finalLanguage;
    
  } catch (error) {
    console.warn('Language detection failed:', error);
    return 'text';
  }
}

/**
 * Get list of supported language identifiers
 * This includes common programming languages that Shiki supports
 */
export function getSupportedLanguages(): string[] {
  // Return a comprehensive list of languages supported by Shiki
  // This is a static list to avoid async dependencies in components
  return [
    // Web Technologies
    'javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 'scss', 'sass', 'less',
    'json', 'xml', 'yaml', 'toml',
    
    // System Languages
    'c', 'cpp', 'rust', 'go', 'swift', 'kotlin', 'scala',
    
    // Managed Languages
    'java', 'csharp', 'python', 'ruby', 'php', 'perl',
    
    // Shell Scripts
    'bash', 'zsh', 'fish', 'powershell', 'batch',
    
    // Data & Config
    'sql', 'graphql', 'dockerfile', 'ini', 'ignore',
    
    // Documentation
    'markdown', 'latex',
    
    // Specialized
    'r', 'matlab', 'lua', 'vim', 'diff',
    
    // Fallback
    'text'
  ];
}

/**
 * Cleanup function to dispose of language detection resources
 * Should be called when the application exits
 */
export function cleanup(): void {
  languageDetector = null;
}