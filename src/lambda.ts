import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import serverlessExpress from '@codegenie/serverless-express';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Callback,
  Context,
  Handler,
} from 'aws-lambda';
import { AppModule } from './app.module';
import { ClsService } from 'nestjs-cls';
import { AsyncLocalStorage } from 'node:async_hooks';
import { BetterLogger, configure } from '@mridang/nestjs-defaults';

let cachedServer: Handler;

async function bootstrap() {
  if (!cachedServer) {
    const nestApp = await NestFactory.create<NestExpressApplication>(
      AppModule,
      {
        logger: new BetterLogger(new ClsService(new AsyncLocalStorage())),
        rawBody: true,
      },
    );

    nestApp.useLogger(nestApp.get(BetterLogger));
    configure(nestApp, __dirname);
    await nestApp.init();

    cachedServer = serverlessExpress({
      app: nestApp.getHttpAdapter().getInstance(),
    });
  }

  return cachedServer;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback<APIGatewayProxyResult>,
) => {
  const server = await bootstrap();
  return server(event, context, callback);
};
