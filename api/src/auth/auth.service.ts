import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { MailService } from '../mail/mail.service';
import { PredictionsService } from '../predictions/predictions.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret = process.env.JWT_SECRET ?? 'wc-super-secret-key-2026';
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4200';

  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private predictionsService: PredictionsService,
  ) { }

  generateSessionToken(user: any): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '1h' }); // Short-lived 1 hour access token
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async generateRefreshToken(user: any): Promise<string> {
    const payload = { sub: user.id };
    const refreshToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '30d' }); // 30 days refresh token
    const newHash = this.hashToken(refreshToken);
    
    let hashes = user.refreshTokenHashes || [];
    hashes.push(newHash);
    
    // Limit to last 10 concurrent active sessions
    if (hashes.length > 10) {
      hashes = hashes.slice(hashes.length - 10);
    }
    user.refreshTokenHashes = [...hashes];
    
    await this.usersService.save(user);
    return refreshToken;
  }

  async validateUserToken(payload: JwtPayload) {
    return this.usersService.findById(payload.sub);
  }

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload: any = jwt.verify(refreshToken, this.jwtSecret);
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshTokenHashes || user.refreshTokenHashes.length === 0) {
        throw new UnauthorizedException('Session expired or inactive.');
      }

      const incomingHash = this.hashToken(refreshToken);
      const hashIndex = user.refreshTokenHashes.indexOf(incomingHash);
      if (hashIndex === -1) {
        // Reuse detection: clear database hashes and deny refresh
        user.refreshTokenHashes = [];
        await this.usersService.save(user);
        throw new UnauthorizedException('Refresh token reuse detected. Revoking session.');
      }

      // Generate rotated token pair
      const newAccessToken = this.generateSessionToken(user);
      
      // Remove old hash before generating the new one to rotate properly
      user.refreshTokenHashes.splice(hashIndex, 1);
      user.refreshTokenHashes = [...user.refreshTokenHashes];
      const newRefreshToken = await this.generateRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
  }

  async initLoginFlow(email: string): Promise<{ status: string; message?: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('This email is not registered in the system.');
    }

    if (!user.isPasswordSet) {
      // First time login -> generate password token
      const token = crypto.randomBytes(32).toString('hex');
      user.setPasswordToken = token;
      await this.usersService.save(user);

      const setupLink = `${this.frontendUrl}/set-password?token=${token}`;

      // Send password configuration email
      const htmlContent = `
        <div style="background-color: #05070f; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #e2e8f0; max-width: 600px; margin: auto; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; font-size: 26px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
              🏆
            </div>
            <h1 style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #fff; text-transform: uppercase; margin: 0;">
              WORLD CUP <span style="color: #f59e0b;">PREDICTOR</span>
            </h1>
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 3px; color: #f59e0b; text-transform: uppercase; display: block; margin-top: 5px;">
              REFLECTIONS SPORTS CLUB
            </span>
          </div>

          <!-- Body -->
          <div style="padding: 30px 10px 10px 10px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 15px;">
              Hello ${user.displayName || 'Participant'},
            </h2>
            <p style="color: #94a3b8; margin-bottom: 20px;">
              Welcome to the official <strong>FIFA World Cup 2026™ Prediction Contest</strong>! Your account has been initialized, and we're excited to have you join the game.
            </p>
            <p style="color: #94a3b8; margin-bottom: 25px;">
              Before you can start submitting predictions and climbing the leaderboard, you need to set up a secure password for your account. Please click the button below to get started:
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${setupLink}" style="display: inline-block; padding: 14px 32px; background: #00f2fe; color: #000000; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 0 15px rgba(0, 242, 254, 0.45), 0 4px 10px rgba(0, 0, 0, 0.35);">
                Configure Password
              </a>
            </div>

            <!-- Quick Game Rules Card -->
            <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #fff; font-size: 13px; font-weight: 700; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-left: 3px solid #f59e0b; padding-left: 8px;">
                ⚽ Quick scoring rules
              </h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 12.5px; color: #94a3b8; line-height: 1.8;">
                <li><strong style="color: #fff;">Exact Score:</strong> 20 Points (added on top of Correct Winner for a total of 30 Points)</li>
                <li><strong style="color: #fff;">Correct Winner:</strong> 10 Points</li>
                <li><strong style="color: #fff;">Goal Scorer:</strong> 10 Points (excluding shootout goals)</li>
                <li><strong style="color: #fff;">Resolution Time:</strong> 10 Points (Knockout stage)</li>
                <li><strong style="color: #fff;">Shootout Rule:</strong> Shootout goals/scorers are for tie-breaking only and are excluded from scorelines and goal scorer points.</li>
              </ul>
            </div>

            <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">
              If you cannot click the button above, copy and paste this link into your web browser:
            </p>
            <div style="background-color: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); padding: 12px; border-radius: 8px; word-break: break-all; margin-bottom: 30px;">
              <a href="${setupLink}" style="color: #38bdf8; font-size: 12px; text-decoration: none;">${setupLink}</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 25px; margin-top: 20px; font-size: 11px; color: #64748b;">
            <p style="margin: 0 0 5px 0; font-weight: 700; color: #94a3b8;">
              Reflections Sports Club
            </p>
            <p style="margin: 0 0 15px 0;">
              Point of Contact: Aryan C (<a href="mailto:aryan.c@reflectionsinfos.com" style="color: #38bdf8; text-decoration: none;">aryan.c@reflectionsinfos.com</a>)
            </p>
            <p style="margin: 0; font-size: 10px;">
              If you did not request this account setup, please ignore this email.
            </p>
          </div>
        </div>
      `;

      await this.mailService.sendMail(
        user.email,
        'Configure your World Cup Predictor Account Password',
        htmlContent
      );

      // Direct SMTP email dispatched successfully. No local logging fallback required.

      return {
        status: 'first_time',
        message: 'Welcome! It looks like it is your first time logging in. A password setup link has been generated and sent.'
      };
    }

    return {
      status: 'password_required'
    };
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isPasswordSet) {
      throw new BadRequestException('Password not set. Please request password setup.');
    }

    const hashedPassword = this.usersService.hashPassword(password);
    if (user.password !== hashedPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const accessToken = this.generateSessionToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    const rankTrend = await this.predictionsService.getUserRankAndTrend(user.id);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        empId: user.empId,
        colorTeam: user.colorTeam,
        role: user.role,
        points: user.points,
        rank: rankTrend.rank,
        trend: rankTrend.trend,
        previousRank: rankTrend.previousRank,
      }
    };
  }

  async setPassword(token: string, password: string): Promise<void> {
    const user = await this.usersService.findBySetPasswordToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired password setup link.');
    }

    user.password = this.usersService.hashPassword(password);
    user.isPasswordSet = true;
    user.setPasswordToken = null; // Clear token after success
    await this.usersService.save(user);
    this.logger.log(`[AuthService] Password set successfully for user ${user.email}`);
  }

  async requestForgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return success to avoid enumeration
      this.logger.warn(`Forgot password requested for non-existent email: ${email}`);
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.setPasswordToken = token;
    await this.usersService.save(user);

    const setupLink = `${this.frontendUrl}/set-password?token=${token}`;

    // Send password reset email
    const htmlContent = `
      <div style="background-color: #05070f; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #e2e8f0; max-width: 600px; margin: auto; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; font-size: 26px; background: linear-gradient(135deg, #ef4444, #b91c1c); border-radius: 12px; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
            🔑
          </div>
          <h1 style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #fff; text-transform: uppercase; margin: 0;">
            PASSWORD <span style="color: #ef4444;">RESET</span>
          </h1>
          <span style="font-size: 10px; font-weight: 800; letter-spacing: 3px; color: #ef4444; text-transform: uppercase; display: block; margin-top: 5px;">
            WORLD CUP PREDICTOR
          </span>
        </div>

        <!-- Body -->
        <div style="padding: 30px 10px 10px 10px;">
          <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 15px;">
            Hello ${user.displayName || 'Participant'},
          </h2>
          <p style="color: #94a3b8; margin-bottom: 20px;">
            We received a request to reset the password for your World Cup Predictor account. No worries, we've got you covered!
          </p>
          <p style="color: #94a3b8; margin-bottom: 25px;">
            Please click the red button below to configure a new password. This password reset link is valid for a single use:
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${setupLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);">
              Reset Password
            </a>
          </div>

          <!-- Security Note -->
          <div style="background-color: rgba(239, 68, 68, 0.03); border: 1px solid rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 18px; margin: 30px 0; border-left: 3px solid #ef4444;">
            <p style="margin: 0; font-size: 12.5px; color: #fca5a5; line-height: 1.6;">
              <strong>🛡️ Security Warning:</strong> If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged. Do not forward this email.
            </p>
          </div>

          <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">
            If you cannot click the button above, copy and paste this link into your web browser:
          </p>
          <div style="background-color: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); padding: 12px; border-radius: 8px; word-break: break-all; margin-bottom: 30px;">
            <a href="${setupLink}" style="color: #38bdf8; font-size: 12px; text-decoration: none;">${setupLink}</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 25px; margin-top: 20px; font-size: 11px; color: #64748b;">
          <p style="margin: 0 0 5px 0; font-weight: 700; color: #94a3b8;">
            Reflections Sports Club
          </p>
          <p style="margin: 0 0 15px 0;">
            Point of Contact: Aryan C (<a href="mailto:aryan.c@reflectionsinfos.com" style="color: #38bdf8; text-decoration: none;">aryan.c@reflectionsinfos.com</a>)
          </p>
        </div>
      </div>
    `;

    await this.mailService.sendMail(
      user.email,
      'Reset your World Cup Predictor Password',
      htmlContent
    );

    // Direct SMTP email dispatched successfully. No local logging fallback required.
  }
}
