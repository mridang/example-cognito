import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { HttpModule } from '@nestjs/axios';
import { ProfileController } from './profile.controller';

@Module({
  imports: [PassportModule, JwtModule.register({}), HttpModule],
  controllers: [AuthController, ProfileController],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
