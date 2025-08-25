import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render } from 'ink-testing-library';
import { StatusBar } from '../StatusBar.js';

describe('StatusBar Theme Display', () => {
  it('should display current theme with (current) marker', () => {
    const { lastFrame } = render(
      <StatusBar
        fileName="test.js"
        currentLine={1}
        totalLines={10}
        detectedLanguage="javascript"
        syntaxHighlightingEnabled={true}
        syntaxTheme="dark-plus"
      />
    );

    expect(lastFrame()).toContain('dark-plus (current)');
  });

  it('should display theme without (current) marker when not specified', () => {
    const { lastFrame } = render(
      <StatusBar
        fileName="test.js"
        currentLine={1}
        totalLines={10}
        detectedLanguage="javascript"
        syntaxHighlightingEnabled={true}
        // syntaxTheme not specified
      />
    );

    // Should not contain any theme information or (current) marker
    expect(lastFrame()).not.toContain('(current)');
    expect(lastFrame()).not.toContain('dark-plus');
  });

  it('should handle different theme names correctly', () => {
    const themes = ['monokai', 'dracula', 'github-dark', 'one-dark-pro'];
    
    themes.forEach(theme => {
      const { lastFrame } = render(
        <StatusBar
          fileName="test.py"
          currentLine={5}
          totalLines={20}
          detectedLanguage="python"
          syntaxHighlightingEnabled={true}
          syntaxTheme={theme}
        />
      );

      expect(lastFrame()).toContain(`${theme} (current)`);
    });
  });

  it('should not display theme when syntax highlighting is disabled', () => {
    const { lastFrame } = render(
      <StatusBar
        fileName="test.js"
        currentLine={1}
        totalLines={10}
        detectedLanguage="javascript"
        syntaxHighlightingEnabled={false}
        syntaxTheme="dark-plus"
      />
    );

    // Theme should not be shown when highlighting is disabled
    expect(lastFrame()).not.toContain('dark-plus (current)');
    expect(lastFrame()).toContain('JAVASCRIPT (no highlight)');
  });

  it('should handle theme display alongside other status elements', () => {
    const { lastFrame } = render(
      <StatusBar
        fileName="example.ts"
        currentLine={25}
        totalLines={100}
        detectedLanguage="typescript"
        syntaxHighlightingEnabled={true}
        syntaxTheme="monokai"
        selectionCount={3}
        encoding="utf-8"
      />
    );

    const output = lastFrame();
    
    // Should contain all elements
    expect(output).toContain('example.ts');
    expect(output).toContain('TYPESCRIPT');
    expect(output).toContain('monokai (current)');
    expect(output).toContain('3 selected');
    expect(output).toContain('25/100');
  });

  it('should format theme display consistently', () => {
    const { lastFrame } = render(
      <StatusBar
        fileName="script.py"
        currentLine={1}
        totalLines={50}
        detectedLanguage="python"
        syntaxHighlightingEnabled={true}
        syntaxTheme="github-light"
      />
    );

    const output = lastFrame();
    
    // Should use consistent formatting
    expect(output).toMatch(/github-light \(current\)/);
    
    // Should be properly separated from other elements
    const themeMatch = output?.match(/PYTHON.*github-light \(current\)/);
    expect(themeMatch).toBeTruthy();
  });

  it('should handle very long theme names gracefully', () => {
    // Test with a hypothetically long theme name
    const longTheme = 'very-long-theme-name-that-might-cause-issues';
    
    const { lastFrame } = render(
      <StatusBar
        fileName="test.js"
        currentLine={1}
        totalLines={10}
        detectedLanguage="javascript"
        syntaxHighlightingEnabled={true}
        syntaxTheme={longTheme}
      />
    );

    expect(lastFrame()).toContain(`${longTheme} (current)`);
  });

  it('should display theme in status section correctly', () => {
    const { lastFrame } = render(
      <StatusBar
        fileName="config.json"
        currentLine={15}
        totalLines={30}
        detectedLanguage="json"
        syntaxHighlightingEnabled={true}
        syntaxTheme="dracula"
      />
    );

    const output = lastFrame();
    
    // Theme should appear in the main status section, not position section
    expect(output).toContain('JSON');
    expect(output).toContain('dracula (current)');
    expect(output).toContain('15/30');
    
    // Verify proper sections: file info | status | position
    const sections = output?.split(/(?=\d+%|\d+\/\d+|Top|Bot)/);
    expect(sections?.length).toBeGreaterThan(1);
  });
});