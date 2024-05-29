import { NestExpressApplication } from '@nestjs/platform-express';
import { CustomHttpExceptionFilter } from './errorpage.exception.filter';
import { join } from 'path';
import { handlebars } from 'hbs';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import serverTiming from 'server-timing';

export default function configure(nestApp: NestExpressApplication) {
  nestApp.useGlobalFilters(new CustomHttpExceptionFilter());
  nestApp.setViewEngine('hbs');
  nestApp.setBaseViewsDir(
    fs.existsSync(join(__dirname, 'views'))
      ? join(__dirname, 'views')
      : join(__dirname, '..', 'views'),
  );
  nestApp.engine(
    'hbs',
    (
      filePath: string,
      options: Record<string, object>,
      callback: (err: Error | null, rendered?: string) => void,
    ) => {
      const template = handlebars.compile(fs.readFileSync(filePath, 'utf8'));
      const result = template(options);
      callback(null, result);
    },
  );

  nestApp.use('/robots.txt', (req: Request, res: Response) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
  });
  nestApp.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'X-Lambda-Start',
      process.env.LAMBDA_COLD_START === 'true' ? 'Cold' : 'Warm',
    );
    process.env.LAMBDA_COLD_START = 'false';
    next();
  });
  nestApp.use(serverTiming());
  nestApp.use(cookieParser());
  nestApp.use(helmet());
  nestApp.enableCors();
  nestApp.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        }));
        return new BadRequestException(messages);
      },
    }),
  );

  return nestApp;
}
