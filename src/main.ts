import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import configure from './app';
import { BetterLogger } from './logger';
import { ClsService } from 'nestjs-cls';
import { AsyncLocalStorage } from 'node:async_hooks';

async function bootstrap() {
  const nestApp = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: new BetterLogger(new ClsService(new AsyncLocalStorage())),
  });

  configure(nestApp);
  await nestApp.init();
  await nestApp.listen(3000);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap().then(() => {
  console.log('\x07');
});
