import { expect } from '@jest/globals';
import { Logger } from '@aws-lambda-powertools/logger';
import { PowertoolsLoggerService } from '../src/app.logger';

// Mock the Logger from @aws-lambda-powertools/logger
jest.mock('@aws-lambda-powertools/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      };
    }),
  };
});

describe('app.logger tests', () => {
  let loggerService: PowertoolsLoggerService;
  let logger: Logger;

  beforeEach(() => {
    // Reset the module so we get a fresh instance
    jest.resetModules();
    loggerService = new PowertoolsLoggerService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger = (loggerService as any).logger;
  });

  it('should log an info message correctly', () => {
    const message = 'Test message';
    const context = 'TestContext';
    loggerService.log(message, context);
    expect(logger.info).toHaveBeenCalledWith('TestContext: Test message');
  });

  it('should log an error message correctly', () => {
    const message = 'Error message';
    const trace = 'Error trace';
    const context = 'ErrorContext';
    loggerService.error(message, trace, context);
    expect(logger.error).toHaveBeenCalledWith('ErrorContext: Error message', {
      trace,
    });
  });

  it('should log a warning message correctly', () => {
    const message = 'Warning message';
    const context = 'WarningContext';
    loggerService.warn(message, context);
    expect(logger.warn).toHaveBeenCalledWith('WarningContext: Warning message');
  });

  it('should log a debug message correctly', () => {
    const message = 'Debug message';
    const context = 'DebugContext';
    loggerService.debug(message, context);
    expect(logger.debug).toHaveBeenCalledWith('DebugContext: Debug message');
  });

  it('should log a verbose message correctly using debug method', () => {
    const message = 'Verbose message';
    const context = 'VerboseContext';
    // Note: verbose uses debug under the hood, as per your implementation
    loggerService.verbose(message, context);
    expect(logger.debug).toHaveBeenCalledWith(
      'VerboseContext: Verbose message',
    );
  });
});
