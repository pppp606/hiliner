import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { detectLanguage } from '../utils/languageDetection.js';
import { highlightCode, initializeHighlighter, cleanup } from '../utils/syntaxHighlighter.js';

export interface UseSyntaxHighlightingOptions {
  /** Whether syntax highlighting is enabled (default: true) */
  enabled?: boolean;
  /** Theme to use for syntax highlighting (default: 'dark-plus') */
  theme?: string;
  /** Maximum number of lines to process at once for performance (default: 1000) */
  batchSize?: number;
  /** Whether to enable caching of highlighted content (default: true) */
  enableCaching?: boolean;
}

export interface UseSyntaxHighlightingResult {
  /** Whether syntax highlighting is currently enabled */
  enabled: boolean;
  /** Currently detected language */
  detectedLanguage: string | null;
  /** Current theme being used */
  theme: string;
  /** Whether highlighting is currently in progress */
  isHighlighting: boolean;
  /** Highlight an array of lines and return highlighted content */
  highlightLines: (lines: string[], filePath?: string, startLineNumber?: number) => Promise<string[]>;
  /** Pre-highlight lines for smoother scrolling (fire-and-forget) */
  preHighlightLines: (lines: string[], filePath?: string, startLineNumber?: number) => void;
  /** Detect language for given content */
  detectLanguageFromContent: (filePath: string, content: string) => Promise<string>;
  /** Toggle syntax highlighting on/off */
  toggleHighlighting: () => void;
  /** Change the current theme */
  setTheme: (theme: string) => void;
  /** Clear any cached highlighting data */
  clearCache: () => void;
}

/**
 * Hook for managing syntax highlighting functionality
 * Handles language detection, highlighting, caching, and theme management
 */
