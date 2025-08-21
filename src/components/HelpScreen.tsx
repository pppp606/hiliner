import React from 'react';
import { Box, Text, useInput, type Key } from 'ink';

interface Shortcut {
  key: string;
  description: string;
}

interface HelpScreenProps {
  isVisible: boolean;
  onClose?: () => void;
  onKeyPress?: (key: string, event: any) => void;
  title?: string;
  version?: string;
  showSearchHelp?: boolean;
  showNavigation?: boolean;
  showApplicationControls?: boolean;
  customShortcuts?: Shortcut[];
  additionalContent?: string[];
  closeOnAnyKey?: boolean;
  propagateKeys?: string[];
  maxWidth?: number;
  maxHeight?: number;
  theme?: string;
  borderStyle?: string;
  config?: any;
  hasFocus?: boolean;
}

export function HelpScreen({
  isVisible,
  onClose,
  onKeyPress,
  title = 'Hiliner',
  version = '0.1.0',
  showSearchHelp = false,
  showNavigation = true,
  showApplicationControls = true,
  customShortcuts = [],
  additionalContent = [],
  closeOnAnyKey = false,
  propagateKeys = [],
  maxWidth = 80,
  maxHeight = 25,
  theme = 'default',
  borderStyle = 'single',
  config,
  hasFocus = true
}: HelpScreenProps): React.ReactElement | null {

  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

  // Handle keyboard input
  useInput((input: string, key: Key) => {
    // Call onKeyPress if provided
    if (onKeyPress) {
      onKeyPress(input, key);
    }

    // Handle propagated keys
    if (propagateKeys.includes(input) || propagateKeys.includes(key.tab ? 'Tab' : '')) {
      // Allow these keys to propagate
      return;
    }

    // Close help screen
    if (key.escape || input === '?' || input === 'h' || input === 'q') {
      if (onClose) {
        onClose();
      }
      return;
    }

    // Close on any key if configured
    if (closeOnAnyKey && onClose) {
      onClose();
      return;
    }
  }, { isActive: hasFocus && isVisible });

  // Build shortcuts sections
  const buildShortcutsContent = () => {
    const sections = [];

    // Navigation section
    if (showNavigation) {
      sections.push({
        title: 'Navigation',
        shortcuts: [
          { key: '↑/↓', description: 'Move up/down one line' },
          { key: '←/→', description: 'Scroll horizontally' },
          { key: 'Space', description: 'Page down' },
          { key: 'b', description: 'Page up' },
          { key: 'gg', description: 'Go to start' },
          { key: 'G', description: 'Go to end' }
        ]
      });
    }

    // Search section
    if (showSearchHelp) {
      sections.push({
        title: 'Search',
        shortcuts: [
          { key: '/', description: 'Start search' },
          { key: 'n', description: 'Next match' },
          { key: 'N', description: 'Previous match' },
          { key: 'Escape', description: 'Clear search' }
        ]
      });
    }

    // Application controls
    if (showApplicationControls) {
      sections.push({
        title: 'Application',
        shortcuts: [
          { key: '?', description: 'Toggle help' },
          { key: 'q', description: 'Quit' },
          { key: 'Escape', description: 'Close help' }
        ]
      });
    }

    // Custom shortcuts
    if (customShortcuts && customShortcuts.length > 0) {
      const validShortcuts = customShortcuts.filter(
        s => s && typeof s === 'object' && s.key && s.description
      );
      if (validShortcuts.length > 0) {
        sections.push({
          title: 'Additional',
          shortcuts: validShortcuts
        });
      }
    }

    return sections;
  };

  const shortcutSections = buildShortcutsContent();

  // Calculate content dimensions
  const contentWidth = Math.min(maxWidth - 4, 76); // Account for borders and padding
  const contentHeight = Math.min(maxHeight - 4, 21); // Account for borders and padding

  // Build help content
  const renderContent = () => {
    const content = [];
    let lineCount = 0;

    // Title and version
    content.push(
      <Box key="title" justifyContent="center" marginBottom={1}>
        <Text bold color="blue">{title} v{version}</Text>
      </Box>
    );
    lineCount += 2;

    // Shortcuts sections
    shortcutSections.forEach((section, sectionIndex) => {
      if (lineCount >= contentHeight - 2) return; // Leave space for closing instructions
      
      content.push(
        <Box key={`section-${sectionIndex}`} marginBottom={1}>
          <Text bold color="yellow">{section.title}:</Text>
        </Box>
      );
      lineCount += 2;

      section.shortcuts.forEach((shortcut, shortcutIndex) => {
        if (lineCount >= contentHeight - 2) return;
        
        content.push(
          <Box key={`shortcut-${sectionIndex}-${shortcutIndex}`} marginLeft={2}>
            <Text color="cyan" bold>{shortcut.key.padEnd(10)}</Text>
            <Text>{shortcut.description}</Text>
          </Box>
        );
        lineCount += 1;
      });
    });

    // Additional content
    if (additionalContent && additionalContent.length > 0) {
      additionalContent.forEach((line, index) => {
        if (lineCount >= contentHeight - 2) return;
        
        content.push(
          <Box key={`additional-${index}`}>
            <Text>{line}</Text>
          </Box>
        );
        lineCount += 1;
      });
    }

    // Closing instruction
    if (lineCount < contentHeight - 1) {
      content.push(
        <Box key="close" justifyContent="center" marginTop={1}>
          <Text color="dim">Press Escape or ? to close help</Text>
        </Box>
      );
    }

    return content;
  };

  // Handle very small terminals
  if (maxWidth < 20 || maxHeight < 10) {
    return (
      <Box 
        width={Math.min(20, maxWidth)}
        height={Math.min(10, maxHeight)}
        borderStyle={borderStyle as any}
        borderColor="blue"
        paddingX={1}
        paddingY={1}
        justifyContent="center"
        alignItems="center"
      >
        <Box flexDirection="column" alignItems="center">
          <Text bold>Help</Text>
          <Text color="cyan">q</Text>
          <Text>Quit</Text>
          <Text color="cyan">?</Text>
          <Text>Help</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      width={contentWidth + 4}
      height={contentHeight + 4}
      borderStyle={borderStyle as any}
      borderColor="blue"
      paddingX={1}
      paddingY={1}
      justifyContent="center"
      alignItems="center"
    >
      <Box flexDirection="column" width={contentWidth}>
        {renderContent()}
      </Box>
    </Box>
  );
}