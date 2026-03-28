import nodemailer from 'nodemailer';

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
const fromAddress = process.env.EMAIL_FROM || `FoodIME <${gmailUser || 'noreply@foodime.com'}>`;
const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const transporter =
  gmailUser && gmailAppPassword
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: gmailUser, pass: gmailAppPassword },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      })
    : null;

async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: fromAddress, to, subject, html });
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${frontendUrl}/verify-email?token=${token}`;
  try {
    await sendMail(to, 'Verifique seu email — FoodIME', `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D4752E;">FoodIME</h2>
        <p>Olá! Clique no botão abaixo para verificar seu email:</p>
        <a href="${link}" style="display: inline-block; background: #D4752E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Verificar Email
        </a>
        <p style="margin-top: 16px; color: #666; font-size: 14px;">
          Ou copie e cole este link: <br/><a href="${link}">${link}</a>
        </p>
        <p style="color: #999; font-size: 12px;">Este link expira em 24 horas.</p>
      </div>
    `);
  } catch (error) {
    console.error(`Failed to send verification email to ${to}`, error);
  }
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${frontendUrl}/reset-password?token=${token}`;
  try {
    await sendMail(to, 'Redefinir senha — FoodIME', `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D4752E;">FoodIME</h2>
        <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo:</p>
        <a href="${link}" style="display: inline-block; background: #D4752E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Redefinir Senha
        </a>
        <p style="margin-top: 16px; color: #666; font-size: 14px;">
          Ou copie e cole este link: <br/><a href="${link}">${link}</a>
        </p>
        <p style="color: #999; font-size: 12px;">Este link expira em 1 hora. Se você não solicitou, ignore este email.</p>
      </div>
    `);
  } catch (error) {
    console.error(`Failed to send password reset email to ${to}`, error);
  }
}

export async function sendSellerApprovedEmail(to: string, storeName: string) {
  try {
    await sendMail(to, 'Sua conta foi aprovada! — FoodIME', `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D4752E;">FoodIME</h2>
        <p>Ótima notícia! Sua loja <strong>${storeName}</strong> foi aprovada.</p>
        <p>Você já pode acessar sua conta e começar a vender.</p>
        <a href="${frontendUrl}/login" style="display: inline-block; background: #D4752E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Acessar FoodIME
        </a>
      </div>
    `);
  } catch (error) {
    console.error(`Failed to send seller approved email to ${to}`, error);
  }
}

export async function sendSellerRejectedEmail(to: string, reason?: string) {
  try {
    await sendMail(to, 'Atualização sobre sua conta — FoodIME', `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D4752E;">FoodIME</h2>
        <p>Infelizmente, sua conta de vendedor não foi aprovada.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p>Se tiver dúvidas, entre em contato conosco.</p>
      </div>
    `);
  } catch (error) {
    console.error(`Failed to send seller rejected email to ${to}`, error);
  }
}
