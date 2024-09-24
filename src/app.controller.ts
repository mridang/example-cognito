import { Controller, Get, Render, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from './auth/constants';
import * as jwt from 'jsonwebtoken';

@Controller()
export class AppController {
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
  @Get('debugme')
  checkme() {
    return {
      //
    };
  }
}
