import { expect } from '@jest/globals';
import { End2EndModule } from './e2e.module';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Public } from '../src/auth/constants';

class TestDTO {
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  message?: string;
}

@Controller()
class DynamicController {
  @Get('500')
  @Public()
  get500() {
    throw new Error('500 error');
  }

  @Get('error')
  @Public()
  getError() {
    throw new InternalServerErrorException('General error');
  }

  @Get('set-cookie')
  @Public()
  setCookie(@Res({ passthrough: true }) res: Response) {
    res.cookie('test', 'NestJS');
    return 'Okie';
  }

  @Get('read-cookie')
  @Public()
  readCookie(@Req() req: Request) {
    return req.cookies['test'] || 'No cookie found';
  }

  @Get('cors-test')
  @Public()
  getCorsTest() {
    return { message: 'CORS is enabled' };
  }

  @Post('validate')
  @Public()
  validateTest(@Body() testDto: TestDTO) {
    return testDto;
  }
}

const testModule = new End2EndModule({
  imports: [
    {
      module: AppModule,
      controllers: [DynamicController],
      providers: [],
    },
  ],
});

describe('app.controller test', () => {
  beforeAll(async () => {
    await testModule.beforeAll();
  });

  afterAll(async () => {
    await testModule.afterAll();
  });

  it('/health (GET)', () => {
    return request(testModule.app.getHttpServer())
      .get('/health')
      .expect(HttpStatus.OK)
      .expect({
        status: 'ok',
        info: {
          '1.1.1.1': {
            status: 'up',
          },
        },
        error: {},
        details: {
          '1.1.1.1': {
            status: 'up',
          },
        },
      });
  });

  it('/404 (GET)', async () => {
    await request(testModule.app.getHttpServer())
      .get('/404')
      .set('Accept', 'text/html')
      .expect(HttpStatus.NOT_FOUND)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect((response) => {
        if (!response.text.includes('<title>Not Found</title>')) {
          throw new Error('Expected text not found in response');
        }
      });
  });

  it('/500 (GET)', async () => {
    await request(testModule.app.getHttpServer())
      .get('/500')
      .set('Accept', 'text/html')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect((response) => {
        if (!response.text.includes('<title>Internal server error</title>')) {
          throw new Error('Expected text not found in response');
        }
      });
  });

  it('/error (GET)', async () => {
    await request(testModule.app.getHttpServer())
      .get('/error')
      .set('Accept', 'text/html')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR)
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect((response) => {
        if (!response.text.includes('<title>Internal server error</title>')) {
          throw new Error('Expected text not found in response');
        }
      });
  });

  it('should set and read a cookie', async () => {
    await request(testModule.app.getHttpServer())
      .get('/set-cookie')
      .expect((res) => {
        expect(res.headers['set-cookie']).toContainEqual(
          expect.stringContaining(`test=NestJS`),
        );
      });

    await request(testModule.app.getHttpServer())
      .get('/read-cookie')
      .set('Cookie', [`test=NestJS`])
      .expect(HttpStatus.OK)
      .expect('NestJS');
  });

  it('should include security headers', async () => {
    await request(testModule.app.getHttpServer())
      .get('/some-path')
      .expect((res) => {
        expect(res.headers['x-dns-prefetch-control']).toBeDefined();
        expect(res.headers['x-frame-options']).toBeDefined();
      });
  });

  it('should have the Server-Timing header', async () => {
    await request(testModule.app.getHttpServer())
      .get('/health')
      .expect(HttpStatus.OK)
      .expect((res) => {
        expect(res.headers['server-timing']).toMatch(
          /total;dur=\d+(\.\d+)?;desc="App Total"/,
        );
      });
  });

  it('should handle request validation', async () => {
    const response = await request(testModule.app.getHttpServer())
      .post('/validate')
      .send({
        email: 'not-an-email',
      })
      .expect(HttpStatus.BAD_REQUEST);

    expect(response.body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      path: '/validate',
    });
  });

  it('should disallow all crawling', async () => {
    await request(testModule.app.getHttpServer())
      .get('/robots.txt')
      .expect('Content-Type', /text\/plain/)
      .expect(200)
      .then((response) => {
        expect(response.text).toContain('User-agent: *');
        expect(response.text).toContain('Disallow: /');
      });
  });
});
