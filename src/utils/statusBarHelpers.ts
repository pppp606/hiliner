/**
 * Helper functions for StatusBar component
 * 
 * Extracted logic functions that can be unit tested independently
 * without requiring React/Ink components to be rendered.
 */

import type { StatusBarProps } from '../types.js';

/**
 * Build the status message section of the status bar
 * 
 * Handles loading, error, binary states, and theme display logic.
 * Theme is displayed with "(current)" marker when syntax highlighting is enabled.
 * 
 * @param props StatusBar props containing all relevant state
 * @returns Formatted status string or empty string
 */
export function buildStatusMessage(props: StatusBarProps): string {
  const {
    isLoading = false,
    isError = false,
    errorMessage,
    isBinary = false,
    detectedLanguage,
    syntaxHighlightingEnabled = false,
    syntaxTheme,
    encoding,
    selectionCount = 0
  } = props;

  const statusParts: string[] = [];
  
  if (isLoading) {
    return 'Loading...';
  }
  
  if (isError && errorMessage) {
    return `Error: ${errorMessage}`;
  }
  
  if (isBinary) {
    statusParts.push('[Binary]');
  }
  
  // Add detected language and theme
  if (detectedLanguage && detectedLanguage !== 'text') {
    if (syntaxHighlightingEnabled) {
      const languageDisplay = detectedLanguage.toUpperCase();
      statusParts.push(languageDisplay);
      
      // Add theme with (current) marker when syntax highlighting is enabled
      if (syntaxTheme) {
        statusParts.push(`${syntaxTheme} (current)`);
      }
    } else {
      statusParts.push(`${detectedLanguage.toUpperCase()} (no highlight)`);
    }
  }
  
  // Add encoding if available and different from utf8
  if (encoding && encoding !== 'utf8') {
    statusParts.push(encoding.toUpperCase());
  }
  
  // Add selection count if lines are selected
  if (selectionCount > 0) {
    statusParts.push(`${selectionCount} selected`);
  }
  
  return statusParts.join(' | ');
}

/**
 * Build position information for the status bar
 * 
 * @param currentLine Current line number (1-based)
 * @param totalLines Total number of lines in file
 * @returns Formatted position string or empty string
 */
export function buildPositionInfo(currentLine?: number, totalLines?: number): string {
  if (currentLine !== undefined && totalLines !== undefined && totalLines > 0) {
    const percentage = Math.round((currentLine / totalLines) * 100);
    
    // Special position indicators
    if (currentLine === 1) {
      return `Top  ${currentLine}/${totalLines}`;
    } else if (currentLine === totalLines) {
      return `Bot  ${currentLine}/${totalLines}`;
    } else {
      return `${percentage}%  ${currentLine}/${totalLines}`;
    }
  }
  return '';
}

/**
 * Check if theme should be displayed based on current state
 * 
 * Theme is only displayed when:
 * - Syntax highlighting is enabled
 * - A theme is specified
 * - A language is detected (and not just 'text')
 * 
 * @param props StatusBar props
 * @returns true if theme should be displayed
 */
export function shouldDisplayTheme(props: StatusBarProps): boolean {
  const {
    syntaxHighlightingEnabled = false,
    syntaxTheme,
    detectedLanguage
  } = props;
  
  return (
    syntaxHighlightingEnabled &&
    Boolean(syntaxTheme) &&
    Boolean(detectedLanguage) &&
    detectedLanguage !== 'text'
  );
}

/**
 * Get the formatted theme string with (current) marker
 * 
 * @param theme Theme name
 * @returns Formatted theme string with (current) marker
 */
export function formatThemeDisplay(theme: string): string {
  return `${theme} (current)`;
}