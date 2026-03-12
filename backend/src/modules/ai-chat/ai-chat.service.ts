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

@Injectable()
export class AiChatService {
  constructor(
    private readonly searchService: SearchService,
    private readonly llmService: LlmService,
    private readonly groundingService: ResponseGroundingService,
    @InjectModel(AiChatLog.name)
    private readonly aiChatLogModel: Model<AiChatLogDocument>,
  ) {}

  private mapProducts(products: any[] = []) {
    return products.slice(0, 3).map((p) => ({
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

  private async writeLog(input: {
    message: string;
    intent: string;
    retrievalMode?: string;
    totalHits?: number;
    answer: string;
    sessionId?: string;
    userId?: string;
    retrievedProductIds?: string[];
    retrievedKnowledgeIds?: string[];
    fallbackUsed?: boolean;
  }) {
    await this.aiChatLogModel.create({
      message: input.message,
      intent: input.intent,
      retrievalMode: input.retrievalMode,
      totalHits: input.totalHits ?? 0,
      answer: input.answer,
      sessionId: input.sessionId,
      userId: input.userId,
      retrievedProductIds: input.retrievedProductIds ?? [],
      retrievedKnowledgeIds: input.retrievedKnowledgeIds ?? [],
      fallbackUsed: Boolean(input.fallbackUsed),
      timestamp: new Date(),
    });
  }

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const message = String(dto.message ?? '').trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }

    const intent: ChatIntent = detectChatIntent(message);

    if (intent === 'policy_question') {
      const answer = this.groundingService.buildPolicyPendingAnswer(message);

      await this.writeLog({
        message,
        intent,
        answer,
        sessionId: dto.sessionId,
        userId: dto.userId,
        retrievedProductIds: [],
        retrievedKnowledgeIds: [],
        fallbackUsed: true,
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
          knowledgeEnabled: false,
          fallbackUsed: true,
        },
      };
    }

    const retrieval = await this.searchService.retrieveForAi({
      message,
      limit: intent === 'product_comparison' ? 4 : 5,
      userId: dto.userId,
      sessionId: dto.sessionId,
    });

    const products = Array.isArray(retrieval?.products)
      ? retrieval.products
      : [];
    const productIds = products.map((p: any) => p.id);

    if (products.length === 0) {
      const answer = this.groundingService.buildNoResultAnswer(message);

      await this.writeLog({
        message,
        intent,
        answer,
        retrievalMode: retrieval?.retrievalStrategy,
        totalHits: retrieval?.totalHits ?? 0,
        sessionId: dto.sessionId,
        userId: dto.userId,
        retrievedProductIds: [],
        retrievedKnowledgeIds: [],
        fallbackUsed: true,
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
          knowledgeEnabled: false,
          fallbackUsed: true,
        },
      };
    }

    const prefix =
      intent === 'mixed'
        ? `${this.groundingService.buildMixedPendingAnswer(message)}\n\n`
        : '';

    const prompt = this.groundingService.buildProductPrompt({
      message,
      intent,
      retrieval,
    });

    let answer = '';
    let fallbackUsed = false;

    try {
      const llmAnswer = await this.llmService.generateText({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
      });

      answer = `${prefix}${llmAnswer}`.trim();
    } catch (error) {
      fallbackUsed = true;

      const llmError = this.formatDebugError(error);

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
        raw: llmError.raw,
      });

      const top3 = this.mapProducts(products);
      const simpleLines = top3.map((p, index) => {
        return `${index + 1}. ${p.name} (${p.brandName ?? 'N/A'}) - ${Number(
          p.minPrice ?? 0,
        ).toLocaleString('vi-VN')}đ`;
      });

      answer = [
        prefix.trim(),
        'Mình đã tìm được một số sản phẩm phù hợp:',
        ...simpleLines,
        `Lý do chưa sinh được câu trả lời bằng AI: ${llmError.userMessage}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    await this.writeLog({
      message,
      intent,
      answer,
      retrievalMode: retrieval?.retrievalStrategy,
      totalHits: retrieval?.totalHits ?? 0,
      sessionId: dto.sessionId,
      userId: dto.userId,
      retrievedProductIds: productIds,
      retrievedKnowledgeIds: [],
      fallbackUsed,
    });

    return {
      intent,
      answer,
      products: this.mapProducts(products),
      sources: {
        productIds,
        knowledgeIds: [],
      },
      meta: {
        totalHits: retrieval?.totalHits ?? 0,
        retrievalStrategy: retrieval?.retrievalStrategy,
        normalizedQuery: retrieval?.normalizedQuery,
        cleanQuery: retrieval?.cleanQuery,
        knowledgeEnabled: false,
        fallbackUsed,
      },
    };
  }
}
