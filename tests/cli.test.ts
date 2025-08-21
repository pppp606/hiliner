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