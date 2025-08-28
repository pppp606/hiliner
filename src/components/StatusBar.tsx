import React, { memo } from 'react';
import { Box, Text } from 'ink';
import type { StatusBarProps } from '../types.js';

function StatusBarComponent({
  fileName,
  currentLine,
  totalLines,
  isLoading = false,
  isError = false,
  errorMessage,
  isBinary = false,
  selectionCount = 0,
  detectedLanguage,
  syntaxHighlightingEnabled = false,
  syntaxTheme,
  encoding,
  theme,
  message,
  messageType,
}: StatusBarProps): React.ReactElement {

  // Build position information
  const buildPositionInfo = () => {
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
  };

  // Build status message
  const buildStatus = () => {
    const statusParts = [];
    
    // Priority message from Action System
    if (message) {
      const messagePrefix = messageType === 'error' ? 'Error: ' : 
                           messageType === 'warning' ? 'Warning: ' : 
                           messageType === 'success' ? 'Success: ' : '';
      return `${messagePrefix}${message}`;
    }
    
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
  };

  const positionInfo = buildPositionInfo();
  const statusMessage = buildStatus();

  // Build the status bar content
  const leftContent = ` ${fileName || 'No file'}${statusMessage ? ` | ${statusMessage}` : ''}`;
  const rightContent = positionInfo ? `${positionInfo} ` : '';
  
  return (
    <Box width="100%" flexDirection="row">
      <Text inverse>
        {leftContent}
      </Text>
      <Box flexGrow={1} />
      {rightContent && (
        <Text inverse>
          {rightContent}
        </Text>
      )}
    </Box>
  );
}

export const StatusBar = memo(StatusBarComponent);