import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from '@aws-lambda-powertools/logger';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class PowertoolsLoggerService implements LoggerService {
  private logger: Logger;

  constructor(private readonly clsService: ClsService) {
    this.logger = new Logger({
      serviceName: process.env.SERVICE_NAME,
      persistentLogAttributes: {
        aws_lambda_function_name: process.env.AWS_LAMBDA_FUNCTION_NAME,
        aws_lambda_function_version: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        aws_region: process.env.AWS_REGION,
        env_name: process.env.NODE_ENV,
      },
    });
  }

  log(message: string | object, context?: string): void {
    const ctx: object = this.clsService.get('ctx') || {};
    this.logger.info(this.formatMessage(message, context), {
      ...ctx,
    });
  }

  error(message: string | object, trace?: string, context?: string): void {
    const ctx: object = this.clsService.get('ctx') || {};
    this.logger.error(this.formatMessage(message, context), {
      trace,
      ...ctx,
    });
  }

  warn(message: string | object, context?: string): void {
    const ctx: object = this.clsService.get('ctx') || {};
    this.logger.warn(this.formatMessage(message, context), {
      ...ctx,
    });
  }

  debug(message: string | object, context?: string): void {
    const ctx: object = this.clsService.get('ctx') || {};
    this.logger.debug(this.formatMessage(message, context), {
      ...ctx,
    });
  }

  verbose(message: string | object, context?: string): void {
    const ctx: object = this.clsService.get('ctx') || {};
    this.logger.debug(this.formatMessage(message, context), {
      ...ctx,
    });
  }

  private formatMessage(message: string | object, context?: string): string {
    if (typeof message === 'string') {
      return context ? `${context}: ${message}` : message;
    } else {
      return JSON.stringify({ context, ...message });
    }
  }
}
