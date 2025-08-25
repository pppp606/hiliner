import React, { memo, useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { appendFileSync } from 'fs';
import type { FileContentProps } from '../types.js';
import { chalkColors, getChalkColor } from '../utils/colors.js';
import { useSyntaxHighlighting } from '../hooks/useSyntaxHighlighting.js';
import { getThemeColors, type ThemeColors } from '../utils/syntaxHighlighter.js';

interface LineNumberProps {
  lineNumber: number;
  width: number;
  isCurrentLine: boolean;
  lineNumberColor?: string;
  isHighlightingInProgress?: boolean;
  hasHighlightedLines?: boolean;
}

interface LineContentProps {
  content: string;
  isLightTheme: boolean;
  originalLineLength: number;
}

// Helper function to calculate visual length of text with ANSI escape codes
function getVisualLength(text: string): number {
  // Remove ANSI escape sequences to get the visual content
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  return text.replace(ansiRegex, '').length;
}

interface OptimizedFileDisplayProps {
  lines: string[];
  startLineNumber: number;
  highlightIndex: number | null;
  lineNumberWidth: number;
  showLineNumbers: boolean;
  horizontalOffset: number;
  maxWidth?: number;
  selectedLines?: Set<number>;
  highlightedLines?: string[];
  enableSyntaxHighlighting?: boolean;
  isHighlightingInProgress?: boolean;
}

const LineNumber = memo(({ lineNumber, width, isCurrentLine, lineNumberColor, isHighlightingInProgress, hasHighlightedLines }: LineNumberProps) => {
  const lineNumberStr = lineNumber.toString().padStart(width, ' ');
  
  let cursorIndicator = ' ';
  if (isCurrentLine) {
    cursorIndicator = (isHighlightingInProgress && !hasHighlightedLines) ? '⟳' : '▶';
  }
  
  return (
    <Box width={width + 2} flexShrink={0}>
      <Text>{cursorIndicator}</Text>
      {lineNumberColor ? (
        <Text color={lineNumberColor}>{lineNumberStr}</Text>
      ) : (
        <Text>{lineNumberStr}</Text>
      )}
      <Text> </Text>
    </Box>
  );
});

const LineContent = memo(({ content, isLightTheme, originalLineLength }: LineContentProps) => {
  if (isLightTheme) {
    const terminalWidth = (process.stdout.columns || 80);
    const lineNumberWidth = 5;
    const availableWidth = terminalWidth - lineNumberWidth;
    // Use visual length instead of original length to account for ANSI codes
    const visualLength = getVisualLength(content || '');
    const paddingNeeded = Math.max(0, availableWidth - visualLength);
    const padding = ' '.repeat(paddingNeeded);
    
    return (
      <Box flexGrow={1}>
        <Text>{`${content || ' '}\x1b[47m${padding}\x1b[0m`}</Text>
      </Box>
    );
  }
  
  return (
    <Box flexGrow={1}>
      <Text>{content}</Text>
    </Box>
  );
});

// Single component with minimal re-rendering
// Maintains performance by rendering all content as a single text block
const OptimizedFileDisplay = memo(({
  lines,
  startLineNumber,
  highlightIndex,
  lineNumberWidth,
  showLineNumbers,
  horizontalOffset,
  maxWidth,
  selectedLines,
  highlightedLines,
  enableSyntaxHighlighting,
  isHighlightingInProgress,
  theme,
  themeColors,
  hexToAnsiColor,
  getThemeChalkColor
}: OptimizedFileDisplayProps & { 
  theme?: string;
  themeColors?: ThemeColors | null;
  hexToAnsiColor?: (hex: string, maintainBackground?: boolean) => string;
  getThemeChalkColor?: (colorType: 'lineNumber' | 'lineNumberActive') => ((text: string) => string) | null;
}) => {
  // Render each line separately to avoid wrapping issues
  const renderedLines = lines.map((line, index) => {
    const actualLineNumber = startLineNumber + index;
    const isCurrentLine = highlightIndex === index + 1;
    
    // Use highlighted line if syntax highlighting is enabled and available
    let displayLine = '';
    if (enableSyntaxHighlighting && 
        highlightedLines && 
        highlightedLines.length === lines.length && 
        highlightedLines[index]) {
      displayLine = highlightedLines[index];
    } else {
      displayLine = line || '';
    }
    
    // Apply horizontal offset (if needed)
    if (horizontalOffset > 0) {
      displayLine = displayLine.slice(horizontalOffset);
    }
    
    // Apply max width if specified
    if (maxWidth && displayLine.length > maxWidth) {
      displayLine = displayLine.slice(0, maxWidth - 3) + '...';
    }
    
    // Apply background color for light themes to content
    const lightThemes = ['github-light', 'light-plus', 'quiet-light', 'solarized-light'];
    const isLightTheme = theme && lightThemes.includes(theme);
    
    if (isLightTheme) {
      // Always apply background for light themes, even for empty lines
      if (displayLine) {
        // Replace all reset codes with background-preserving codes
        displayLine = displayLine.replace(/\x1b\[0m/g, '\x1b[47m\x1b[30m');
        // Ensure content starts with background
        if (!displayLine.startsWith('\x1b[47m')) {
          displayLine = `\x1b[47m\x1b[30m${displayLine}`;
        }
      } else {
        // For empty lines, set background
        displayLine = '\x1b[47m\x1b[30m';
      }
    }
    
    if (showLineNumbers) {
      const lineNumberStr = actualLineNumber.toString().padStart(lineNumberWidth, ' ');
      
      // Determine visual styling based on selection and cursor state
      const isSelected = selectedLines?.has(actualLineNumber) || false;
      
      
      // Apply color to line number based on theme and selection state
      // For interactive mode, use Ink's color prop instead of ANSI codes
      const getLineNumberColor = () => {
        if (isSelected) {
          return "#99DDFF"; // Selection color
        } else if (themeColors) {
          return themeColors.lineNumber;
        }
        return undefined; // Default color
      };
      
      const lineNumberColor = getLineNumberColor();
      
      
      return (
        <Box key={`line-${actualLineNumber}`} flexDirection="row">
          <LineNumber 
            lineNumber={actualLineNumber}
            width={lineNumberWidth}
            isCurrentLine={isCurrentLine}
            lineNumberColor={lineNumberColor}
            isHighlightingInProgress={isHighlightingInProgress}
            hasHighlightedLines={!!highlightedLines?.length}
          />
          <LineContent 
            content={displayLine}
            isLightTheme={isLightTheme || false}
            originalLineLength={line.length}
          />
        </Box>
      );
    } else {
      // For lines without line numbers
      return (
        <Box key={`line-${actualLineNumber}`} flexDirection="row">
          <LineContent 
            content={displayLine}
            isLightTheme={isLightTheme || false}
            originalLineLength={line.length}
          />
        </Box>
      );
    }
  });

  return (
    <Box width="100%" flexDirection="column">
      {renderedLines}
    </Box>
  );
});


function FileContentComponent({
  lines,
  showLineNumbers = true,
  startLineNumber = 1,
  scrollOffset = 0,
  viewportHeight,
  highlightLine,
  selectedLines,
  maxWidth,
  horizontalOffset = 0,
  enableSyntaxHighlighting = true,
  language,
  theme = 'dark-plus',
}: FileContentProps): React.ReactElement {
  // Initialize syntax highlighting hook
  const syntaxHighlighting = useSyntaxHighlighting({
    enabled: enableSyntaxHighlighting,
    theme: theme || 'dark-plus',
  });

  // State for highlighted lines and highlighting progress
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);
  const [isHighlightingInProgress, setIsHighlightingInProgress] = useState<boolean>(false);
  const [themeColors, setThemeColors] = useState<ThemeColors | null>(null);
  
  // Track if this is the initial load to avoid debouncing
  const isInitialLoad = useRef(true);

  // Helper function to get chalk color from theme
  const getThemeChalkColor = (colorType: 'lineNumber' | 'lineNumberActive'): ((text: string) => string) | null => {
    if (!themeColors) return null;
    const color = themeColors[colorType];
    if (!color) return null;
    return getChalkColor(color);
  };

  // Helper function to convert hex color to ANSI color code
  const hexToAnsiColor = (hexColor: string, maintainBackground: boolean = false): string => {
    if (!hexColor.startsWith('#')) return '';
    
    const hex = hexColor.slice(1);
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Use True Color if available
    if (process.env.COLORTERM === 'truecolor' || process.env.TERM?.includes('color')) {
      if (maintainBackground) {
        return `\x1b[38;2;${r};${g};${b};47m`;
      } else {
        return `\x1b[38;2;${r};${g};${b}m`;
      }
    } else {
      // Fallback to 256-color
      const r6 = Math.round(r / 255 * 5);
      const g6 = Math.round(g / 255 * 5);
      const b6 = Math.round(b / 255 * 5);
      const color256 = 16 + 36 * r6 + 6 * g6 + b6;
      
      if (maintainBackground) {
        return `\x1b[38;5;${color256};47m`;
      } else {
        return `\x1b[38;5;${color256}m`;
      }
    }
  };

  // Effect to load theme colors
  useEffect(() => {
    if (theme) {
      getThemeColors(theme).then(colors => {
        setThemeColors(colors);
      }).catch(error => {
        console.warn('Failed to load theme colors:', error);
        setThemeColors(null);
      });
    }
  }, [theme]);

  // Effect to highlight visible lines with progressive display
  useEffect(() => {
    if (!enableSyntaxHighlighting || !lines || !Array.isArray(lines) || lines.length === 0) {
      setHighlightedLines([]);
      setIsHighlightingInProgress(false);
      return;
    }

    // Use a flag to prevent race conditions
    let isCurrentRequest = true;

    const performHighlighting = async () => {
      if (!isCurrentRequest) return;
      
      // Set highlighting in progress immediately
      setIsHighlightingInProgress(true);
      
      // Clear highlighted lines to show plain text first (progressive display)
      setHighlightedLines([]);
      
      try {
        // Try to get highlighted content (may be from cache)
        const highlighted = await syntaxHighlighting.highlightLines(
          lines,
          // Generate a pseudo file path for language detection if language is not provided
          language ? `file.${getFileExtensionForLanguage(language)}` : undefined,
          startLineNumber // Pass start line number for viewport-aware caching
        );
        
        // Only update if this is still the current request
        if (isCurrentRequest) {
          setHighlightedLines(highlighted);
          setIsHighlightingInProgress(false);
        }
      } catch (error) {
        console.warn('Failed to highlight lines:', error);
        if (isCurrentRequest) {
          setHighlightedLines(lines); // Fallback to original lines
          setIsHighlightingInProgress(false);
        }
      }
    };

    // Execute highlighting with progressive display
    performHighlighting();

    // Pre-highlight adjacent areas for smoother scrolling
    const preHighlightAdjacent = () => {
      if (!language) return;
      
      // Pre-highlight above and below current viewport
      const lineCount = 100; // Increased buffer size for better scroll performance
      const filePath = language ? `file.${getFileExtensionForLanguage(language)}` : undefined;
      
      // Above current viewport
      if (startLineNumber > lineCount) {
        const aboveLines = lines; // Approximate - in real usage we'd need access to full file content
        syntaxHighlighting.preHighlightLines(aboveLines, filePath, startLineNumber - lineCount);
      }
      
      // Below current viewport
      const belowLines = lines; // Approximate - in real usage we'd need access to full file content  
      syntaxHighlighting.preHighlightLines(belowLines, filePath, startLineNumber + lines.length);
    };

    // Schedule pre-highlighting for next tick
    setTimeout(preHighlightAdjacent, 0);

    // Cleanup function to cancel this request if lines change again
    return () => {
      isCurrentRequest = false;
    };
  }, [lines, enableSyntaxHighlighting, language, theme, startLineNumber, syntaxHighlighting]);

  // Helper function to map language to file extension for detection
  const getFileExtensionForLanguage = (lang: string): string => {
    const extensionMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      html: 'html',
      css: 'css',
      json: 'json',
      xml: 'xml',
      yaml: 'yml',
      markdown: 'md',
      bash: 'sh',
      powershell: 'ps1',
    };
    return extensionMap[lang] || 'txt';
  };
  
  // Handle null/undefined lines
  if (!lines || !Array.isArray(lines)) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text>No content to display</Text>
      </Box>
    );
  }

  // Handle empty lines array
  if (lines.length === 0) {
    return (
      <Box flexGrow={1} justifyContent="center" alignItems="center">
        <Text>No content available</Text>
      </Box>
    );
  }

  // lines are already the visible lines from FileViewer, use them directly
  const visibleLines = lines;

  // Calculate line number width for consistent formatting
  const maxLineNumber = startLineNumber + visibleLines.length - 1;
  const lineNumberWidth = Math.max(3, maxLineNumber.toString().length + 1);

  // Use the optimized single-component approach
  return (
    <Box flexGrow={1} width="100%" flexDirection="column">
      <OptimizedFileDisplay 
        lines={visibleLines}
        startLineNumber={startLineNumber}
        highlightIndex={highlightLine || null}
        lineNumberWidth={lineNumberWidth}
        showLineNumbers={showLineNumbers}
        horizontalOffset={horizontalOffset}
        maxWidth={maxWidth}
        selectedLines={selectedLines}
        highlightedLines={highlightedLines}
        enableSyntaxHighlighting={enableSyntaxHighlighting}
        isHighlightingInProgress={isHighlightingInProgress}
        theme={theme}
        themeColors={themeColors}
        hexToAnsiColor={hexToAnsiColor}
        getThemeChalkColor={getThemeChalkColor}
      />
    </Box>
  );
}

export const FileContent = memo(FileContentComponent);