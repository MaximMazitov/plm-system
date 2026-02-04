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

type Language = 'ru' | 'en';

// Переводы для email шаблонов
const translations = {
  ru: {
    // Status change email
    statusSubject: (modelNumber: string, statusLabel: string) =>
      `PLM: Модель ${modelNumber} - статус изменен на "${statusLabel}"`,
    statusHeader: 'Уведомление об изменении статуса',
    statusGreeting: (name: string) => `Здравствуйте, ${name}!`,
    statusChanged: 'Статус модели был изменен:',
    modelLabel: 'Модель:',
    collectionLabel: 'Коллекция:',
    newStatusLabel: 'Новый статус:',
    openModel: 'Открыть модель',
    autoMessage: 'Это автоматическое уведомление от PLM System.',
    noReply: 'Пожалуйста, не отвечайте на это письмо.',

    // Approval email
    approvalSubject: (modelNumber: string, roleLabel: string) =>
      `PLM: Модель ${modelNumber} - согласование от ${roleLabel}`,
    approvalHeader: 'Уведомление о согласовании',
    approvalReceived: 'Получено решение по согласованию модели:',
    commentLabel: 'Комментарий:',

    // Roles
    buyer: 'Байер',
    constructor: 'Конструктор',

    // Statuses
    statuses: {
      draft: 'Черновик',
      under_review: 'На рассмотрении',
      pending_review: 'На рассмотрении',
      approved: 'Одобрено',
      ds_stage: 'DS этап',
      ds: 'DS этап',
      pps_stage: 'PPS этап',
      pps: 'PPS этап',
      in_production: 'В производстве',
      production: 'В производстве',
      shipped: 'Отгружено'
    } as Record<string, string>,

    // Approval statuses
    approvalStatuses: {
      approved: 'Одобрено',
      approved_with_comments: 'Одобрено с комментариями',
      not_approved: 'Не одобрено',
      pending: 'Ожидает'
    } as Record<string, string>
  },
  en: {
    // Status change email
    statusSubject: (modelNumber: string, statusLabel: string) =>
      `PLM: Model ${modelNumber} - status changed to "${statusLabel}"`,
    statusHeader: 'Status Change Notification',
    statusGreeting: (name: string) => `Hello, ${name}!`,
    statusChanged: 'Model status has been changed:',
    modelLabel: 'Model:',
    collectionLabel: 'Collection:',
    newStatusLabel: 'New status:',
    openModel: 'Open Model',
    autoMessage: 'This is an automatic notification from PLM System.',
    noReply: 'Please do not reply to this email.',

    // Approval email
    approvalSubject: (modelNumber: string, roleLabel: string) =>
      `PLM: Model ${modelNumber} - approval from ${roleLabel}`,
    approvalHeader: 'Approval Notification',
    approvalReceived: 'Approval decision received for model:',
    commentLabel: 'Comment:',

    // Roles
    buyer: 'Buyer',
    constructor: 'Constructor',

    // Statuses
    statuses: {
      draft: 'Draft',
      under_review: 'Under Review',
      pending_review: 'Under Review',
      approved: 'Approved',
      ds_stage: 'DS Stage',
      ds: 'DS Stage',
      pps_stage: 'PPS Stage',
      pps: 'PPS Stage',
      in_production: 'In Production',
      production: 'In Production',
      shipped: 'Shipped'
    } as Record<string, string>,

    // Approval statuses
    approvalStatuses: {
      approved: 'Approved',
      approved_with_comments: 'Approved with Comments',
      not_approved: 'Not Approved',
      pending: 'Pending'
    } as Record<string, string>
  }
};

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
   * @param language - язык письма ('ru' для русского, 'en' для английского)
   */
  async sendStatusChangeEmail(
    to: string,
    recipientName: string,
    modelNumber: string,
    modelName: string,
    collectionName: string,
    newStatus: string,
    statusLabel: string,
    modelUrl: string,
    language: Language = 'ru'
  ): Promise<SendEmailResult> {
    const t = translations[language];
    const localizedStatusLabel = t.statuses[newStatus] || statusLabel;
    const subject = t.statusSubject(modelNumber, localizedStatusLabel);

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
      <p>${t.statusHeader}</p>
    </div>
    <div class="content">
      <p>${t.statusGreeting(recipientName)}</p>
      <p>${t.statusChanged}</p>

      <div class="model-info">
        <p><span class="label">${t.modelLabel}</span> ${modelNumber} - ${modelName || 'N/A'}</p>
        <p><span class="label">${t.collectionLabel}</span> ${collectionName || 'N/A'}</p>
        <p><span class="label">${t.newStatusLabel}</span> <span class="status">${localizedStatusLabel}</span></p>
      </div>

      <p style="text-align: center;">
        <a href="${modelUrl}" class="button">${t.openModel}</a>
      </p>
    </div>
    <div class="footer">
      <p>${t.autoMessage}</p>
      <p>${t.noReply}</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail(to, subject, htmlContent);
  }

  /**
   * Отправляет уведомление о согласовании
   * @param language - язык письма ('ru' для русского, 'en' для английского)
   */
  async sendApprovalEmail(
    to: string,
    recipientName: string,
    modelNumber: string,
    approvalType: 'buyer' | 'constructor',
    approvalStatus: string,
    approvalLabel: string,
    comment: string | undefined,
    modelUrl: string,
    language: Language = 'ru'
  ): Promise<SendEmailResult> {
    const t = translations[language];
    const roleLabel = approvalType === 'buyer' ? t.buyer : t.constructor;
    const localizedApprovalLabel = t.approvalStatuses[approvalStatus] || approvalLabel;
    const subject = t.approvalSubject(modelNumber, roleLabel);

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
      <p>${t.approvalHeader}</p>
    </div>
    <div class="content">
      <p>${t.statusGreeting(recipientName)}</p>
      <p>${t.approvalReceived}</p>

      <div class="model-info">
        <p><span class="label">${t.modelLabel}</span> ${modelNumber}</p>
        <p><span class="label">${roleLabel}:</span>
          <span class="${approvalStatus.includes('approved') ? 'status-approved' : approvalStatus === 'not_approved' ? 'status-rejected' : 'status-pending'}">${localizedApprovalLabel}</span>
        </p>
        ${comment ? `<div class="comment"><span class="label">${t.commentLabel}</span><br>${comment}</div>` : ''}
      </div>

      <p style="text-align: center;">
        <a href="${modelUrl}" class="button">${t.openModel}</a>
      </p>
    </div>
    <div class="footer">
      <p>${t.autoMessage}</p>
      <p>${t.noReply}</p>
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