export function useSyntaxHighlighting(options?: UseSyntaxHighlightingOptions): UseSyntaxHighlightingResult {
  const {
    enabled: initialEnabled = true,
    theme: initialTheme = 'dark-plus',
    batchSize = 1000,
    enableCaching = true,
  } = options || {};

  // State management
  const [enabled, setEnabled] = useState(initialEnabled);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [theme, setThemeState] = useState(initialTheme);
  const [isHighlighting, setIsHighlighting] = useState(false);
  
  // Cache for highlighted content to avoid re-processing with size tracking
  const highlightCache = useRef<Map<string, string[]>>(new Map());
  const cacheSize = useRef<number>(0); // Track cache size in bytes
  const maxCacheSize = useRef<number>(50 * 1024 * 1024); // 50MB limit
  const currentOperationRef = useRef<number>(0);

  // Initialize highlighter on theme or enabled state change
  const initializeOnChange = useCallback(async () => {
    if (enabled) {
      try {
        await initializeHighlighter(theme);
      } catch (error) {
        console.warn('Failed to initialize syntax highlighter:', error);
      }
    }
  }, [enabled, theme]);

  // Effect to initialize highlighter when needed
  useEffect(() => {
    initializeOnChange();
  }, [initializeOnChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Generate cache key for content - keeping for future use
  // const generateCacheKey = useCallback((lines: string[], language: string, currentTheme: string): string => {
  //   const contentHash = lines.join('\n').substring(0, 100); // Use first 100 chars as hash
  //   return `${language}:${currentTheme}:${lines.length}:${contentHash.length}`;
  // }, []);

  // Detect language from content
  const detectLanguageFromContent = useCallback(async (filePath: string, content: string): Promise<string> => {
    try {
      const language = await detectLanguage(filePath, content);
      setDetectedLanguage(language);
      return language;
    } catch (error) {
      console.warn('Language detection failed:', error);
      const fallbackLanguage = 'text';
      setDetectedLanguage(fallbackLanguage);
      return fallbackLanguage;
    }
  }, []);

  // Highlight lines with aggressive caching and pre-rendering for smooth scrolling
  const highlightLines = useCallback(async (lines: string[], filePath?: string, startLineNumber = 1): Promise<string[]> => {
    if (!enabled || !lines.length) {
      return lines; // Return original lines if highlighting disabled or no content
    }

    // Increment operation counter to handle concurrent operations
    const operationId = ++currentOperationRef.current;
    setIsHighlighting(true);

    try {
      // Detect language if we don't have one or if filePath changed
      let language = detectedLanguage;
      if (!language && filePath) {
        language = await detectLanguageFromContent(filePath, lines.join('\n'));
        
        // Check if operation was cancelled
        if (operationId !== currentOperationRef.current) {
          return lines;
        }
      }

      // Use detected language or fallback to text
      const finalLanguage = language || 'text';

      // Generate viewport-aware cache key
      const cacheKey = enableCaching ? generateViewportCacheKey(lines, finalLanguage, theme, startLineNumber) : '';
      
      // Check cache first for immediate return (synchronous)
      if (enableCaching && cacheKey) {
        const cached = highlightCache.current.get(cacheKey);
        if (cached) {
          // Reset highlighting state immediately since we have cached result
          setIsHighlighting(false);
          return cached;
        }
      }

      // If language is 'text', return original lines without highlighting
      if (finalLanguage === 'text') {
        return lines;
      }

      // For viewport processing, highlight all lines as a single batch for consistency
      const content = lines.join('\n');
      
      try {
        // Check if operation was cancelled before expensive operation
        if (operationId !== currentOperationRef.current) {
          return lines;
        }

        // Highlight the entire viewport content
        const highlightedContent = await highlightCode(content, finalLanguage, theme);
        const highlightedLines = highlightedContent.split('\n');
        
        // Ensure we got the same number of lines back
        if (highlightedLines.length === lines.length) {
          // Cache the result if enabled with size management
          if (enableCaching && cacheKey && operationId === currentOperationRef.current) {
            const entrySize = estimateCacheEntrySize(highlightedLines);
            
            // Ensure we don't exceed cache size limit
            while (cacheSize.current + entrySize > maxCacheSize.current && highlightCache.current.size > 0) {
              const firstKey = highlightCache.current.keys().next().value;
              if (firstKey) {
                const oldEntry = highlightCache.current.get(firstKey);
                if (oldEntry) {
                  cacheSize.current -= estimateCacheEntrySize(oldEntry);
                }
                highlightCache.current.delete(firstKey);
              }
            }
            
            // Add new entry to cache
            highlightCache.current.set(cacheKey, highlightedLines);
            cacheSize.current += entrySize;
          }
          
          return highlightedLines;
        } else {
          // Fallback to original lines if line count mismatch
          return lines;
        }
      } catch (error) {
        console.warn('Failed to highlight viewport content:', error);
        return lines;
      }

    } catch (error) {
      console.warn('Syntax highlighting failed:', error);
      return lines; // Return original lines on error
    } finally {
      // Only clear highlighting state if this operation is still current
      if (operationId === currentOperationRef.current) {
        setIsHighlighting(false);
      }
    }
  }, [enabled, detectedLanguage, theme, batchSize, enableCaching, detectLanguageFromContent]);

  // Generate stable viewport-aware cache key for better cache efficiency
  const generateViewportCacheKey = useCallback((lines: string[], language: string, currentTheme: string, startLineNumber: number): string => {
    // Create a more stable hash based on content
    const content = lines.join('\n');
    const contentHash = content.length > 100 ? 
      content.substring(0, 50) + content.substring(content.length - 50) :
      content;
    
    // Use a hash of the content rather than just length
    let hash = 0;
    for (let i = 0; i < contentHash.length; i++) {
      const char = contentHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `viewport:${language}:${currentTheme}:${startLineNumber}:${lines.length}:${Math.abs(hash)}`;
  }, []);

  // Estimate cache entry size in bytes
  const estimateCacheEntrySize = useCallback((lines: string[]): number => {
    // Estimate size as sum of string lengths * 2 (for Unicode) + overhead
    const contentSize = lines.reduce((total, line) => total + (line.length * 2), 0);
    return contentSize + 100; // Add overhead for array structure
  }, []);

  // Toggle highlighting on/off
  const toggleHighlighting = useCallback(() => {
    setEnabled(prev => !prev);
    // Clear cache when toggling to ensure fresh start
    highlightCache.current.clear();
    cacheSize.current = 0;
  }, []);

  // Change theme
  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme);
    // Clear cache when theme changes since colors will be different
    highlightCache.current.clear();
    cacheSize.current = 0;
  }, []);

  // Pre-highlight lines in background for smoother scrolling
  const preHighlightLines = useCallback((lines: string[], filePath?: string, startLineNumber = 1): void => {
    if (!enabled || !lines.length) return;

    // Fire-and-forget background highlighting with minimal delay
    setTimeout(async () => {
      try {
        // Use detected language or try to detect it
        let language = detectedLanguage;
        if (!language && filePath) {
          language = await detectLanguageFromContent(filePath, lines.join('\n'));
        }

        const finalLanguage = language || 'text';
        if (finalLanguage === 'text') return;

        const cacheKey = enableCaching ? generateViewportCacheKey(lines, finalLanguage, theme, startLineNumber) : '';
        
        // Only proceed if not already cached
        if (enableCaching && cacheKey && !highlightCache.current.has(cacheKey)) {
          const content = lines.join('\n');
          const highlightedContent = await highlightCode(content, finalLanguage, theme);
          const highlightedLines = highlightedContent.split('\n');
          
          if (highlightedLines.length === lines.length) {
            const entrySize = estimateCacheEntrySize(highlightedLines);
            
            // Ensure cache size limit
            while (cacheSize.current + entrySize > maxCacheSize.current && highlightCache.current.size > 0) {
              const firstKey = highlightCache.current.keys().next().value;
              if (firstKey) {
                const oldEntry = highlightCache.current.get(firstKey);
                if (oldEntry) {
                  cacheSize.current -= estimateCacheEntrySize(oldEntry);
                }
                highlightCache.current.delete(firstKey);
              }
            }
            
            highlightCache.current.set(cacheKey, highlightedLines);
            cacheSize.current += entrySize;
          }
        }
      } catch (error) {
        // Silently ignore pre-highlighting errors
      }
    }, 0);
  }, [enabled, detectedLanguage, theme, enableCaching, generateViewportCacheKey, detectLanguageFromContent, highlightCode, estimateCacheEntrySize, maxCacheSize]);

  // Clear cache and reset size tracking
  const clearCache = useCallback(() => {
    highlightCache.current.clear();
    cacheSize.current = 0;
  }, []);

  // Memoized result to prevent unnecessary re-renders
  const result = useMemo(() => ({
    enabled,
    detectedLanguage,
    theme,
    isHighlighting,
    highlightLines,
    preHighlightLines,
    detectLanguageFromContent,
    toggleHighlighting,
    setTheme,
    clearCache,
  }), [
    enabled,
    detectedLanguage,
    theme,
    isHighlighting,
    highlightLines,
    preHighlightLines,
    detectLanguageFromContent,
    toggleHighlighting,
    setTheme,
    clearCache,
  ]);

  return result;
}