import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port: port,
        secure: secure,
        auth: {
          user: user,
          pass: pass,
        },
      });
      this.logger.log('SMTP mail transporter initialized successfully.');
    } else {
      this.logger.warn('SMTP credentials are missing. Emails will be mocked.');
    }
  }

  async sendMail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    const from = process.env.SMTP_FROM || `"World Cup Predictor" <${process.env.SMTP_USER}>`;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      if (!this.transporter) {
        this.logger.error('SMTP Transporter is not initialized.');
        return false;
      }
      try {
        const info = await this.transporter.sendMail({
          from: from,
          to: to,
          subject: subject,
          html: htmlContent,
        });
        this.logger.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return true;
      } catch (error: any) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
        return false;
      }
    } else {
      // Local development: only write setup link to sent-emails.txt
      try {
        const linkMatch = htmlContent.match(/href="([^"]+)"/) || htmlContent.match(/href='([^']+)'/);
        const link = linkMatch ? linkMatch[1] : '';
        if (link) {
          const logLine = `[${new Date().toISOString()}] To: ${to} | Link: ${link}\n`;
          const logFilePath = path.join(process.cwd(), 'sent-emails.txt');
          fs.appendFileSync(logFilePath, logLine, 'utf8');
          this.logger.log(`[MailService] Local Email Mocked: Setup link for ${to} written to sent-emails.txt`);
        } else {
          this.logger.log(`[MailService] Local Email Mocked: Content for ${to} had no link to log.`);
        }
        return true;
      } catch (error: any) {
        this.logger.error(`Failed to log email link to sent-emails.txt: ${error.message}`);
        return false;
      }
    }
  }
}

