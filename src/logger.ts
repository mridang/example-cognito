import { Injectable, LoggerService, LogLevel, Optional } from '@nestjs/common';
import winston, { createLogger, format, transports } from 'winston';
import { ClsService } from 'nestjs-cls';
import { ProcessEnv } from 'npm-run-path';
import { isString } from '@nestjs/common/utils/shared.utils';
import { isLogLevelEnabled } from '@nestjs/common/services/utils';

@Injectable()
export class BetterLogger implements LoggerService {
  private logger: winston.Logger;

  constructor(
    private readonly clsService: ClsService,
    @Optional()
    private logLevels: LogLevel[] = [
      'log',
      'error',
      'warn',
      'debug',
      'verbose',
      'fatal',
    ],
    @Optional()
    private readonly envVars: ProcessEnv = process.env,
  ) {
    this.logger = createLogger({
      level: 'debug',
      format: envVars.AWS_LAMBDA_FUNCTION_NAME
        ? format.combine(
            format((info) => {
              const ctx: object = this.clsService.get('ctx') || {};
              return {
                ...info,
                ...ctx,
                timestamp: new Date().toISOString().slice(0, -1),
              };
            })(),
            format.json(),
          )
        : format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            format.colorize({ all: true }),
            format.printf(({ timestamp, message, context }) => {
              return `${timestamp} ${context}: ${message}`;
            }),
          ),
      defaultMeta: {
        service_name: envVars.SERVICE_NAME,
        aws_lambda_function_name: envVars.AWS_LAMBDA_FUNCTION_NAME,
        aws_lambda_function_version: envVars.AWS_LAMBDA_FUNCTION_VERSION,
        aws_region: envVars.AWS_REGION,
        env_name: envVars.NODE_ENV,
      },
      transports: [new transports.Console()],
    });
  }

  /**
   * Write a 'log' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  log(message: string, context?: string): void;
  log(message: string, ...optionalParams: [...never, string?]): void;
  log(message: string, ...optionalParams: unknown[]) {
    if (!this.isLevelEnabled('log')) {
      return;
    }
    const { context, extras } = this.getContextAndMessagesToPrint(
      optionalParams.filter((param) => !(param instanceof Error)),
    );

    const error = optionalParams.find(
      (param) => param instanceof Error,
    ) as Error;

    this.logger.info(message as string, {
      context,
      extras,
      error: error?.stack,
    });
  }

  /**
   * Write an 'error' level log, if the configured level allows for it.
   * Prints to `stderr` with newline.
   */
  error(message: never, stackOrContext?: string): void;
  error(message: never, stack?: string, context?: string): void;
  error(message: never, ...optionalParams: [...never, string?, string?]): void;
  error(message: never, ...optionalParams: unknown[]) {
    if (!this.isLevelEnabled('error')) {
      return;
    }
    const { context, extras } = this.getContextAndMessagesToPrint(
      optionalParams.filter((param) => !(param instanceof Error)),
    );

    const error = optionalParams.find(
      (param) => param instanceof Error,
    ) as Error;

    this.logger.error(message as string, {
      context,
      extras,
      error: error?.stack,
    });

    if (!this.envVars.AWS_LAMBDA_FUNCTION_NAME) {
      console.error(error);
    }
  }

  /**
   * Write a 'warn' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  warn(message: never, context?: string): void;
  warn(message: never, ...optionalParams: [...never, string?]): void;
  warn(message: never, ...optionalParams: unknown[]) {
    if (!this.isLevelEnabled('warn')) {
      return;
    }
    const { context, extras } = this.getContextAndMessagesToPrint(
      optionalParams.filter((param) => !(param instanceof Error)),
    );

    const error = optionalParams.find(
      (param) => param instanceof Error,
    ) as Error;

    this.logger.warn(message as string, {
      context,
      extras,
      error: error?.stack,
    });

    if (!this.envVars.AWS_LAMBDA_FUNCTION_NAME) {
      console.warn(error);
    }
  }

  /**
   * Write a 'debug' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  debug(message: never, context?: string): void;
  debug(message: never, ...optionalParams: [...never, string?]): void;
  debug(message: never, ...optionalParams: unknown[]) {
    if (!this.isLevelEnabled('debug')) {
      return;
    }
    const { context, extras } = this.getContextAndMessagesToPrint(
      optionalParams.filter((param) => !(param instanceof Error)),
    );

    const error = optionalParams.find(
      (param) => param instanceof Error,
    ) as Error;

    this.logger.debug(message as string, {
      context,
      extras,
      error: error?.stack,
    });
  }

  /**
   * Write a 'verbose' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  verbose(message: never, context?: string): void;
  verbose(message: never, ...optionalParams: [...never, string?]): void;
  verbose(message: never, ...optionalParams: unknown[]) {
    if (!this.isLevelEnabled('verbose')) {
      return;
    }
    const { context, extras } = this.getContextAndMessagesToPrint(
      optionalParams.filter((param) => !(param instanceof Error)),
    );

    const error = optionalParams.find(
      (param) => param instanceof Error,
    ) as Error;

    this.logger.verbose(message as string, {
      context,
      extras,
      error: error?.stack,
    });
  }

  /**
   * Write a 'fatal' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  fatal(message: never, context?: string): void;
  fatal(message: never, ...optionalParams: [...never, string?]): void;
  fatal(message: never, ...optionalParams: unknown[]) {
    if (!this.isLevelEnabled('fatal')) {
      return;
    }
    const { context, extras } = this.getContextAndMessagesToPrint(
      optionalParams.filter((param) => !(param instanceof Error)),
    );

    const error = optionalParams.find(
      (param) => param instanceof Error,
    ) as Error;

    this.logger.crit(message as string, {
      context,
      extras,
      error: error?.stack,
    });

    if (!this.envVars.AWS_LAMBDA_FUNCTION_NAME) {
      console.error(error);
    }
  }

  /**
   * Set log levels
   * @param levels log levels
   */
  setLogLevels(levels: LogLevel[]) {
    this.logLevels = levels;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return isLogLevelEnabled(level, this.logLevels);
  }

  private getContextAndMessagesToPrint(args: unknown[]): {
    context: string;
    extras: unknown[] | undefined;
  } {
    if (args?.length >= 1) {
      if (isString(args[args.length - 1])) {
        return {
          context: args[args.length - 1] as string,
          extras: args.length > 1 ? args.slice(0, -1) : undefined,
        };
      } else {
        return {
          context: 'Unknown',
          extras: args,
        };
      }
    } else {
      return {
        context: 'Unknown',
        extras: undefined,
      };
    }
  }
}
