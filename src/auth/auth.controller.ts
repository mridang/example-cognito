import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Render,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import cognitoConfig, { Public } from './constants';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Controller()
export class AuthController {
  constructor(private httpService: HttpService) {
    //
  }

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
        const response = await lastValueFrom(
          this.httpService.post(
            `${cognitoConfig.cognitoAuthDomain}/oauth2/token`,
            new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: cognitoConfig.poolClientId,
              redirect_uri: cognitoConfig.postCallbackUri,
              code: code,
            }).toString(),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          ),
        );

        if (!response || !response.data) {
          throw new HttpException(
            'Failed to retrieve tokens',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        res.cookie('jwt', response.data.id_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: cognitoConfig.sessionDurationDays * 1000,
        });
        res.cookie('at', response.data.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: response.data.expires_in * 1000,
        });
        res.cookie('rt', response.data.refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: response.data.expires_in * 1000,
        });

        res.redirect('/');
      } catch (error) {
        console.error('Error exchanging authorization code: ', error);
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send('Failed to exchange authorization code.');
      }
    } else {
      res
        .status(HttpStatus.BAD_REQUEST)
        .send('Invalid request: No code provided.');
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
