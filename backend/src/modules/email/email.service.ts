import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    const gmailUser = this.config.get<string>('GMAIL_USER');
    const gmailAppPassword = this.config.get<string>('GMAIL_APP_PASSWORD');
    this.from = this.config.get<string>('EMAIL_FROM', `FoodIME <${gmailUser || 'noreply@foodime.com'}>`);
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');

    if (gmailUser && gmailAppPassword) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      this.logger.log(`Email configured with Gmail (${gmailUser})`);
    } else {
      this.transporter = null;
      this.logger.warn('GMAIL_USER/GMAIL_APP_PASSWORD not set — emails will be logged only');
    }
  }

  private async sendMail(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[DEV] Email to ${to}: ${subject}`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }

  async sendVerificationEmail(to: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;

    try {
      await this.sendMail(to, 'Verifique seu email — FoodIME', `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #6D7C3A;">FoodIME</h2>
          <p>Olá! Clique no botão abaixo para verificar seu email:</p>
          <a href="${link}" style="display: inline-block; background: #6D7C3A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verificar Email
          </a>
          <p style="margin-top: 16px; color: #666; font-size: 14px;">
            Ou copie e cole este link: <br/>
            <a href="${link}">${link}</a>
          </p>
          <p style="color: #999; font-size: 12px;">Este link expira em 24 horas.</p>
        </div>
      `);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
    }
  }

  async sendSellerApprovedEmail(to: string, storeName: string) {
    try {
      await this.sendMail(to, 'Sua conta foi aprovada! — FoodIME', `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #6D7C3A;">FoodIME</h2>
          <p>Ótima notícia! Sua loja <strong>${storeName}</strong> foi aprovada.</p>
          <p>Você já pode acessar sua conta e começar a vender.</p>
          <a href="${this.frontendUrl}/login" style="display: inline-block; background: #6D7C3A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Acessar FoodIME
          </a>
        </div>
      `);
      this.logger.log(`Seller approved email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send seller approved email to ${to}`, error);
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;

    try {
      await this.sendMail(to, 'Redefinir senha — FoodIME', `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #6D7C3A;">FoodIME</h2>
          <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo:</p>
          <a href="${link}" style="display: inline-block; background: #6D7C3A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Redefinir Senha
          </a>
          <p style="margin-top: 16px; color: #666; font-size: 14px;">
            Ou copie e cole este link: <br/>
            <a href="${link}">${link}</a>
          </p>
          <p style="color: #999; font-size: 12px;">Este link expira em 1 hora. Se você não solicitou, ignore este email.</p>
        </div>
      `);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
    }
  }

  async sendSellerRejectedEmail(to: string, reason?: string) {
    try {
      await this.sendMail(to, 'Atualização sobre sua conta — FoodIME', `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #6D7C3A;">FoodIME</h2>
          <p>Infelizmente, sua conta de vendedor não foi aprovada.</p>
          ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
          <p>Se tiver dúvidas, entre em contato conosco.</p>
        </div>
      `);
      this.logger.log(`Seller rejected email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send seller rejected email to ${to}`, error);
    }
  }
}
