import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SearchService } from '../search/search.service';
import {
  ChatIntent,
  detectChatIntent,
} from '../search/utils/query-intent.util';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { AiChatLog, AiChatLogDocument } from './schemas/ai-chat-log.schema';
import { LlmService, LlmServiceError } from './services/llm.service';
import { ResponseGroundingService } from './services/response-grounding.service';

type SessionStateSnapshot = {
  lastIntent?: string;
  lastMessage?: string;
  searchContext?: string;
  normalizedQuery?: string;
  cleanQuery?: string;
  inferredIntentGroup?: string;
  inferredCategoryIds?: string[];
  inferredBrandIds?: string[];
  categoryNames?: string[];
  brandNames?: string[];
  lastProductIds?: string[];
  lastProductNames?: string[];
};

type RetrievalLike = {
  queryId?: string;
  originalMessage?: string;
  normalizedQuery?: string;
  cleanQuery?: string;
  inferredCategoryIds?: string[];
  inferredBrandIds?: string[];
  inferredIntentGroup?: string;
  retrievalStrategy?: string;
  totalHits?: number;
  processingTimeMs?: number;
  suggestedQueries?: string[];
  products?: any[];
};

@Injectable()
export class AiChatService {
  constructor(
    private readonly searchService: SearchService,
    private readonly llmService: LlmService,
    private readonly groundingService: ResponseGroundingService,
    @InjectModel(AiChatLog.name)
    private readonly aiChatLogModel: Model<AiChatLogDocument>,
  ) {}

  private normalizeLoose(input: string): string {
    return String(input ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private uniqueStrings(values: Array<string | undefined | null>): string[] {
    return Array.from(
      new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean)),
    );
  }

  private includesAny(source: string, keywords: string[]): boolean {
    return keywords.some((kw) => source.includes(kw));
  }

  private compactQueryParts(parts: string[]): string {
    return this.uniqueStrings(parts).join(' ').replace(/\s+/g, ' ').trim();
  }

