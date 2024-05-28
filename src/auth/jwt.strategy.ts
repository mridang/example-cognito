/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import cognitoConfig from './constants';
import { Request } from 'express';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(HttpService) private readonly httpService: HttpService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          return request?.cookies?.jwt;
        },
      ]),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri: `https://cognito-idp.${cognitoConfig.userPoolRegion}.amazonaws.com/${cognitoConfig.userPoolId}/.well-known/jwks.json`,
      }),
      audience: cognitoConfig.poolClientId,
      issuer: `https://cognito-idp.${cognitoConfig.userPoolRegion}.amazonaws.com/${cognitoConfig.userPoolId}`,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any, request: Request) {
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      try {
        const response = await lastValueFrom(
          this.httpService.post(
            `${cognitoConfig.cognitoAuthDomain}/oauth2/token`,
            new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: cognitoConfig.poolClientId,
              refresh_token: request.cookies['rt'],
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

        request?.res?.cookie('at', response.data.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: response.data.expires_in * 1000,
        });
        request?.res?.cookie('jwt', response.data.id_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: response.data.expires_in * 1000,
        });

        const newPayload = jwt.decode(response.data.access_token) as any;

        return {
          userId: newPayload.sub,
          username: newPayload['cognito:username'],
          givenName: newPayload['given_name'],
          familyName: newPayload['family_name'],
        };
      } catch (error) {
        throw new UnauthorizedException();
      }
    } else {
      return {
        userId: payload.sub,
        username: payload['cognito:username'],
        givenName: payload['given_name'],
        familyName: payload['family_name'],
      };
    }
  }
}
