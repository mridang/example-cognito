import { LoggerService } from '@nestjs/common';
import { Logger } from '@aws-lambda-powertools/logger';

export class PowertoolsLoggerService implements LoggerService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ serviceName: process.env.SERVICE_NAME });
  }

  log(message: string | object, context?: string): void {
    this.logger.info(this.formatMessage(message, context));
  }

  error(message: string | object, trace?: string, context?: string): void {
    this.logger.error(this.formatMessage(message, context), { trace });
  }

  warn(message: string | object, context?: string): void {
    this.logger.warn(this.formatMessage(message, context));
  }

  debug(message: string | object, context?: string): void {
    this.logger.debug(this.formatMessage(message, context));
  }

  verbose(message: string | object, context?: string): void {
    this.logger.debug(this.formatMessage(message, context));
  }

  private formatMessage(message: string | object, context?: string): string {
    if (typeof message === 'string') {
      return context ? `${context}: ${message}` : message;
    } else {
      return JSON.stringify({ context, ...message });
    }
  }
}
