/**
 * WeChat Work API Service
 * Для отправки уведомлений пользователям через WeChat Work
 *
 * Требуемые переменные окружения:
 * - WECHAT_CORP_ID: ID корпорации
 * - WECHAT_AGENT_ID: ID приложения
 * - WECHAT_SECRET: Секрет приложения
 */

interface WeChatTokenResponse {
  errcode: number;
  errmsg: string;
  access_token?: string;
  expires_in?: number;
}

interface WeChatMessageResponse {
  errcode: number;
  errmsg: string;
  msgid?: string;
}

interface CardMessage {
  touser: string;
  msgtype: 'textcard';
  agentid: number;
  textcard: {
    title: string;
    description: string;
    url: string;
    btntxt?: string;
  };
}

interface TextMessage {
  touser: string;
  msgtype: 'text';
  agentid: number;
  text: {
    content: string;
  };
}

class WeChatService {
  private corpId: string;
  private agentId: number;
  private secret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl = 'https://qyapi.weixin.qq.com/cgi-bin';

  constructor() {
    this.corpId = process.env.WECHAT_CORP_ID || '';
    this.agentId = parseInt(process.env.WECHAT_AGENT_ID || '0');
    this.secret = process.env.WECHAT_SECRET || '';
  }

  /**
   * Проверяет, настроен ли WeChat
   */
  isConfigured(): boolean {
    return !!(this.corpId && this.agentId && this.secret);
  }

  /**
   * Получает access token (кешируется)
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.isConfigured()) {
      console.warn('WeChat is not configured. Skipping notification.');
      return null;
    }

    // Проверяем кеш
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const url = `${this.baseUrl}/gettoken?corpid=${this.corpId}&corpsecret=${this.secret}`;
      const response = await fetch(url);
      const data = await response.json() as WeChatTokenResponse;

      if (data.errcode === 0 && data.access_token) {
        this.accessToken = data.access_token;
        // Токен живёт 7200 секунд, обновляем за 5 минут до истечения
        this.tokenExpiry = Date.now() + ((data.expires_in || 7200) - 300) * 1000;
        return this.accessToken;
      }

      console.error('WeChat getAccessToken error:', data.errmsg);
      return null;
    } catch (error) {
      console.error('WeChat getAccessToken exception:', error);
      return null;
    }
  }

  /**
   * Отправляет текстовую карточку с кнопкой
   */
  async sendCardMessage(
    wechatUserId: string,
    title: string,
    description: string,
    url: string,
    buttonText: string = '查看详情'
  ): Promise<{ success: boolean; msgId?: string; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { success: false, error: 'Failed to get access token' };
    }

    const message: CardMessage = {
      touser: wechatUserId,
      msgtype: 'textcard',
      agentid: this.agentId,
      textcard: {
        title,
        description,
        url,
        btntxt: buttonText
      }
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/message/send?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        }
      );

      const data = await response.json() as WeChatMessageResponse;

      if (data.errcode === 0) {
        return { success: true, msgId: data.msgid };
      }

      console.error('WeChat sendCardMessage error:', data.errmsg);
      return { success: false, error: data.errmsg };
    } catch (error: any) {
      console.error('WeChat sendCardMessage exception:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправляет простое текстовое сообщение
   */
  async sendTextMessage(
    wechatUserId: string,
    content: string
  ): Promise<{ success: boolean; msgId?: string; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { success: false, error: 'Failed to get access token' };
    }

    const message: TextMessage = {
      touser: wechatUserId,
      msgtype: 'text',
      agentid: this.agentId,
      text: { content }
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/message/send?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        }
      );

      const data = await response.json() as WeChatMessageResponse;

      if (data.errcode === 0) {
        return { success: true, msgId: data.msgid };
      }

      return { success: false, error: data.errmsg };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const wechatService = new WeChatService();
export default wechatService;
