import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Render,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import cognitoConfig, { Public } from './constants';

@Controller()
export class AuthController {
  @Get('oops')
  @Render('oops')
  @Public()
  getOopsPage() {
    return {
      //
    };
  }

  @Public()
  @Get('login')
  login(@Res({ passthrough: true }) res: Response): void {
    res.redirect(
      `${cognitoConfig.cognitoAuthDomain}/login?response_type=code&client_id=${cognitoConfig.poolClientId}&redirect_uri=${cognitoConfig.postCallbackUri}&scope=openid+profile+email+aws.cognito.signin.user.admin`,
    );
  }

  @Public()
  @Get('callback')
  async handleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { code } = req.query;
    if (typeof code === 'string') {
      try {
        const response = await fetch(
          `${cognitoConfig.cognitoAuthDomain}/oauth2/token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: cognitoConfig.poolClientId,
              redirect_uri: cognitoConfig.postCallbackUri,
              code: code,
            }).toString(),
          },
        );

        const data = (await response.json()) as {
          id_token: string;
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        res.cookie('jwt', data.id_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: cognitoConfig.sessionDurationDays * 1000,
        });
        res.cookie('at', data.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: data.expires_in * 1000,
        });
        res.cookie('rt', data.refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: data.expires_in * 1000,
        });

        res.redirect('/');
      } catch (error) {
        console.error('Error exchanging authorization code: ', error);
        throw new InternalServerErrorException(
          'Failed to exchange authorization code.',
        );
      }
    } else {
      throw new BadRequestException('Invalid request: No code provided.');
    }
  }

  @Public()
  @Get('loggedout')
  loggedOut() {
    return "you're out";
  }

  @Get('logout')
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie('jwt');
    res.clearCookie('at');
    res.clearCookie('rt');
    res.redirect(
      `${cognitoConfig.cognitoAuthDomain}/logout?client_id=${cognitoConfig.poolClientId}&logout_uri=${cognitoConfig.postLogoutUri}`,
    );
  }
}
