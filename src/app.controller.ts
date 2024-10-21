import { Controller, Get, Req } from '@nestjs/common';
import { Request } from '@mridang/nestjs-defaults';
import { Public } from './auth/constants';
import * as jwt from 'jsonwebtoken';
import indexView from './index.view';

@Controller()
export class AppController {
  @Get()
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

    return indexView(isLoggedIn, jwtData);
  }

  @Public()
  @Get('debugme')
  checkme() {
    return {
      //
    };
  }
}
