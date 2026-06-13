import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtAuthGuard } from './auth.guard.js';
import { AuthController } from './auth.controller.js';
import { ProfileController } from './profile.controller.js';
import { MfaController } from './totp.controller.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DefaultAuthFilter } from './auth.filter.js';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, ProfileController, MfaController],
  providers: [
    {
      provide: CognitoIdentityProviderClient,
      useFactory: () => {
        return new CognitoIdentityProviderClient();
      },
    },
    JwtStrategy,
    {
      provide: APP_FILTER,
      useClass: DefaultAuthFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
