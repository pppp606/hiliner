/**
 * Hiliner JavaScript API
 * 
 * This module defines the API available to JavaScript scripts executed through the action system.
 * Scripts can use these APIs to interact with the Hiliner UI and display results.
 */

/**
 * Options for status bar updates
 */
export interface StatusOptions {
  /** Status message type */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** Auto-clear timeout in milliseconds */
  timeout?: number;
}

/**
 * Hiliner API available to JavaScript scripts
 */
export interface HilinerAPI {
  /**
   * Update the status bar with a message
   * @param message Message to display in status bar
   * @param options Optional display options
   */
  updateStatus(message: string, options?: StatusOptions): void;

  /**
   * Clear the status bar
   */
  clearStatus(): void;

  /**
   * Get current file information
   */
  getFileInfo(): {
    path: string;
    language: string;
    totalLines: number;
    currentLine: number;
  };

  /**
   * Get current selection information
   */
  getSelectionInfo(): {
    selectedLines: number[];
    selectionCount: number;
    selectedText: string;
  };
}

/**
 * Global hiliner API instance available to scripts
 * This will be injected into the JavaScript execution context
 */
declare global {
  var hiliner: HilinerAPI;
}