/**
 * CLI tests for hiliner
 * Testing the --version option using TDD approach
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('CLI Version Option', () => {
  // Store original console.log to restore later
  const originalConsoleLog = console.log;
  const originalProcessExit = process.exit;

  // Mock console.log and process.exit
  let consoleMock: jest.MockedFunction<typeof console.log>;
  let processExitMock: jest.MockedFunction<typeof process.exit>;

  beforeEach(() => {
    // Mock console.log to capture output
    consoleMock = jest.fn();
    console.log = consoleMock;

    // Mock process.exit to prevent actual exit
    processExitMock = jest.fn() as any;
    process.exit = processExitMock;

    // Clear previous arguments
    process.argv = ['node', 'hiliner'];
  });

  afterEach(() => {
    // Restore original functions
    console.log = originalConsoleLog;
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  it('should display version when --version flag is passed', async () => {
    // Arrange: Set up command line arguments for --version
    process.argv = ['node', 'hiliner', '--version'];

    // Import and execute main function
    const { main } = await import('../src/cli');

    // Act: Execute the main CLI function
    await main();

    // Assert: Check that version "0.1.0" is displayed
    expect(consoleMock).toHaveBeenCalledTimes(1);
    expect(consoleMock).toHaveBeenCalledWith('hiliner v0.1.0');
  });

  it('should display version when -v flag is passed', async () => {
    // Arrange: Set up command line arguments for -v (short version)
    process.argv = ['node', 'hiliner', '-v'];

    // Import and execute main function
    const { main } = await import('../src/cli');

    // Act: Execute the main CLI function
    await main();

    // Assert: Check that version "0.1.0" is displayed
    expect(consoleMock).toHaveBeenCalledTimes(1);
    expect(consoleMock).toHaveBeenCalledWith('hiliner v0.1.0');
  });

  it('should not exit the process when version is displayed', async () => {
    // Arrange: Set up command line arguments for --version
    process.argv = ['node', 'hiliner', '--version'];

    // Import and execute main function
    const { main } = await import('../src/cli');

    // Act: Execute the main CLI function
    await main();

    // Assert: Check that process.exit was not called (version should not cause exit)
    expect(processExitMock).not.toHaveBeenCalled();
  });
});

describe('CLI Debug Option', () => {
  // Store original functions to restore later
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;
  const originalProcessExit = process.exit;
  const originalDebugMode = process.env.DEBUG_MODE;

  // Mock functions
  let consoleMock: jest.MockedFunction<typeof console.log>;
  let consoleDebugMock: jest.MockedFunction<typeof console.debug>;
  let processExitMock: jest.MockedFunction<typeof process.exit>;

  beforeEach(() => {
    // Mock console functions to capture output
    consoleMock = jest.fn();
    consoleDebugMock = jest.fn();
    console.log = consoleMock;
    console.debug = consoleDebugMock;

    // Mock process.exit to prevent actual exit
    processExitMock = jest.fn() as any;
    process.exit = processExitMock;

    // Clear previous arguments and environment
    process.argv = ['node', 'hiliner'];
    delete process.env.DEBUG_MODE;
  });

  afterEach(() => {
    // Restore original functions
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;
    process.exit = originalProcessExit;
    if (originalDebugMode !== undefined) {
      process.env.DEBUG_MODE = originalDebugMode;
    }
    jest.clearAllMocks();
  });

  it('should display debug information when --debug flag is passed', async () => {
    // Arrange: Set up command line arguments for --debug
    process.argv = ['node', 'hiliner', '--debug'];

    // Import and execute main function
    const { main } = await import('../src/cli');

    // Act: Execute the main CLI function
    await main();

    // Assert: Check that debug information is displayed
    expect(consoleDebugMock).toHaveBeenCalled();
    expect(consoleDebugMock).toHaveBeenCalledWith(
      expect.stringContaining('Debug mode enabled')
    );
    expect(consoleDebugMock).toHaveBeenCalledWith(
      expect.stringContaining('Parsed arguments:')
    );
  });

  it('should not display debug information by default', async () => {
    // Arrange: Set up command line arguments without --debug
    process.argv = ['node', 'hiliner', 'some-file.txt'];

    // Import and execute main function
    const { main } = await import('../src/cli');

    // Act: Execute the main CLI function
    await main();

    // Assert: Check that debug information is not displayed
    expect(consoleDebugMock).not.toHaveBeenCalled();
  });

  it('should set DEBUG_MODE environment variable when --debug flag is passed', async () => {
    // Arrange: Set up command line arguments for --debug
    process.argv = ['node', 'hiliner', '--debug'];

    // Import and execute main function
    const { main } = await import('../src/cli');

    // Act: Execute the main CLI function
    await main();

    // Assert: Check that DEBUG_MODE environment variable is set
    expect(process.env.DEBUG_MODE).toBe('true');
  });
});