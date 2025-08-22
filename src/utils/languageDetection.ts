// Import the language detection library
import pkg from '@vscode/vscode-languagedetection';
// Handle both ESM and CommonJS environments
let ModelOperations: any;
if (pkg && typeof pkg === 'object' && 'ModelOperations' in pkg) {
  ModelOperations = (pkg as any).ModelOperations;
} else if (pkg && typeof pkg === 'function') {
  ModelOperations = pkg;
} else {
  // Fallback - try to find ModelOperations in the package
  ModelOperations = (pkg as any)?.default?.ModelOperations || (pkg as any)?.ModelOperations || pkg;
}
import { extname } from 'path';

// Language detection instance
let languageDetector: InstanceType<typeof ModelOperations> | null = null;

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
 * Detect programming language from filename and content
 * Priority: Shebang > File Extension > Content Analysis > Plain Text
 * 
 * @param filename The name of the file (including extension)
 * @param content The content of the file
 * @returns Promise resolving to the detected language identifier
 */
export async function detectLanguage(filename: string, content: string): Promise<string> {
  try {
    // 1. Check for shebang line (highest priority)
    const shebangLanguage = detectFromShebang(content);
    if (shebangLanguage) {
      return shebangLanguage;
    }
    
    // 2. Check file extension (second priority)
    // But only if the content has meaningful non-whitespace content
    const extensionLanguage = detectFromExtension(filename);
    if (extensionLanguage && content.trim()) {
      return extensionLanguage;
    }
    
    // 3. Analyze content (third priority)
    const contentLanguage = await detectFromContent(content);
    if (contentLanguage) {
      return contentLanguage;
    }
    
    // 4. Default to plain text
    return 'text';
    
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