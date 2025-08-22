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
  highlightLines: (lines: string[], filePath?: string) => Promise<string[]>;
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
  
  // Cache for highlighted content to avoid re-processing
  const highlightCache = useRef<Map<string, string[]>>(new Map());
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

  // Generate cache key for content
  const generateCacheKey = useCallback((lines: string[], language: string, currentTheme: string): string => {
    const contentHash = lines.join('\n').substring(0, 100); // Use first 100 chars as hash
    return `${language}:${currentTheme}:${lines.length}:${contentHash.length}`;
  }, []);

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

  // Highlight lines with caching and batching
  const highlightLines = useCallback(async (lines: string[], filePath?: string): Promise<string[]> => {
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

      // Check cache if enabled
      if (enableCaching) {
        const cacheKey = generateCacheKey(lines, finalLanguage, theme);
        const cached = highlightCache.current.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // If language is 'text', return original lines without highlighting
      if (finalLanguage === 'text') {
        return lines;
      }

      // Process lines in batches for performance
      const highlightedLines: string[] = [];
      
      for (let i = 0; i < lines.length; i += batchSize) {
        // Check if operation was cancelled
        if (operationId !== currentOperationRef.current) {
          return lines;
        }

        const batch = lines.slice(i, i + batchSize);
        const batchContent = batch.join('\n');
        
        try {
          // Highlight the batch
          const highlightedBatch = await highlightCode(batchContent, finalLanguage, theme);
          const highlightedBatchLines = highlightedBatch.split('\n');
          
          // Ensure we got the same number of lines back
          if (highlightedBatchLines.length === batch.length) {
            highlightedLines.push(...highlightedBatchLines);
          } else {
            // Fallback to original batch if line count mismatch
            highlightedLines.push(...batch);
          }
        } catch (error) {
          console.warn(`Failed to highlight batch ${i}-${i + batchSize}:`, error);
          // Fallback to original batch on error
          highlightedLines.push(...batch);
        }
      }

      // Cache the result if enabled
      if (enableCaching && operationId === currentOperationRef.current) {
        const cacheKey = generateCacheKey(lines, finalLanguage, theme);
        highlightCache.current.set(cacheKey, highlightedLines);
        
        // Limit cache size to prevent memory leaks (keep last 50 entries)
        if (highlightCache.current.size > 50) {
          const firstKey = highlightCache.current.keys().next().value;
          if (firstKey) {
            highlightCache.current.delete(firstKey);
          }
        }
      }

      return highlightedLines;

    } catch (error) {
      console.warn('Syntax highlighting failed:', error);
      return lines; // Return original lines on error
    } finally {
      // Only clear highlighting state if this operation is still current
      if (operationId === currentOperationRef.current) {
        setIsHighlighting(false);
      }
    }
  }, [enabled, detectedLanguage, theme, batchSize, enableCaching, detectLanguageFromContent, generateCacheKey]);

  // Toggle highlighting on/off
  const toggleHighlighting = useCallback(() => {
    setEnabled(prev => !prev);
    // Clear cache when toggling to ensure fresh start
    highlightCache.current.clear();
  }, []);

  // Change theme
  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme);
    // Clear cache when theme changes since colors will be different
    highlightCache.current.clear();
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    highlightCache.current.clear();
  }, []);

  // Memoized result to prevent unnecessary re-renders
  const result = useMemo(() => ({
    enabled,
    detectedLanguage,
    theme,
    isHighlighting,
    highlightLines,
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
    detectLanguageFromContent,
    toggleHighlighting,
    setTheme,
    clearCache,
  ]);

  return result;
}