import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export type LlmFailureReason =
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'model_not_found'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'network_error'
  | 'timeout'
  | 'empty_response'
  | 'upstream_error'
  | 'unknown';

export class LlmServiceError extends Error {
  readonly reason: LlmFailureReason;
  readonly userMessage: string;
  readonly debugMessage: string;
  readonly statusCode?: number;
  readonly raw?: any;

  constructor(input: {
    reason: LlmFailureReason;
    userMessage: string;
    debugMessage: string;
    statusCode?: number;
    raw?: any;
  }) {
    super(input.debugMessage);
    this.name = 'LlmServiceError';
    this.reason = input.reason;
    this.userMessage = input.userMessage;
    this.debugMessage = input.debugMessage;
    this.statusCode = input.statusCode;
    this.raw = input.raw;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

@Injectable()
export class LlmService {
  private client?: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_API_KEY');

    this.model =
      this.configService.get<string>('GEMINI_MODEL') ||
      'gemini-3.1-flash-lite-preview';

    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  getModel(): string {
    return this.model;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  private extractText(response: any): string {
    if (typeof response?.text === 'string' && response.text.trim()) {
      return response.text.trim();
    }

    const parts: string[] = [];

    for (const candidate of response?.candidates ?? []) {
      for (const part of candidate?.content?.parts ?? []) {
        if (typeof part?.text === 'string' && part.text.trim()) {
          parts.push(part.text);
        }
      }
    }

    return parts.join('\n').trim();
  }

  private summarizeRawError(error: any) {
    return {
      name: error?.name,
      message: error?.message,
      status: error?.status ?? error?.statusCode ?? error?.code,
      code: error?.code,
      type: error?.type ?? error?.details?.type,
      details: error?.details,
      cause: error?.cause?.message,
    };
  }

  private classifyError(error: any): LlmServiceError {
    const status =
      Number(error?.status ?? error?.statusCode ?? error?.code ?? 0) ||
      undefined;
    const code = String(error?.code ?? '').toLowerCase();
    const message = String(error?.message ?? 'Unknown Gemini error');
    const lowerMessage = message.toLowerCase();

    const raw = this.summarizeRawError(error);

    if (
      status === 401 ||
      status === 403 ||
      code === 'unauthenticated' ||
      code === 'permission_denied' ||
      lowerMessage.includes('api key not valid') ||
      lowerMessage.includes('invalid api key') ||
      lowerMessage.includes('permission denied') ||
      lowerMessage.includes('authentication')
    ) {
      return new LlmServiceError({
        reason: 'invalid_api_key',
        userMessage:
          'GEMINI_API_KEY không hợp lệ, hết hiệu lực, hoặc project chưa có quyền gọi Gemini API.',
        debugMessage: `Gemini authentication failed for model "${this.model}": ${message}`,
        statusCode: status,
        raw,
      });
    }

    if (
      status === 404 ||
      code === 'not_found' ||
      lowerMessage.includes('model not found') ||
      lowerMessage.includes('not found') ||
      lowerMessage.includes('unsupported model')
    ) {
      return new LlmServiceError({
        reason: 'model_not_found',
        userMessage: `Model Gemini "${this.model}" không tồn tại hoặc key hiện tại chưa được phép dùng model này.`,
        debugMessage: `Gemini model error for "${this.model}": ${message}`,
        statusCode: status,
        raw,
      });
    }

    if (
      status === 429 &&
      (code === 'resource_exhausted' ||
        lowerMessage.includes('quota') ||
        lowerMessage.includes('resource exhausted') ||
        lowerMessage.includes('data limit') ||
        lowerMessage.includes('billing'))
    ) {
      return new LlmServiceError({
        reason: 'quota_exceeded',
        userMessage:
          'Gemini đã hết quota free tier hoặc project đang chạm data limit/billing limit nên chưa sinh được câu trả lời AI.',
        debugMessage: `Gemini quota exceeded for model "${this.model}": ${message}`,
        statusCode: status,
        raw,
      });
    }

    if (
      status === 429 ||
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('too many requests')
    ) {
      return new LlmServiceError({
        reason: 'rate_limited',
        userMessage:
          'Gemini đang rate limit request nên tạm thời chưa sinh được câu trả lời AI.',
        debugMessage: `Gemini rate limited request for model "${this.model}": ${message}`,
        statusCode: status,
        raw,
      });
    }

    if (
      code === 'etimedout' ||
      code === 'timeout' ||
      status === 408 ||
      lowerMessage.includes('timed out') ||
      lowerMessage.includes('timeout')
    ) {
      return new LlmServiceError({
        reason: 'timeout',
        userMessage:
          'Request tới Gemini bị timeout nên chưa sinh được câu trả lời AI.',
        debugMessage: `Gemini timeout for model "${this.model}": ${message}`,
        statusCode: status,
        raw,
      });
    }

    if (
      code === 'enotfound' ||
      code === 'econnreset' ||
      code === 'econnrefused' ||
      code === 'eai_again' ||
      lowerMessage.includes('fetch failed') ||
      lowerMessage.includes('network') ||
      lowerMessage.includes('socket hang up') ||
      lowerMessage.includes('connection')
    ) {
      return new LlmServiceError({
        reason: 'network_error',
        userMessage:
          'Không kết nối được tới Gemini API nên chưa sinh được câu trả lời AI.',
        debugMessage: `Gemini network error for model "${this.model}": ${message}`,
        statusCode: status,
        raw,
      });
    }

    if (status && status >= 500) {
      return new LlmServiceError({
        reason: 'upstream_error',
        userMessage:
          'Gemini đang gặp lỗi phía máy chủ nên tạm thời chưa sinh được câu trả lời AI.',
        debugMessage: `Gemini upstream error for model "${this.model}": ${message}`,
        statusCode: status,
        raw,
      });
    }

    return new LlmServiceError({
      reason: 'unknown',
      userMessage:
        'Đã xảy ra lỗi chưa xác định khi gọi Gemini nên chưa sinh được câu trả lời AI.',
      debugMessage: `Unknown Gemini error for model "${this.model}": ${message}`,
      statusCode: status,
      raw,
    });
  }

  async generateText(input: {
    system: string;
    user: string;
    temperature?: number;
  }): Promise<string> {
    if (!this.client) {
      throw new LlmServiceError({
        reason: 'missing_api_key',
        userMessage:
          'Chưa cấu hình GEMINI_API_KEY nên phần sinh câu trả lời bằng AI đang tắt.',
        debugMessage:
          'Missing GEMINI_API_KEY. Gemini client was not initialized.',
      });
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: input.user,
        config: {
          systemInstruction: input.system,
          temperature: input.temperature ?? 0.2,
          candidateCount: 1,
          maxOutputTokens: 512,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });

      const text = this.extractText(response);

      if (!text) {
        throw new LlmServiceError({
          reason: 'empty_response',
          userMessage:
            'Gemini trả về response rỗng nên chưa tạo được câu trả lời AI.',
          debugMessage: `Gemini returned empty text for model "${this.model}".`,
          raw: { response },
        });
      }

      return text;
    } catch (error: any) {
      if (error instanceof LlmServiceError) {
        console.error('[LLM] generateText failed', {
          provider: 'gemini',
          reason: error.reason,
          model: this.model,
          statusCode: error.statusCode,
          debugMessage: error.debugMessage,
          raw: error.raw,
        });
        throw error;
      }

      const classified = this.classifyError(error);

      console.error('[LLM] generateText failed', {
        provider: 'gemini',
        reason: classified.reason,
        model: this.model,
        statusCode: classified.statusCode,
        debugMessage: classified.debugMessage,
        raw: classified.raw,
      });

      throw classified;
    }
  }
}
