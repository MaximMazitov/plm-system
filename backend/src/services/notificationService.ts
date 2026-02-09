/**
 * Notification Service
 * Управляет логикой уведомлений при смене статуса моделей
 *
 * Правила уведомлений:
 * - approved → China Office
 * - ds_stage → China Office + Factory
 * - pps_stage → Constructor + Buyer
 * - in_production → Factory + China Office
 */

import pool from '../database/connection';
import { emailService } from './emailService';

// Статусы моделей обрабатываются как string для гибкости с разными форматами из БД

// Типы ролей пользователей
type UserRole = 'admin' | 'buyer' | 'designer' | 'constructor' | 'manager' | 'china_office' | 'factory';

// Кого уведомлять при каком статусе (включая короткие варианты)
const STATUS_NOTIFICATION_RULES: Record<string, UserRole[]> = {
  draft: [],
  under_review: ['constructor', 'buyer'],
  approved: ['china_office'],
  ds_stage: ['china_office', 'factory'],
  ds: ['china_office', 'factory'],
  pps_stage: ['constructor', 'buyer'],
  pps: ['constructor', 'buyer'],
  in_production: ['factory', 'china_office'],
  production: ['factory', 'china_office'],
  shipped: []
};

interface ModelInfo {
  id: number;
  model_number: string;
  model_name: string;
  collection_name: string;
  sketch_url: string | null;
  assigned_factory_id: number | null;
}

interface NotificationRecipient {
  user_id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

type Language = 'ru' | 'en';

// Роли, которые получают письма на английском языке
const ENGLISH_ROLES: UserRole[] = ['china_office', 'factory'];

/**
 * Определяет язык письма по роли получателя
 * China Office и Factory получают письма на английском
 */
function getLanguageForRole(role: UserRole): Language {
  return ENGLISH_ROLES.includes(role) ? 'en' : 'ru';
}

class NotificationService {
  private frontendUrl: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'https://plm-system.vercel.app';
  }

  /**
   * Получает информацию о модели для уведомления
   */
  private async getModelInfo(modelId: number): Promise<ModelInfo | null> {
    try {
      const result = await pool.query(`
        SELECT
          m.id,
          m.model_number,
          m.model_name,
          m.assigned_factory_id,
          c.name as collection_name,
          (
            SELECT file_url
            FROM model_files
            WHERE model_id = m.id AND file_type = 'sketch'
            ORDER BY uploaded_at DESC
            LIMIT 1
          ) as sketch_url
        FROM models m
        LEFT JOIN collections c ON m.collection_id = c.id
        WHERE m.id = $1
      `, [modelId]);

      if (result.rows.length === 0) return null;
      return result.rows[0];
    } catch (error) {
      console.error('Error getting model info:', error);
      return null;
    }
  }

  /**
   * Получает получателей уведомления по роли
   */
  private async getRecipientsByRole(role: UserRole, factoryId?: number | null): Promise<NotificationRecipient[]> {
    try {
      let query: string;
      let params: any[];

      if (role === 'factory' && factoryId) {
        // Для фабрики - получаем пользователей конкретной фабрики
        console.log(`[Notifications] Looking for factory users with factory_id=${factoryId}`);
        query = `
          SELECT id as user_id, email, full_name, role
          FROM users
          WHERE role = 'factory' AND factory_id = $1 AND is_active = true AND email IS NOT NULL AND email != ''
        `;
        params = [factoryId];
      } else {
        // Для остальных ролей - все пользователи с этой ролью
        console.log(`[Notifications] Looking for users with role=${role}`);
        query = `
          SELECT id as user_id, email, full_name, role
          FROM users
          WHERE role = $1 AND is_active = true AND email IS NOT NULL AND email != ''
        `;
        params = [role];
      }

      const result = await pool.query(query, params);
      console.log(`[Notifications] Found ${result.rows.length} recipients for role=${role}:`, result.rows.map(r => r.email));
      return result.rows;
    } catch (error) {
      console.error('Error getting recipients by role:', error);
      return [];
    }
  }

