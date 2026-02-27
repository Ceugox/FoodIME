import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.config.get<string>('EMAIL_FROM', 'FoodIME <onboarding@resend.dev>');
    this.frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;

    if (!this.resend) {
      this.logger.log(`[DEV] Verification email for ${to}: ${link}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Verifique seu email — FoodIME',
        html: `
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
        `,
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
    }
  }

  async sendSellerApprovedEmail(to: string, storeName: string) {
    if (!this.resend) {
      this.logger.log(`[DEV] Seller approved email for ${to} (store: ${storeName})`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Sua conta foi aprovada! — FoodIME',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #6D7C3A;">FoodIME</h2>
            <p>Ótima notícia! Sua loja <strong>${storeName}</strong> foi aprovada.</p>
            <p>Você já pode acessar sua conta e começar a vender.</p>
            <a href="${this.frontendUrl}/login" style="display: inline-block; background: #6D7C3A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Acessar FoodIME
            </a>
          </div>
        `,
      });
      this.logger.log(`Seller approved email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send seller approved email to ${to}`, error);
    }
  }

  async sendSellerRejectedEmail(to: string, reason?: string) {
    if (!this.resend) {
      this.logger.log(`[DEV] Seller rejected email for ${to} (reason: ${reason || 'none'})`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Atualização sobre sua conta — FoodIME',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #6D7C3A;">FoodIME</h2>
            <p>Infelizmente, sua conta de vendedor não foi aprovada.</p>
            ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
            <p>Se tiver dúvidas, entre em contato conosco.</p>
          </div>
        `,
      });
      this.logger.log(`Seller rejected email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send seller rejected email to ${to}`, error);
    }
  }
}
