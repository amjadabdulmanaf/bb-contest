import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login-init')
  @HttpCode(HttpStatus.OK)
  async loginInit(@Body('email') email: string) {
    return this.authService.initLoginFlow(email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(@Body() body: any) {
    await this.authService.setPassword(body.token, body.password);
    return { message: 'Password set successfully. You can now login.' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    await this.authService.requestForgotPassword(email);
    return { message: 'If the email is registered, a password setup link has been generated.' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshSession(refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: any) {
    const user = req.user;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      empId: user.empId,
      colorTeam: user.colorTeam,
      role: user.role,
      points: user.points
    };
  }
}