  private mapProducts(products: any[] = [], limit = 3) {
    return products.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      image: p.image ?? null,
      minPrice: p.minPrice ?? 0,
      maxPrice: p.maxPrice ?? 0,
      inStock: p.inStock ?? false,
      rating: p.rating ?? 0,
      reviewCount: p.reviewCount ?? 0,
      brandId: p.brandId,
      brandName: p.brandName,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
    }));
  }

  private formatDebugError(error: unknown) {
    if (error instanceof LlmServiceError) {
      return {
        reason: error.reason,
        userMessage: error.userMessage,
        debugMessage: error.debugMessage,
        statusCode: error.statusCode,
        raw: error.raw,
      };
    }

    const anyError = error as any;
    return {
      reason: 'unknown',
      userMessage: 'Đã xảy ra lỗi chưa xác định khi sinh câu trả lời bằng AI.',
      debugMessage: anyError?.message ?? String(anyError),
      statusCode: anyError?.status ?? anyError?.statusCode,
      raw: {
        name: anyError?.name,
        code: anyError?.code,
        type: anyError?.type,
      },
    };
  }

  private async getLatestSessionState(
    sessionId?: string,
  ): Promise<SessionStateSnapshot | null> {
    if (!sessionId) return null;

    const latest = await this.aiChatLogModel
      .findOne({ sessionId })
      .sort({ timestamp: -1 })
      .lean<any>();

    return latest?.stateSnapshot ?? null;
  }

  private isLikelyFollowUpMessage(message: string): boolean {
    const normalized = this.normalizeLoose(message);

    const followUpKeywords = [
      'uu tien',
      're hon',
      'tot hon',
      'manh hon',
      'pin tot hon',
      'camera tot hon',
      'man hinh tot hon',
      'con nao',
      'cai nao',
      'mau nao',
      'loai nao',
      'may nao',
      'san pham nao',
      'so sanh',
      'them lua chon',
      'co mau nao',
      'co ban nao',
      'ban nao',
      'con nay',
      'cai nay',
      'mau nay',
      'loai nay',
      'con kia',
      'cai kia',
      'them',
    ];

    const explicitSearchSignals = [
      'dien thoai',
      'iphone',
      'samsung',
      'xiaomi',
      'oppo',
      'vivo',
      'realme',
      'tai nghe',
      'airpods',
      'dong ho',
      'watch',
      'laptop',
      'macbook',
      'tablet',
      'ipad',
      'phu kien',
      'sac',
      'cap',
      'powerbank',
    ];

    const hasPriceSignal =
      /\b(duoi|tren|tu|den|tam|khoang)\b/.test(normalized) ||
      /\b\d+\s*(trieu|triệu|k|nghin|ngan)\b/.test(normalized);

    const hasExplicitSearchSignal =
      this.includesAny(normalized, explicitSearchSignals) || hasPriceSignal;

    if (this.includesAny(normalized, followUpKeywords)) {
      return true;
    }

    return normalized.length <= 80 && !hasExplicitSearchSignal;
  }

  private buildResolvedMessage(input: {
    message: string;
    intent: ChatIntent;
    sessionState?: SessionStateSnapshot | null;
  }) {
    const originalMessage = String(input.message ?? '').trim();
    const sessionState = input.sessionState;

    if (!sessionState) {
      return {
        resolvedMessage: originalMessage,
        sessionStateUsed: false,
      };
    }

    const likelyFollowUp = this.isLikelyFollowUpMessage(originalMessage);
    if (!likelyFollowUp) {
      return {
        resolvedMessage: originalMessage,
        sessionStateUsed: false,
      };
    }

    const parts: string[] = [];

    if (
      input.intent === 'product_comparison' &&
      Array.isArray(sessionState.lastProductNames) &&
      sessionState.lastProductNames.length > 0
    ) {
      parts.push(sessionState.lastProductNames.slice(0, 4).join(' '));
    }

    if (sessionState.searchContext) {
      parts.push(sessionState.searchContext);
    } else {
      parts.push(
        ...(sessionState.categoryNames ?? []),
        ...(sessionState.brandNames ?? []),
      );
    }

    parts.push(originalMessage);

    const resolvedMessage = this.compactQueryParts(parts) || originalMessage;

    return {
      resolvedMessage,
      sessionStateUsed: resolvedMessage !== originalMessage,
    };
  }

  private buildStateSnapshot(input: {
    message: string;
    intent: ChatIntent;
    retrieval?: RetrievalLike;
    products?: any[];
  }): SessionStateSnapshot {
    const products = Array.isArray(input.products) ? input.products : [];

    const categoryNames = this.uniqueStrings(
      products.map((p) => p?.categoryName),
    );
    const brandNames = this.uniqueStrings(products.map((p) => p?.brandName));
    const lastProductIds = this.uniqueStrings(products.map((p) => p?.id));
    const lastProductNames = this.uniqueStrings(products.map((p) => p?.name));

    const searchContext =
      this.compactQueryParts([
        input.retrieval?.cleanQuery ?? '',
        categoryNames[0] ?? '',
        brandNames[0] ?? '',
      ]) || input.message;

    return {
      lastIntent: input.intent,
      lastMessage: input.message,
      searchContext,
      normalizedQuery: input.retrieval?.normalizedQuery ?? '',
      cleanQuery: input.retrieval?.cleanQuery ?? '',
      inferredIntentGroup: input.retrieval?.inferredIntentGroup ?? '',
      inferredCategoryIds: input.retrieval?.inferredCategoryIds ?? [],
      inferredBrandIds: input.retrieval?.inferredBrandIds ?? [],
      categoryNames,
      brandNames,
      lastProductIds,
      lastProductNames,
    };
  }

  private summarizeStateForResponse(state?: SessionStateSnapshot | null):
    | {
        lastIntent?: string;
        inferredIntentGroup?: string;
        categoryNames?: string[];
        brandNames?: string[];
        lastProductNames?: string[];
      }
    | undefined {
    if (!state) return undefined;

    return {
      lastIntent: state.lastIntent,
      inferredIntentGroup: state.inferredIntentGroup,
      categoryNames: state.categoryNames ?? [],
      brandNames: state.brandNames ?? [],
      lastProductNames: state.lastProductNames ?? [],
    };
  }

  private async writeLog(input: {
    message: string;
    intent: string;
    queryId?: string;
    retrievalMode?: string;
    totalHits?: number;
    answer: string;
    sessionId?: string;
    userId?: string;
    normalizedQuery?: string;
    cleanQuery?: string;
    resolvedMessage?: string;
    inferredIntentGroup?: string;
    inferredCategoryIds?: string[];
    inferredBrandIds?: string[];
    suggestedQueries?: string[];
    retrievedProductIds?: string[];
    retrievedKnowledgeIds?: string[];
    fallbackUsed?: boolean;
    llmUsed?: boolean;
    llmModel?: string;
    llmErrorReason?: string;
    stateSnapshot?: SessionStateSnapshot;
  }) {
    await this.aiChatLogModel.create({
      message: input.message,
      intent: input.intent,
      queryId: input.queryId,
      retrievalMode: input.retrievalMode,
      totalHits: input.totalHits ?? 0,
      answer: input.answer,
      sessionId: input.sessionId,
      userId: input.userId,
      normalizedQuery: input.normalizedQuery,
      cleanQuery: input.cleanQuery,
      resolvedMessage: input.resolvedMessage,
      inferredIntentGroup: input.inferredIntentGroup,
      inferredCategoryIds: input.inferredCategoryIds ?? [],
      inferredBrandIds: input.inferredBrandIds ?? [],
      suggestedQueries: input.suggestedQueries ?? [],
      retrievedProductIds: input.retrievedProductIds ?? [],
      retrievedKnowledgeIds: input.retrievedKnowledgeIds ?? [],
      fallbackUsed: Boolean(input.fallbackUsed),
      llmUsed: Boolean(input.llmUsed),
      llmModel: input.llmModel,
      llmErrorReason: input.llmErrorReason,
      stateSnapshot: input.stateSnapshot,
      timestamp: new Date(),
    });
  }

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const message = String(dto.message ?? '').trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }

    const intent: ChatIntent = detectChatIntent(message);
    const latestSessionState = await this.getLatestSessionState(dto.sessionId);

    const { resolvedMessage, sessionStateUsed } = this.buildResolvedMessage({
      message,
      intent,
      sessionState: latestSessionState,
    });

    if (intent === 'policy_question') {
      const answer = this.groundingService.buildPolicyPendingAnswer(message);
      const stateSnapshot = this.buildStateSnapshot({
        message,
        intent,
        retrieval: {
          normalizedQuery: '',
          cleanQuery: '',
          inferredIntentGroup: '',
          inferredCategoryIds: [],
          inferredBrandIds: [],
        },
        products: [],
      });

      await this.writeLog({
        message,
        intent,
        answer,
        sessionId: dto.sessionId,
        userId: dto.userId,
        resolvedMessage,
        retrievedProductIds: [],
        retrievedKnowledgeIds: [],
        suggestedQueries: [],
        fallbackUsed: true,
        llmUsed: false,
        llmModel: this.llmService.getModel(),
        stateSnapshot,
      });

      return {
        intent,
        answer,
        products: [],
        sources: {
          productIds: [],
          knowledgeIds: [],
        },
        meta: {
          totalHits: 0,
          resolvedMessage,
          sessionStateUsed,
          sessionState: this.summarizeStateForResponse(latestSessionState),
          knowledgeEnabled: false,
          fallbackUsed: true,
          llmUsed: false,
          llmModel: this.llmService.getModel(),
        },
      };
    }

    const retrieval: RetrievalLike = await this.searchService.retrieveForAi({
      message: resolvedMessage,
      limit: intent === 'product_comparison' ? 4 : 5,
      userId: dto.userId,
      sessionId: dto.sessionId,
    });

    const products = Array.isArray(retrieval?.products)
      ? retrieval.products
      : [];
    const productIds = products.map((p: any) => p.id);
    const suggestedQueries = Array.isArray(retrieval?.suggestedQueries)
      ? retrieval.suggestedQueries
      : [];

    if (products.length === 0) {
      const stateHint =
        sessionStateUsed && latestSessionState
          ? this.compactQueryParts([
              ...(latestSessionState.categoryNames ?? []),
              ...(latestSessionState.brandNames ?? []),
            ])
          : '';

      const answer = this.groundingService.buildNoResultAnswer({
        message,
        suggestedQueries,
        stateHint,
      });

      const stateSnapshot = this.buildStateSnapshot({
        message,
        intent,
        retrieval,
        products: [],
      });

      await this.writeLog({
        message,
        intent,
        answer,
        queryId: retrieval?.queryId,
        retrievalMode: retrieval?.retrievalStrategy,
        totalHits: retrieval?.totalHits ?? 0,
        sessionId: dto.sessionId,
        userId: dto.userId,
        normalizedQuery: retrieval?.normalizedQuery,
        cleanQuery: retrieval?.cleanQuery,
        resolvedMessage,
        inferredIntentGroup: retrieval?.inferredIntentGroup,
        inferredCategoryIds: retrieval?.inferredCategoryIds ?? [],
        inferredBrandIds: retrieval?.inferredBrandIds ?? [],
        suggestedQueries,
        retrievedProductIds: [],
        retrievedKnowledgeIds: [],
        fallbackUsed: true,
        llmUsed: false,
        llmModel: this.llmService.getModel(),
        stateSnapshot,
      });

      return {
        intent,
        answer,
        products: [],
        sources: {
          productIds: [],
          knowledgeIds: [],
        },
        meta: {
          totalHits: retrieval?.totalHits ?? 0,
          retrievalStrategy: retrieval?.retrievalStrategy,
          normalizedQuery: retrieval?.normalizedQuery,
          cleanQuery: retrieval?.cleanQuery,
          queryId: retrieval?.queryId,
          suggestedQueries,
          inferredIntentGroup: retrieval?.inferredIntentGroup,
          inferredCategoryIds: retrieval?.inferredCategoryIds ?? [],
          inferredBrandIds: retrieval?.inferredBrandIds ?? [],
          resolvedMessage,
          sessionStateUsed,
          sessionState: this.summarizeStateForResponse(latestSessionState),
          processingTimeMs: retrieval?.processingTimeMs ?? 0,
          knowledgeEnabled: false,
          fallbackUsed: true,
          llmUsed: false,
          llmModel: this.llmService.getModel(),
        },
      };
    }

    const prefix =
      intent === 'mixed'
        ? `${this.groundingService.buildMixedPendingAnswer(message)}\n\n`
        : '';

    const prompt = this.groundingService.buildProductPrompt({
      message,
      resolvedMessage,
      intent,
      retrieval,
      sessionState: sessionStateUsed ? latestSessionState : null,
    });

    let answer = '';
    let fallbackUsed = false;
    let llmUsed = false;
    let llmErrorReason: string | undefined;

    try {
      const llmAnswer = await this.llmService.generateText({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
      });

      answer = `${prefix}${llmAnswer}`.trim();
      llmUsed = true;
    } catch (error) {
      fallbackUsed = true;
      llmUsed = false;

      const llmError = this.formatDebugError(error);
      llmErrorReason = llmError.reason;

      console.error('[AI CHAT] LLM generation failed', {
        reason: llmError.reason,
        userMessage: llmError.userMessage,
        debugMessage: llmError.debugMessage,
        statusCode: llmError.statusCode,
        model: this.llmService.getModel(),
        configured: this.llmService.isConfigured(),
        sessionId: dto.sessionId,
        userId: dto.userId,
        intent,
        retrievalStrategy: retrieval?.retrievalStrategy,
        totalHits: retrieval?.totalHits ?? 0,
        message,
        resolvedMessage,
        raw: llmError.raw,
      });

      const visibleProducts = this.mapProducts(
        products,
        intent === 'product_comparison' ? 4 : 3,
      );

      const simpleLines = visibleProducts.map((p, index) => {
        return `${index + 1}. ${p.name} (${p.brandName ?? 'N/A'}) - ${Number(
          p.minPrice ?? 0,
        ).toLocaleString('vi-VN')}đ`;
      });

      answer = [
        prefix.trim(),
        'Mình đã tìm được một số sản phẩm phù hợp:',
        ...simpleLines,
        suggestedQueries.length > 0
          ? `Bạn cũng có thể thử các truy vấn: ${suggestedQueries
              .slice(0, 3)
              .map((q) => `"${q}"`)
              .join(', ')}`
          : '',
        `Lý do chưa sinh được câu trả lời bằng AI: ${llmError.userMessage}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    const stateSnapshot = this.buildStateSnapshot({
      message,
      intent,
      retrieval,
      products,
    });

    await this.writeLog({
      message,
      intent,
      answer,
      queryId: retrieval?.queryId,
      retrievalMode: retrieval?.retrievalStrategy,
      totalHits: retrieval?.totalHits ?? 0,
      sessionId: dto.sessionId,
      userId: dto.userId,
      normalizedQuery: retrieval?.normalizedQuery,
      cleanQuery: retrieval?.cleanQuery,
      resolvedMessage,
      inferredIntentGroup: retrieval?.inferredIntentGroup,
      inferredCategoryIds: retrieval?.inferredCategoryIds ?? [],
      inferredBrandIds: retrieval?.inferredBrandIds ?? [],
      suggestedQueries,
      retrievedProductIds: productIds,
      retrievedKnowledgeIds: [],
      fallbackUsed,
      llmUsed,
      llmModel: this.llmService.getModel(),
      llmErrorReason,
      stateSnapshot,
    });

    return {
      intent,
      answer,
      products: this.mapProducts(
        products,
        intent === 'product_comparison' ? 4 : 3,
      ),
      sources: {
        productIds,
        knowledgeIds: [],
      },
      meta: {
        totalHits: retrieval?.totalHits ?? 0,
        retrievalStrategy: retrieval?.retrievalStrategy,
        normalizedQuery: retrieval?.normalizedQuery,
        cleanQuery: retrieval?.cleanQuery,
        queryId: retrieval?.queryId,
        suggestedQueries,
        inferredIntentGroup: retrieval?.inferredIntentGroup,
        inferredCategoryIds: retrieval?.inferredCategoryIds ?? [],
        inferredBrandIds: retrieval?.inferredBrandIds ?? [],
        resolvedMessage,
        sessionStateUsed,
        sessionState: this.summarizeStateForResponse(latestSessionState),
        processingTimeMs: retrieval?.processingTimeMs ?? 0,
        knowledgeEnabled: false,
        fallbackUsed,
        llmUsed,
        llmModel: this.llmService.getModel(),
        llmErrorReason,
      },
    };
  }
}
