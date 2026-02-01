/**
 * Email Service
 * Отправка email уведомлений через SMTP (nodemailer)
 */

import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Инициализация SMTP транспортера
   */
  private initializeTransporter(): void {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!host || !port || !user || !pass) {
      console.log('Email service not configured. Missing SMTP credentials.');
      return;
    }

    this.config = {
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465, // true for 465, false for other ports
      user,
      pass,
      from: from || user
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass
      }
    });

    console.log('Email service initialized successfully');
  }

  /**
   * Проверяет, настроен ли email сервис
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  /**
   * Отправляет email с HTML содержимым
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<SendEmailResult> {
    if (!this.transporter || !this.config) {
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"PLM System" <${this.config.from}>`,
        to,
        subject,
        text: textContent || this.stripHtml(htmlContent),
        html: htmlContent
      });

      console.log(`Email sent to ${to}: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Отправляет уведомление о смене статуса модели
   */
  async sendStatusChangeEmail(
    to: string,
    recipientName: string,
    modelNumber: string,
    modelName: string,
    collectionName: string,
    _newStatus: string,
    statusLabel: string,
    modelUrl: string
  ): Promise<SendEmailResult> {
    const subject = `PLM: Модель ${modelNumber} - статус изменен на "${statusLabel}"`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
    .model-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .model-info p { margin: 8px 0; }
    .label { font-weight: bold; color: #666; }
    .status { display: inline-block; padding: 5px 15px; background: #4caf50; color: white; border-radius: 20px; }
    .button { display: inline-block; padding: 12px 30px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PLM System</h1>
      <p>Уведомление об изменении статуса</p>
    </div>
    <div class="content">
      <p>Здравствуйте, ${recipientName}!</p>
      <p>Статус модели был изменен:</p>

      <div class="model-info">
        <p><span class="label">Модель:</span> ${modelNumber} - ${modelName || 'N/A'}</p>
        <p><span class="label">Коллекция:</span> ${collectionName || 'N/A'}</p>
        <p><span class="label">Новый статус:</span> <span class="status">${statusLabel}</span></p>
      </div>

      <p style="text-align: center;">
        <a href="${modelUrl}" class="button">Открыть модель</a>
      </p>
    </div>
    <div class="footer">
      <p>Это автоматическое уведомление от PLM System.</p>
      <p>Пожалуйста, не отвечайте на это письмо.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail(to, subject, htmlContent);
  }

  /**
   * Отправляет уведомление о согласовании
   */
  async sendApprovalEmail(
    to: string,
    recipientName: string,
    modelNumber: string,
    approvalType: 'buyer' | 'constructor',
    approvalStatus: string,
    approvalLabel: string,
    comment: string | undefined,
    modelUrl: string
  ): Promise<SendEmailResult> {
    const roleLabel = approvalType === 'buyer' ? 'Байер' : 'Конструктор';
    const subject = `PLM: Модель ${modelNumber} - согласование от ${roleLabel}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
    .model-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .model-info p { margin: 8px 0; }
    .label { font-weight: bold; color: #666; }
    .status-approved { display: inline-block; padding: 5px 15px; background: #4caf50; color: white; border-radius: 20px; }
    .status-rejected { display: inline-block; padding: 5px 15px; background: #f44336; color: white; border-radius: 20px; }
    .status-pending { display: inline-block; padding: 5px 15px; background: #ff9800; color: white; border-radius: 20px; }
    .comment { background: #fff3e0; padding: 10px; border-left: 4px solid #ff9800; margin: 10px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PLM System</h1>
      <p>Уведомление о согласовании</p>
    </div>
    <div class="content">
      <p>Здравствуйте, ${recipientName}!</p>
      <p>Получено решение по согласованию модели:</p>

      <div class="model-info">
        <p><span class="label">Модель:</span> ${modelNumber}</p>
        <p><span class="label">${roleLabel}:</span>
          <span class="${approvalStatus.includes('approved') ? 'status-approved' : approvalStatus === 'not_approved' ? 'status-rejected' : 'status-pending'}">${approvalLabel}</span>
        </p>
        ${comment ? `<div class="comment"><span class="label">Комментарий:</span><br>${comment}</div>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${modelUrl}" class="button">Открыть модель</a>
      </p>
    </div>
    <div class="footer">
      <p>Это автоматическое уведомление от PLM System.</p>
      <p>Пожалуйста, не отвечайте на это письмо.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail(to, subject, htmlContent);
  }

  /**
   * Убирает HTML теги из строки
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

export const emailService = new EmailService();
export default emailService;
