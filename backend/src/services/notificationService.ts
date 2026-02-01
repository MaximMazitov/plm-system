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
import { wechatService } from './wechatService';

// Типы статусов моделей
type ModelStatus = 'draft' | 'approved' | 'ds_stage' | 'pps_stage' | 'in_production' | 'shipped';

// Типы ролей пользователей
type UserRole = 'admin' | 'buyer' | 'designer' | 'constructor' | 'china_office' | 'factory';

// Кого уведомлять при каком статусе
const STATUS_NOTIFICATION_RULES: Record<ModelStatus, UserRole[]> = {
  draft: [],
  approved: ['china_office'],
  ds_stage: ['china_office', 'factory'],
  pps_stage: ['constructor', 'buyer'],
  in_production: ['factory', 'china_office'],
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
  wechat_id: string;
  full_name: string;
  role: UserRole;
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
        query = `
          SELECT id as user_id, wechat_id, full_name, role
          FROM users
          WHERE role = 'factory' AND factory_id = $1 AND wechat_id IS NOT NULL AND wechat_id != ''
        `;
        params = [factoryId];
      } else {
        // Для остальных ролей - все пользователи с этой ролью
        query = `
          SELECT id as user_id, wechat_id, full_name, role
          FROM users
          WHERE role = $1 AND wechat_id IS NOT NULL AND wechat_id != ''
        `;
        params = [role];
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting recipients by role:', error);
      return [];
    }
  }

  /**
   * Переводит статус в читаемый текст
   */
  private getStatusLabel(status: ModelStatus): string {
    const labels: Record<ModelStatus, string> = {
      draft: '草稿 / Черновик',
      approved: '已批准 / Одобрено',
      ds_stage: 'DS阶段 / DS этап',
      pps_stage: 'PPS阶段 / PPS этап',
      in_production: '生产中 / В производстве',
      shipped: '已发货 / Отгружено'
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
    wechatMsgId?: string,
    errorMessage?: string
  ): Promise<number | null> {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (
          model_id, user_id, notification_type, status, title, message,
          wechat_msg_id, error_message, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${status === 'sent' ? 'CURRENT_TIMESTAMP' : 'NULL'})
        RETURNING id
      `, [modelId, userId, notificationType, status, title, message, wechatMsgId || null, errorMessage || null]);

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
    newStatus: ModelStatus,
    changedByUserId?: number
  ): Promise<{ sent: number; failed: number; skipped: number }> {
    const result = { sent: 0, failed: 0, skipped: 0 };

    // Проверяем, настроен ли WeChat
    if (!wechatService.isConfigured()) {
      console.log('WeChat not configured, skipping notifications');
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
      console.log('No recipients with WeChat ID found');
      return result;
    }

    // Формируем сообщение
    const title = `模型状态更新 / Обновление статуса модели`;
    const statusLabel = this.getStatusLabel(newStatus);
    const description = `模型: ${modelInfo.model_number} - ${modelInfo.model_name || 'N/A'}\n` +
                       `系列: ${modelInfo.collection_name || 'N/A'}\n` +
                       `新状态: ${statusLabel}`;
    const modelUrl = `${this.frontendUrl}/models/${modelId}`;
    const buttonText = '查看详情';

    // Отправляем уведомления каждому получателю
    for (const recipient of finalRecipients) {
      try {
        const sendResult = await wechatService.sendCardMessage(
          recipient.wechat_id,
          title,
          description,
          modelUrl,
          buttonText
        );

        if (sendResult.success) {
          await this.logNotification(
            modelId,
            recipient.user_id,
            `status_change_${newStatus}`,
            title,
            description,
            'sent',
            sendResult.msgId
          );
          result.sent++;
          console.log(`Notification sent to ${recipient.full_name} (${recipient.role})`);
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
          console.error(`Failed to send to ${recipient.full_name}: ${sendResult.error}`);
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
        console.error(`Exception sending to ${recipient.full_name}:`, error);
      }
    }

    console.log(`Notifications result: sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`);
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
    if (!wechatService.isConfigured()) return;

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
      approved: '已批准 / Одобрено',
      approved_with_comments: '有意见批准 / Одобрено с комментариями',
      not_approved: '未批准 / Не одобрено',
      pending: '待定 / Ожидает'
    };

    const roleLabels = {
      buyer: '采购员 / Байер',
      constructor: '设计师 / Конструктор'
    };

    const title = `审批更新 / Обновление согласования`;
    const description = `模型: ${modelInfo.model_number}\n` +
                       `${roleLabels[approvalType]}: ${approvalLabels[approvalStatus] || approvalStatus}\n` +
                       (comment ? `评论: ${comment}` : '');
    const modelUrl = `${this.frontendUrl}/models/${modelId}`;

    for (const recipient of uniqueRecipients) {
      try {
        await wechatService.sendCardMessage(
          recipient.wechat_id,
          title,
          description,
          modelUrl,
          '查看详情'
        );
      } catch (error) {
        console.error(`Failed to send approval notification to ${recipient.full_name}:`, error);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
