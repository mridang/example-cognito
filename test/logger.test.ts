import { expect } from '@jest/globals';
import { BetterLogger } from '../src/logger';
import { ClsService } from 'nestjs-cls';

describe('CustomLoggerService', () => {
  let betterLogger: BetterLogger;

  const sampleError = new Error();

  beforeEach(() => {
    const mockClsService = {
      get: jest.fn().mockReturnValue({ requestId: 'test-request-id' }),
    } as unknown as ClsService;

    betterLogger = new BetterLogger(
      mockClsService,
      ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'],
      {
        SERVICE_NAME: 'foo',
        AWS_LAMBDA_FUNCTION_NAME: 'bar',
        AWS_LAMBDA_FUNCTION_VERSION: '$LATEST',
        AWS_REGION: 'us-east-1',
        NODE_ENV: 'test',
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function testLog(
    logMethod: keyof BetterLogger,
    logLevel: string,
    logMessage: string,
    ...extraProps: unknown[]
  ) {
    const consoleSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    (
      betterLogger[logMethod] as (
        msg: string,
        ...optionalParams: unknown[]
      ) => void
    ).call(betterLogger, logMessage, ...extraProps);

    expect(consoleSpy).toHaveBeenCalledTimes(1);

    const logOutput = consoleSpy.mock.calls[0][0] as string;
    expect(JSON.parse(logOutput.trim())).toEqual({
      message: logMessage,
      level: logLevel,
      context: 'Unknown',
      service_name: 'foo',
      aws_lambda_function_name: 'bar',
      aws_lambda_function_version: '$LATEST',
      aws_region: 'us-east-1',
      env_name: 'test',
      requestId: 'test-request-id',
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
      ),
      error: extraProps.find((param) => param instanceof Error)
        ? sampleError.stack
        : undefined,
      extras:
        extraProps.filter((param) => !(param instanceof Error)).length === 0
          ? undefined
          : extraProps.filter((param) => !(param instanceof Error)),
    });
  }

  it('should log info messages to the console in JSON format', () => {
    testLog('log', 'info', 'Test log message');
  });

  it('should log info messages with an error to the console in JSON format', () => {
    testLog('log', 'info', 'Test log message', 'baz', sampleError, {
      foo: 'bar',
    });
  });

  it('should log debug messages to the console in JSON format', () => {
    testLog('debug', 'debug', 'Test debug message');
  });

  it('should log debug messages with an error to the console in JSON format', () => {
    testLog('debug', 'debug', 'Test debug message', 'baz', sampleError, {
      foo: 'bar',
    });
  });

  it('should log verbose messages to the console in JSON format', () => {
    testLog('verbose', 'verbose', 'Test verbose message');
  });

  it('should log verbose messages with an error to the console in JSON format', () => {
    testLog('verbose', 'verbose', 'Test verbose message', 'baz', sampleError, {
      foo: 'bar',
    });
  });

  it('should log error messages to the console in JSON format', () => {
    testLog('error', 'error', 'Test error message');
  });

  it('should log error messages with an error to the console in JSON format', () => {
    testLog('error', 'error', 'Test error message', 'baz', sampleError, {
      foo: 'bar',
    });
  });

  it('should log warning messages to the console in JSON format', () => {
    testLog('warn', 'warn', 'Test warn message');
  });

  it('should log warning messages to the console in JSON format', () => {
    testLog('warn', 'warn', 'Test warn message', 'baz', sampleError, {
      foo: 'bar',
    });
  });
});
