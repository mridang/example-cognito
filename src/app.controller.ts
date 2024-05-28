import { Controller, Get, Render, Req } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { Request } from 'express';
import { Public } from './auth/constants';
import * as jwt from 'jsonwebtoken';

@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) {
    //
  }

  @Get()
  @Render('index')
  showDecodedJwt(@Req() req: Request) {
    const token = req.cookies['jwt'];
    let jwtData = '';
    let isLoggedIn = false;

    try {
      jwtData = JSON.stringify(jwt.decode(token));
      isLoggedIn = true;
    } catch (error) {
      console.error('Error decoding JWT:', error);
      jwtData = 'Error decoding JWT';
    }

    return {
      jwt: jwtData,
      isLoggedIn: isLoggedIn,
    };
  }

  @Public()
  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('1.1.1.1', 'https://1.1.1.1/'),
    ]);
  }
}
