import React, { memo, useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';
import type { FileContentProps } from '../types.js';
import { chalkColors } from '../utils/colors.js';
import { useSyntaxHighlighting } from '../hooks/useSyntaxHighlighting.js';

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
  isHighlightingInProgress
}: OptimizedFileDisplayProps) => {
  // Build the entire display as a single string to minimize DOM updates
  const displayContent = lines.map((line, index) => {
    const actualLineNumber = startLineNumber + index;
    const isCurrentLine = highlightIndex === index + 1;
    
    // Use highlighted line if syntax highlighting is enabled and available
    // Only use highlighted lines if we have the complete set for all visible lines
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
    
    if (showLineNumbers) {
      const lineNumberStr = actualLineNumber.toString().padStart(lineNumberWidth, ' ');
      
      // Determine visual styling based on selection and cursor state
      const isSelected = selectedLines?.has(actualLineNumber) || false;
      
      // Cursor indicator with loading state
      let cursorIndicator = ' ';
      if (isCurrentLine) {
        // Show spinning indicator when highlighting is in progress, arrow otherwise
        cursorIndicator = (isHighlightingInProgress && !highlightedLines?.length) ? '⟳' : '▶';
      }
      
      // Apply color to line number if selected
      const styledLineNumber = isSelected 
        ? chalkColors.selectedLineNumber(lineNumberStr)
        : lineNumberStr;
      
      // Build the complete line
      return `${cursorIndicator}${styledLineNumber} ${displayLine}`;
    } else {
      return displayLine;
    }
  }).join('\n');
  
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
    
    if (showLineNumbers) {
      const lineNumberStr = actualLineNumber.toString().padStart(lineNumberWidth, ' ');
      
      // Determine visual styling based on selection and cursor state
      const isSelected = selectedLines?.has(actualLineNumber) || false;
      
      // Cursor indicator with loading state
      let cursorIndicator = ' ';
      if (isCurrentLine) {
        // Show spinning indicator when highlighting is in progress, arrow otherwise
        cursorIndicator = (isHighlightingInProgress && !highlightedLines?.length) ? '⟳' : '▶';
      }
      
      // Apply color to line number if selected
      const styledLineNumber = isSelected 
        ? chalkColors.selectedLineNumber(lineNumberStr)
        : lineNumberStr;
      
      // Build the complete line with separate components
      return (
        <Box key={`line-${actualLineNumber}`} flexDirection="row">
          <Box width={lineNumberWidth + 2} flexShrink={0}>
            <Text>{cursorIndicator}{styledLineNumber} </Text>
          </Box>
          <Box flexGrow={1}>
            <Text>{displayLine}</Text>
          </Box>
        </Box>
      );
    } else {
      return (
        <Box key={`line-${actualLineNumber}`} flexDirection="row">
          <Text>{displayLine}</Text>
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
  
  // Track if this is the initial load to avoid debouncing
  const isInitialLoad = useRef(true);

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
      />
    </Box>
  );
}

export const FileContent = memo(FileContentComponent);