import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { getCurrentInvoke } from '@codegenie/serverless-express';
import { ClsService } from 'nestjs-cls';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(_req: Request, _res: Response, next: NextFunction) {
    const event = getCurrentInvoke().event as APIGatewayProxyEventV2;

    this.cls.run(() => {
      this.cls.set('ctx', {
        request_id: event?.requestContext?.requestId,
        http_method: event?.requestContext.http.method,
        path: event?.requestContext.http.path,
        user_agent: event?.headers['user-agent'],
        referer: event?.headers['referer'],
        account_id: event?.requestContext?.accountId,
        domain_name: event?.requestContext?.domainName,
        protocol: event?.requestContext?.http.protocol,
      });
      next();
    });
  }
}
