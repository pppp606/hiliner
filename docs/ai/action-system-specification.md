# Hiliner Action System Specification for AI Agents

## Overview

This specification provides complete technical details for AI agents to help users create custom actions for the Hiliner CLI file viewer. The action system allows extending Hiliner with custom keyboard shortcuts that execute shell commands, JavaScript code, or external scripts.

## Core Architecture

```
actions/*.json → ActionRegistry → ActionExecutor → Hiliner UI
     ↓              ↓               ↓              ↓
Configuration   Validation      Execution    Status Updates
```

## Configuration Schema

### JSON Structure
```json
{
  "$schema": "../src/schemas/actionConfig.schema.json",
  "version": "1.0.0",
  "actions": [
    {
      "id": "unique-identifier",
      "name": "Display Name", 
      "description": "Brief description",
      "key": "x",
      "alternativeKeys": ["alt+x"],
      "category": "custom",
      "script": "execution-command",
      "when": { "hasSelection": true }
    }
  ]
}
```

### Field Requirements

#### Required
- **id**: Unique string, regex `^[a-zA-Z0-9_-]+$`
- **name**: Human-readable display name
- **description**: Brief explanation for keymap
- **key**: Primary keyboard shortcut
- **script**: Command/code to execute

#### Optional
- **alternativeKeys**: Additional key bindings
- **category**: Group for organization (`navigation`, `selection`, `file`, `help`, `custom`)
- **when**: Conditional execution (`{"hasSelection": true}`)

## Script Execution Types

### 1. Shell Commands
```json
{"script": "echo \"$SELECTED_TEXT\" | pbcopy && echo \"Copied\""}
```

### 2. Inline JavaScript
```json
{"script": "hiliner.updateStatus(`Lines: ${hiliner.getFileInfo().totalLines}`);"}
```

### 3. External JavaScript Files
```json
{"script": "scripts/javascript/file-analysis.js"}
```

## Environment Variables

Available in all shell commands:

| Variable | Description | Example |
|----------|-------------|---------|
| `$SELECTED_TEXT` | Selected lines content | `"line1\nline2"` |
| `$FILE_PATH` | Current file path | `"/path/to/file.js"` |
| `$LINE_START` | First selected line | `"5"` |
| `$LINE_END` | Last selected line | `"10"` |
| `$LANGUAGE` | Detected language | `"javascript"` |
| `$SELECTION_COUNT` | Selected line count | `"6"` |
| `$TOTAL_LINES` | Total file lines | `"150"` |
| `$CURRENT_LINE` | Cursor position | `"25"` |

## Key Binding Rules

### Reserved Keys (Cannot Override)
- Navigation: `q`, `j`, `k`, `arrowup`, `arrowdown`, `b`, `f`, `g`, `G`
- Selection: `tab`, `shift+tab`, `a`, `c`
- File: `r`, `?`

### Key Naming
- Case sensitive: `a` ≠ `A`
- Special keys: `tab`, `space`, `shift+tab`
- Arrows: `arrowup`, `arrowdown`, `arrowleft`, `arrowright`

## File Organization

### Auto-Loading
- All `actions/*.json` files loaded automatically
- Alphabetical processing order
- Schema validation on load
- Duplicate ID rejection

### Directory Structure
```
actions/
├── clipboard.json      # Copy/paste operations
├── development.json    # Editor integration
└── analysis.json       # File analysis tools
```

## Error Patterns for AI Agents

### Common Issues
1. **JSON Syntax**: Use `jq . file.json` to validate
2. **Key Conflicts**: Check with `hiliner --keymap`
3. **Missing Selection**: Validate `hasSelection` condition
4. **Path Spaces**: Always quote file paths

### Shell Command Best Practices
```bash
# Good: Error handling and feedback
"command && echo 'Success' || echo 'Failed'"

# Good: Quoted paths
"cd \"$(dirname \"$FILE_PATH\")\" && ls"

# Bad: No error handling
"risky-command"
```

## JavaScript API Quick Reference

```javascript
// Status updates
hiliner.updateStatus('✅ Success');
hiliner.clearStatus();

// File information
const info = hiliner.getFileInfo();
// Returns: {path, totalLines, language?, currentLine?}

// Selection information  
const selection = hiliner.getSelectionInfo();
// Returns: {selectedLines[], selectionCount, selectedText?, hasSelection, ...}
```

## Example Configurations

### Clipboard Operations
```json
{
  "version": "1.0.0",
  "actions": [
    {
      "id": "copy-selection",
      "name": "Copy Selected Text",
      "key": "y",
      "script": "echo \"$SELECTED_TEXT\" | pbcopy && echo \"Copied $SELECTION_COUNT lines\"",
      "when": {"hasSelection": true}
    },
    {
      "id": "copy-path",
      "name": "Copy File Path",
      "key": "p", 
      "script": "echo \"$FILE_PATH\" | pbcopy && echo \"Path copied\""
    }
  ]
}
```

### Development Tools
```json
{
  "version": "1.0.0",
  "actions": [
    {
      "id": "open-vscode",
      "name": "Open in VS Code",
      "key": "e",
      "script": "code \"$FILE_PATH\" && echo \"Opened in editor\""
    },
    {
      "id": "format-file",
      "name": "Format Code",
      "key": "f",
      "script": "cd \"$(dirname \"$FILE_PATH\")\" && prettier --write \"$(basename \"$FILE_PATH\")\" && echo \"Formatted\""
    }
  ]
}
```

## AI Agent Implementation Guidelines

### 1. Always Validate
```bash
# Check JSON syntax
jq . actions/new-config.json

# Check for conflicts
hiliner --keymap | grep "your-key"
```

### 2. Use Appropriate Types
- Simple operations → Shell commands
- UI interaction → Inline JavaScript
- Complex logic → External scripts

### 3. Provide Feedback
- Use status message formatting: `✅` `❌` `⏳` `📊`
- Include error handling in all scripts
- Give progress updates for long operations

### 4. Test Cross-Platform
```bash
# macOS clipboard
"echo \"$SELECTED_TEXT\" | pbcopy"

# Linux clipboard  
"echo \"$SELECTED_TEXT\" | xclip -selection clipboard"

# Windows (Git Bash/WSL)
"echo \"$SELECTED_TEXT\" | clip"
```

### 5. Handle Prerequisites
```javascript
// Check file loaded
if (!hiliner.getFileInfo().path) {
  hiliner.updateStatus('❌ No file loaded');
  return;
}

// Check selection when needed
if (!hiliner.getSelectionInfo().hasSelection) {
  hiliner.updateStatus('❌ Please select lines first');
  return;
}
```

This specification provides all necessary information for AI agents to assist users in creating reliable, cross-platform Hiliner actions.