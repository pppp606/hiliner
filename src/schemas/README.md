# Action Configuration Schema

This directory contains JSON Schema files for configuring custom actions in Hiliner.

## Files

- `actionConfig.schema.json` - JSON Schema for action configuration files
- `../types/actionConfig.ts` - TypeScript type definitions corresponding to the schema

## Schema Overview

The action configuration schema supports:

### Core Features
- **Custom key bindings**: Assign single-character keys to custom actions
- **Multiple command types**: Built-in functions, external commands, shell scripts, and command sequences
- **Environment variable templating**: Use `{{currentFile}}`, `{{currentLine}}`, etc. in commands
- **Conditional execution**: Actions can be restricted by file type, selection state, or other conditions
- **Safety features**: Mark dangerous actions and require confirmation prompts

### Command Types

1. **Simple String Commands**: `"pbcopy"` or `"git status"`
2. **Built-in Commands**: Execute Hiliner's internal functions
3. **External Commands**: Run external programs with arguments
4. **Command Sequences**: Execute multiple commands in order
5. **Script Commands**: Execute shell scripts with full environment control

### Variable Substitution

Actions can use template variables that are replaced at runtime:
- `{{currentFile}}` - Full path to current file
- `{{currentLine}}` - Current line number (1-based)
- `{{selectedLines}}` - Comma-separated selected line numbers
- `{{selectedText}}` - Content of selected lines
- `{{fileName}}` - File name only (no path)
- `{{fileDir}}` - Directory containing the file

### Safety and Validation

- **Key binding validation**: Prevents conflicts with reserved keys
- **Dangerous action marking**: Require explicit confirmation for destructive operations
- **Schema validation**: Comprehensive validation of all configuration properties
- **Type safety**: Full TypeScript support for development

## Example Usage

```json
{
  "$schema": "./actionConfig.schema.json",
  "version": "1.0.0",
  "actions": [
    {
      "id": "copy-line",
      "description": "Copy current line to clipboard",
      "key": "c",
      "script": "echo '{{selectedText}}' | pbcopy"
    },
    {
      "id": "open-editor",
      "description": "Open file in VS Code",
      "key": "e", 
      "script": {
        "type": "external",
        "command": "code",
        "args": ["{{currentFile}}:{{currentLine}}"]
      }
    }
  ]
}
```

## Schema Validation

The schema enforces:
- Required fields: `id`, `key`, `script`, `description`
- Key binding format: Single characters only
- Command structure validation
- Environment variable naming conventions
- Timeout limits and safety constraints

## Integration

Action configurations are loaded and validated at runtime, with full integration into Hiliner's keyboard handling system. Invalid configurations are rejected with detailed error messages pointing to specific validation failures.