  /**
   * Переводит статус в читаемый текст
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      under_review: 'На рассмотрении',
      approved: 'Одобрено',
      ds_stage: 'DS этап',
      ds: 'DS этап',
      pps_stage: 'PPS этап',
      pps: 'PPS этап',
      in_production: 'В производстве',
      production: 'В производстве',
      shipped: 'Отгружено'
    };
    return labels[status] || status;
  }

  /**
   * Логирует уведомление в БД
   */
  private async logNotification(
    modelId: number,
    userId: number,
    notificationType: string,
    title: string,
    message: string,
    status: 'pending' | 'sent' | 'failed',
    emailMsgId?: string,
    errorMessage?: string
  ): Promise<number | null> {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (
          model_id, user_id, notification_type, status, title, message,
          wechat_msg_id, error_message, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${status === 'sent' ? 'CURRENT_TIMESTAMP' : 'NULL'})
        RETURNING id
      `, [modelId, userId, notificationType, status, title, message, emailMsgId || null, errorMessage || null]);

      return result.rows[0]?.id || null;
    } catch (error) {
      console.error('Error logging notification:', error);
      return null;
    }
  }

  /**
   * Главный метод - отправить уведомления при смене статуса модели
   */
  async sendStatusChangeNotifications(
    modelId: number,
    newStatus: string,
    changedByUserId?: number
  ): Promise<{ sent: number; failed: number; skipped: number }> {
    const result = { sent: 0, failed: 0, skipped: 0 };

    // Проверяем, настроен ли Email сервис
    if (!emailService.isConfigured()) {
      console.log('Email service not configured, skipping notifications');
      return result;
    }

    // Получаем роли для уведомления
    const rolesToNotify = STATUS_NOTIFICATION_RULES[newStatus];
    if (!rolesToNotify || rolesToNotify.length === 0) {
      console.log(`No notification rules for status: ${newStatus}`);
      return result;
    }

    // Получаем информацию о модели
    const modelInfo = await this.getModelInfo(modelId);
    if (!modelInfo) {
      console.error(`Model not found: ${modelId}`);
      return result;
    }

    // Собираем всех получателей
    const allRecipients: NotificationRecipient[] = [];
    for (const role of rolesToNotify) {
      const recipients = await this.getRecipientsByRole(role, modelInfo.assigned_factory_id);
      allRecipients.push(...recipients);
    }

    // Убираем дубликаты (по user_id)
    const uniqueRecipients = allRecipients.filter(
      (recipient, index, self) =>
        index === self.findIndex(r => r.user_id === recipient.user_id)
    );

    // Исключаем того, кто сделал изменение (если указан)
    const finalRecipients = changedByUserId
      ? uniqueRecipients.filter(r => r.user_id !== changedByUserId)
      : uniqueRecipients;

    if (finalRecipients.length === 0) {
      console.log('No recipients with email found');
      return result;
    }

    // Формируем сообщение
    const title = `Обновление статуса модели`;
    const statusLabel = this.getStatusLabel(newStatus);
    const description = `Модель: ${modelInfo.model_number} - ${modelInfo.model_name || 'N/A'}\n` +
                       `Коллекция: ${modelInfo.collection_name || 'N/A'}\n` +
                       `Новый статус: ${statusLabel}`;
    const modelUrl = `${this.frontendUrl}/models/${modelId}`;

    // Отправляем уведомления каждому получателю
    for (const recipient of finalRecipients) {
      try {
        // Определяем язык письма по роли получателя
        const language = getLanguageForRole(recipient.role);

        const sendResult = await emailService.sendStatusChangeEmail(
          recipient.email,
          recipient.full_name,
          modelInfo.model_number,
          modelInfo.model_name,
          modelInfo.collection_name,
          newStatus,
          statusLabel,
          modelUrl,
          language
        );

        if (sendResult.success) {
          await this.logNotification(
            modelId,
            recipient.user_id,
            `status_change_${newStatus}`,
            title,
            description,
            'sent',
            sendResult.messageId
          );
          result.sent++;
          console.log(`Email notification sent to ${recipient.full_name} (${recipient.email})`);
        } else {
          await this.logNotification(
            modelId,
            recipient.user_id,
            `status_change_${newStatus}`,
            title,
            description,
            'failed',
            undefined,
            sendResult.error
          );
          result.failed++;
          console.error(`Failed to send email to ${recipient.full_name}: ${sendResult.error}`);
        }
      } catch (error: any) {
        await this.logNotification(
          modelId,
          recipient.user_id,
          `status_change_${newStatus}`,
          title,
          description,
          'failed',
          undefined,
          error.message
        );
        result.failed++;
        console.error(`Exception sending email to ${recipient.full_name}:`, error);
      }
    }

    console.log(`Email notifications result: sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`);
    return result;
  }

  /**
   * Отправить уведомление о согласовании (для PPS этапа)
   */
  async sendApprovalNotification(
    modelId: number,
    approvalType: 'buyer' | 'constructor',
    approvalStatus: string,
    comment?: string
  ): Promise<void> {
    if (!emailService.isConfigured()) return;

    const modelInfo = await this.getModelInfo(modelId);
    if (!modelInfo) return;

    // Определяем получателей - при согласовании уведомляем противоположную сторону и China Office
    const rolesToNotify: UserRole[] = approvalType === 'buyer'
      ? ['constructor', 'china_office']
      : ['buyer', 'china_office'];

    const allRecipients: NotificationRecipient[] = [];
    for (const role of rolesToNotify) {
      const recipients = await this.getRecipientsByRole(role);
      allRecipients.push(...recipients);
    }

    const uniqueRecipients = allRecipients.filter(
      (recipient, index, self) =>
        index === self.findIndex(r => r.user_id === recipient.user_id)
    );

    if (uniqueRecipients.length === 0) return;

    const approvalLabels: Record<string, string> = {
      approved: 'Одобрено',
      approved_with_comments: 'Одобрено с комментариями',
      not_approved: 'Не одобрено',
      pending: 'Ожидает'
    };

    const modelUrl = `${this.frontendUrl}/models/${modelId}`;

    for (const recipient of uniqueRecipients) {
      try {
        // Определяем язык письма по роли получателя
        const language = getLanguageForRole(recipient.role);

        await emailService.sendApprovalEmail(
          recipient.email,
          recipient.full_name,
          modelInfo.model_number,
          approvalType,
          approvalStatus,
          approvalLabels[approvalStatus] || approvalStatus,
          comment,
          modelUrl,
          language
        );
      } catch (error) {
        console.error(`Failed to send approval email to ${recipient.full_name}:`, error);
      }
    }
  }
  /**
   * Отправить уведомление о новом комментарии к модели
   *
   * Правила:
   * - Если комментарий от designer/manager/constructor/buyer → уведомление china_office + factory
   * - Если комментарий от china_office/factory → уведомление constructor + buyer
   */
  async sendCommentNotification(
    modelId: number,
    commentAuthorId: number,
    commentAuthorName: string,
    commentAuthorRole: string,
    commentText: string,
    hasAttachments: boolean
  ): Promise<void> {
    if (!emailService.isConfigured()) return;

    const modelInfo = await this.getModelInfo(modelId);
    if (!modelInfo) return;

    // Определяем кому отправлять уведомление по роли автора комментария
    let rolesToNotify: UserRole[] = [];

    const internalRoles = ['designer', 'manager', 'constructor', 'buyer'];
    const externalRoles = ['china_office', 'factory'];

    if (internalRoles.includes(commentAuthorRole)) {
      // Дизайнер/Менеджер/Конструктор/Байер → оповещение china_office + factory
      rolesToNotify = ['china_office', 'factory'];
    } else if (externalRoles.includes(commentAuthorRole)) {
      // China Office/Фабрика → оповещение constructor + buyer
      rolesToNotify = ['constructor', 'buyer'];
    }

    if (rolesToNotify.length === 0) return;

    // Собираем всех получателей
    const allRecipients: NotificationRecipient[] = [];
    for (const role of rolesToNotify) {
      const recipients = await this.getRecipientsByRole(role, modelInfo.assigned_factory_id);
      allRecipients.push(...recipients);
    }

    // Убираем дубликаты (по user_id) и исключаем автора комментария
    const uniqueRecipients = allRecipients
      .filter(
        (recipient, index, self) =>
          index === self.findIndex(r => r.user_id === recipient.user_id)
      )
      .filter(r => r.user_id !== commentAuthorId);

    if (uniqueRecipients.length === 0) return;

    const modelUrl = `${this.frontendUrl}/models/${modelId}`;

    console.log(`[Notifications] Sending comment notifications for model ${modelId} by ${commentAuthorName} (${commentAuthorRole}) to ${uniqueRecipients.length} recipients`);

    // Отправляем уведомления
    for (const recipient of uniqueRecipients) {
      try {
        const language = getLanguageForRole(recipient.role);

        const sendResult = await emailService.sendCommentEmail(
          recipient.email,
          recipient.full_name,
          modelInfo.model_number,
          modelInfo.model_name,
          commentAuthorName,
          commentAuthorRole,
          commentText,
          hasAttachments,
          modelUrl,
          language
        );

        if (sendResult.success) {
          await this.logNotification(
            modelId,
            recipient.user_id,
            'comment',
            `Новый комментарий к модели ${modelInfo.model_number}`,
            `${commentAuthorName}: ${commentText?.substring(0, 200) || '(файлы)'}`,
            'sent',
            sendResult.messageId
          );
          console.log(`Comment notification sent to ${recipient.full_name} (${recipient.email})`);
        } else {
          await this.logNotification(
            modelId,
            recipient.user_id,
            'comment',
            `Новый комментарий к модели ${modelInfo.model_number}`,
            `${commentAuthorName}: ${commentText?.substring(0, 200) || '(файлы)'}`,
            'failed',
            undefined,
            sendResult.error
          );
          console.error(`Failed to send comment notification to ${recipient.full_name}: ${sendResult.error}`);
        }
      } catch (error: any) {
        console.error(`Exception sending comment notification to ${recipient.full_name}:`, error);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
