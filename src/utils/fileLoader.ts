/**
 * File loading and validation utilities
 * Handles file validation, loading, and error management with proper TypeScript types
 */

import fs from 'fs/promises';

export enum ErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ENCODING_ERROR = 'ENCODING_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
}

export interface FileMetadata {
  path: string;
  size: number;
  lineCount: number;
  encoding: string;
  lastModified: Date;
}

export interface FileLoadOptions {
  maxSize?: number;
  encoding?: BufferEncoding;
  preserveLineEndings?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  size?: number;
  error?: string;
}

export interface FileLoadResult {
  success: boolean;
  lines: string[];
  metadata: FileMetadata | null;
  error: FileValidationError | null;
}

export class FileValidationError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly filePath?: string,
    public readonly recoverable = false
  ) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Validates if a file exists and meets size requirements
 * @param filePath - Path to the file to validate
 * @param maxSize - Maximum allowed file size in bytes (default: 10MB)
 * @returns FileValidationResult with validation status and file size
 */
export async function validateFileSize(
  filePath: string,
  maxSize: number = 10 * 1024 * 1024
): Promise<FileValidationResult> {
  try {
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    if (fileSize > maxSize) {
      return {
        valid: false,
        size: fileSize,
        error: `File exceeds maximum size limit of ${Math.round(maxSize / (1024 * 1024))}MB (actual: ${Math.round(fileSize / (1024 * 1024))}MB)`,
      };
    }

    return {
      valid: true,
      size: fileSize,
    };
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return {
        valid: false,
        error: 'File not found',
      };
    }

    if (nodeError.code === 'EACCES' || nodeError.message?.includes('permission denied')) {
      return {
        valid: false,
        error: 'EACCES: permission denied',
      };
    }

    return {
      valid: false,
      error: `File validation error: ${nodeError.message}`,
    };
  }
}

/**
 * Detects if a buffer contains binary data by checking for null bytes
 * @param buffer - Buffer to check
 * @returns true if binary data detected
 */
function isBinaryBuffer(buffer: Buffer): boolean {
  // Check first 8000 bytes for null bytes (common binary indicator)
  const sampleSize = Math.min(8000, buffer.length);
  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes line endings to \n and splits content into lines
 * @param content - Raw file content string
 * @returns Array of lines with normalized endings
 */
function normalizeLineEndings(content: string): string[] {
  // Handle different line ending combinations: \r\n, \n, \r
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by newlines
  const lines = normalized.split('\n');
  
  // Handle empty files - they should have one empty line
  if (lines.length === 1 && lines[0] === '') {
    return [''];
  }
  
  // Remove the last empty line if file ends with newline
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  
  return lines;
}

/**
 * Determines error type based on Node.js error codes
 * @param error - Error object from file operations
 * @returns Appropriate ErrorType enum value
 */
function getErrorType(error: unknown): ErrorType {
  const nodeError = error as NodeJS.ErrnoException;
  if (nodeError.code === 'ENOENT') {
    return ErrorType.FILE_NOT_FOUND;
  }
  if (nodeError.code === 'EACCES' || nodeError.message?.includes('permission denied')) {
    return ErrorType.PERMISSION_DENIED;
  }
  if (nodeError.message?.includes('encoding') || nodeError.message?.includes('invalid')) {
    return ErrorType.ENCODING_ERROR;
  }
  if (nodeError.code === 'EMFILE' || nodeError.code === 'ENOMEM') {
    return ErrorType.MEMORY_ERROR;
  }
  return ErrorType.ENCODING_ERROR; // Default fallback
}

/**
 * Loads file content and returns it as an array of lines with metadata
 * @param filePath - Path to the file to load
 * @param options - Optional loading parameters (maxSize, encoding, etc.)
 * @returns FileLoadResult with success status, lines, and metadata
 */
export async function loadFileContent(
  filePath: string,
  options?: FileLoadOptions
): Promise<FileLoadResult> {
  const defaultOptions: Required<FileLoadOptions> = {
    maxSize: 10 * 1024 * 1024, // 10MB
    encoding: 'utf8',
    preserveLineEndings: false,
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    // First validate file size
    const validation = await validateFileSize(filePath, finalOptions.maxSize);
    
    if (!validation.valid) {
      const errorType = validation.error?.includes('File not found') 
        ? ErrorType.FILE_NOT_FOUND 
        : ErrorType.FILE_TOO_LARGE;
      
      return {
        success: false,
        lines: [],
        metadata: null,
        error: new FileValidationError(
          errorType,
          validation.error || 'File validation failed',
          filePath
        ),
      };
    }

    // Get file stats for metadata
    const stats = await fs.stat(filePath);
    
    // Read file as buffer first to detect binary content
    const buffer = await fs.readFile(filePath);
    
    // Check if file is binary
    if (isBinaryBuffer(buffer)) {
      return {
        success: false,
        lines: [],
        metadata: null,
        error: new FileValidationError(
          ErrorType.ENCODING_ERROR,
          'File encoding error: Cannot read binary file as text',
          filePath
        ),
      };
    }
    
    // Convert buffer to string with specified encoding
    let content: string;
    try {
      content = buffer.toString(finalOptions.encoding);
    } catch (encodingError: unknown) {
      return {
        success: false,
        lines: [],
        metadata: null,
        error: new FileValidationError(
          ErrorType.ENCODING_ERROR,
          `File encoding error: Unable to decode file with ${finalOptions.encoding} encoding`,
          filePath
        ),
      };
    }

    // Process content based on options
    const lines = finalOptions.preserveLineEndings 
      ? content.split('\n')
      : normalizeLineEndings(content);

    // Build metadata
    const metadata: FileMetadata = {
      path: filePath,
      size: stats.size,
      lineCount: lines.length,
      encoding: finalOptions.encoding,
      lastModified: new Date(stats.mtime),
    };

    return {
      success: true,
      lines,
      metadata,
      error: null,
    };

  } catch (error: unknown) {
    const errorType = getErrorType(error);
    const nodeError = error as Error;
    let errorMessage = nodeError.message;

    // Customize error messages based on type
    switch (errorType) {
      case ErrorType.FILE_NOT_FOUND:
        errorMessage = 'File not found';
        break;
      case ErrorType.PERMISSION_DENIED:
        errorMessage = 'EACCES: permission denied';
        break;
      case ErrorType.ENCODING_ERROR:
        errorMessage = `File encoding error: ${nodeError.message}`;
        break;
      case ErrorType.MEMORY_ERROR:
        errorMessage = `Memory error while reading file: ${nodeError.message}`;
        break;
    }

    return {
      success: false,
      lines: [],
      metadata: null,
      error: new FileValidationError(errorType, errorMessage, filePath),
    };
  }
}