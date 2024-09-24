/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import cognitoConfig from './constants';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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
        const response = await fetch(
          `${cognitoConfig.cognitoAuthDomain}/oauth2/token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: cognitoConfig.poolClientId,
              refresh_token: request.cookies['rt'],
            }).toString(),
          },
        );

        const data = (await response.json()) as {
          id_token: string;
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        request?.res?.cookie('at', data.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: data.expires_in * 1000,
        });
        request?.res?.cookie('jwt', data.id_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: data.expires_in * 1000,
        });

        const newPayload = jwt.decode(data.access_token) as any;

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
