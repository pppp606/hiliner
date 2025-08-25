# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hiliner is an interactive CLI file viewer built with Ink (React for CLI) that transforms from a static line highlighting tool to an interactive terminal-based file browser. The project operates in two modes with comprehensive syntax highlighting support:

1. **Interactive Mode** (default): Full-screen terminal viewer with keyboard navigation and real-time syntax highlighting
2. **Static Mode**: Legacy line highlighting functionality for CI/CD and scripting with syntax highlighting output

### Syntax Highlighting Architecture
- **Language Detection**: Uses @vscode/vscode-languagedetection for ML-based content analysis
- **Syntax Highlighting**: Shiki library with TextMate grammars and VS Code themes
- **ANSI Rendering**: Custom HTML-to-ANSI converter for terminal display
- **Performance Optimization**: 50MB caching system with viewport-limited processing

## Development Commands

### Build and Development
```bash
npm run build          # Compile TypeScript to dist/
npm run typecheck      # Type checking without compilation
npm run lint           # ESLint with TypeScript and React rules  
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Prettier formatting
```

### Testing
```bash
npm test               # Run all tests (Jest with ts-jest)
npm run test:watch     # Watch mode for development
npm run test:coverage  # Coverage report with 80% threshold
```

### Running the CLI
```bash
npm run build && node bin/hiliner.js <file>    # Interactive mode
npm run build && node bin/hiliner.js <file> <line-specs>  # Static mode
```

Note: The binary requires `npm run build` first as it loads from `dist/` directory.

## Architecture Overview

### Core Architecture Patterns

**Dual-Mode CLI Design**: The entry point (`src/cli.ts`) detects mode based on arguments:
- Interactive mode: Launches Ink React application with terminal control sequences
- Static mode: Processes line specifications and outputs highlighted text

**Ink React Components**: Interactive UI built as React components optimized for terminal rendering:
- `App.tsx`: Root component managing keyboard input and file loading state
- `FileViewer.tsx`: Viewport management and scroll calculation
- `FileContent.tsx`: Optimized text rendering with single-component approach to minimize re-renders
- `StatusBar.tsx`: File info and position indicators

**File Loading Architecture**: Layered approach with validation and error handling:
- `utils/fileLoader.ts`: Core file operations, validation, size limits (10MB default)
- `hooks/useFileLoader.ts`: React hook wrapping file operations with state management
- Supports async loading, cancellation, and memory efficiency for large files

### Key Technical Decisions

**Syntax Highlighting System**: 
- `utils/languageDetection.ts`: ML-based language detection using VS Code's model
- `utils/syntaxHighlighter.ts`: Shiki integration with HTML-to-ANSI conversion
- `hooks/useSyntaxHighlighting.ts`: React hook managing highlighting state and caching
- Performance optimization with viewport-limited processing and 50MB cache

**Performance Optimizations**: 
- Single text block rendering in `FileContent.tsx` to prevent DOM fragmentation
- React.memo usage throughout components to minimize re-renders
- iTerm2 compatibility with height constraints to prevent screen flickering
- Throttled keyboard input handling for smooth navigation
- Syntax highlighting cache with LRU eviction and viewport-aware keys

**Terminal Management**:
- Alternate screen buffer usage (`\x1B[?1049h/l`) for clean enter/exit
- Terminal clearing sequences for proper initialization
- Graceful cleanup on SIGINT/SIGTERM signals

**ESM Module System**: 
- Full ES modules with `.js` extensions in imports
- TypeScript compilation targeting ES2022 with bundler module resolution
- Jest configuration for ESM testing with proper transformations

## File Structure Context

### Core Implementation
- `src/cli.ts`: CLI argument parsing and mode detection
- `src/components/`: Ink React components for interactive UI
- `src/hooks/`: React hooks for state management (file loading, syntax highlighting)  
- `src/utils/`: Pure utility functions (file operations, validation, syntax highlighting)

### Syntax Highlighting System
- `src/utils/languageDetection.ts`: ML-based language detection using @vscode/vscode-languagedetection
- `src/utils/syntaxHighlighter.ts`: Shiki integration with HTML-to-ANSI conversion and theme management
- `src/hooks/useSyntaxHighlighting.ts`: React hook managing highlighting state, caching, and performance optimization
- `src/__mocks__/shiki.ts`: Jest mocks for testing syntax highlighting functionality

### Legacy Static Mode
- `src/highlighter.ts`: Static line highlighting logic with syntax highlighting integration
- `src/parser.ts`: Line specification parsing (`1-5`, `10+3`, etc.)
- `src/types.ts`: Shared TypeScript interfaces including syntax highlighting options

### Testing Strategy
- Component tests temporarily disabled due to ink-testing-library ESM compatibility issues
- Core functionality and utilities maintain full test coverage
- Jest configured with coverage thresholds at 80%

## Development Guidelines

### iTerm2 Compatibility
When modifying display components, maintain height constraints (`terminalHeight - 1`) to prevent flickering. The root cause is content exceeding screen height triggering full redraws.

### File Size Handling
The file loader has built-in 10MB size limits and memory-efficient streaming. Always validate file size before loading and provide proper error messages for oversized files.

### Component Updates
Use React.memo strategically and prefer single-render approaches in `FileContent.tsx`. The optimized display pattern minimizes terminal rendering updates.

### Syntax Highlighting Development
- **Performance**: Always use viewport-limited processing to prevent highlighting large files entirely
- **Caching**: The 50MB cache uses viewport-aware keys - changing line ranges creates new cache entries
- **Error Handling**: All highlighting operations must have fallbacks to plain text
- **Race Conditions**: Use operation IDs in useSyntaxHighlighting hook to prevent stale updates
- **Theme Management**: Shiki themes are loaded once and reused across all highlighting operations

### TypeScript and ESM
- Import statements must use `.js` extensions for compiled output
- Module resolution is set to "bundler" for proper path handling
- Target ES2022 for modern feature support

### Testing ESM Components
Due to ink-testing-library ESM compatibility issues, focus tests on hooks and utilities. Component integration testing should be done manually with the built CLI.