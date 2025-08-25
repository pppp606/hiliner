// Mock implementation of Shiki for testing
// This allows us to test the syntax highlighter logic without dealing with ESM issues

export const bundledLanguages = {
  javascript: 'javascript',
  typescript: 'typescript', 
  python: 'python',
  json: 'json',
  html: 'html',
  css: 'css',
  bash: 'bash',
  text: 'text',
};

export const bundledThemes = {
  'dark-plus': 'dark-plus',
  'light-plus': 'light-plus',
  'github-dark': 'github-dark',
  'github-light': 'github-light',
  'monokai': 'monokai',
};

export type BundledLanguage = keyof typeof bundledLanguages;
export type BundledTheme = keyof typeof bundledThemes;

export interface Highlighter {
  codeToHtml(code: string, options: { lang: string; theme: string }): string;
  getLoadedLanguages(): string[];
  loadLanguage(...langs: string[]): Promise<void>;
  dispose?(): void;
}

// Track loaded languages for mock
const mockLoadedLanguages = new Set(['javascript', 'typescript', 'python', 'json', 'html', 'css', 'bash']);

// Mock highlighter that generates realistic HTML output
const mockHighlighter: Highlighter = {
  getLoadedLanguages(): string[] {
    return Array.from(mockLoadedLanguages);
  },
  
  async loadLanguage(...langs: string[]): Promise<void> {
    // Add languages to loaded set
    langs.forEach(lang => mockLoadedLanguages.add(lang));
    // Simulate async loading
    await new Promise(resolve => setTimeout(resolve, 1));
  },
  codeToHtml: (code: string, options: { lang: string; theme: string }): string => {
    if (options.lang === 'text' || options.lang === 'plaintext') {
      return code;
    }
    
    // Theme-specific color schemes
    const isDarkTheme = options.theme.includes('dark') || options.theme === 'monokai';
    const colors = isDarkTheme ? {
      keyword: '#569cd6',
      string: '#ce9178', 
      function: '#dcdcaa',
      default: '#d4d4d4'
    } : {
      keyword: '#0000ff',
      string: '#008000',
      function: '#795e26',
      default: '#000000'
    };
    
    // Generate mock HTML with realistic syntax highlighting
    let html = '<pre><code>';
    
    if (options.lang === 'javascript' || options.lang === 'typescript') {
      html += code
        .replace(/\b(function|const|let|var|return|if|else|for|while)\b/g, `<span style="color:${colors.keyword}">$1</span>`)
        .replace(/"([^"]*)"/g, `<span style="color:${colors.string}">"$1"</span>`)
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, `<span style="color:${colors.function}">$1</span>(`)
        .replace(/(\{|\}|\(|\)|;)/g, `<span style="color:${colors.default}">$1</span>`);
    } else if (options.lang === 'python') {
      html += code
        .replace(/\b(def|return|if|else|for|while|class|import|from)\b/g, '<span style="color:#569cd6">$1</span>')
        .replace(/"([^"]*)"/g, '<span style="color:#ce9178">"$1"</span>')
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span style="color:#dcdcaa">$1</span>(');
    } else if (options.lang === 'json') {
      html += code
        .replace(/"([^"]*)":/g, '<span style="color:#4fc1ff">"$1"</span>:')
        .replace(/:\s*"([^"]*)"/g, ': <span style="color:#ce9178">"$1"</span>')
        .replace(/:\s*(\d+)/g, ': <span style="color:#b5cea8">$1</span>');
    } else if (options.lang === 'html') {
      html += code
        .replace(/(<\/?)([a-zA-Z][a-zA-Z0-9]*)/g, '$1<span style="color:#569cd6">$2</span>')
        .replace(/\s([a-zA-Z-]+)=/g, ' <span style="color:#4fc1ff">$1</span>=')
        .replace(/"([^"]*)"/g, '<span style="color:#ce9178">"$1"</span>')
        .replace(/(>)/g, '<span style="color:#d4d4d4">$1</span>');
    } else {
      // Default highlighting - just add some basic coloring
      html += `<span style="color:#d4d4d4">${code}</span>`;
    }
    
    html += '</code></pre>';
    return html;
  },
  
  dispose: () => {
    // Mock dispose - does nothing
  }
};

export async function createHighlighter(options: {
  themes: string[];
  langs: string[];
}): Promise<Highlighter> {
  // Simulate async initialization (ignore unused options in mock)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { themes, langs } = options;
  await new Promise(resolve => setTimeout(resolve, 10));
  return mockHighlighter;
}