import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'wc-super-secret-key-2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUserToken(payload);
    if (!user) {
      throw new UnauthorizedException('Session invalid or user deleted');
    }
    return user;
  }
}
