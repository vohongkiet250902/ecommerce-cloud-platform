export class ChatProductDto {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string | null;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
}

export class ChatSourcesDto {
  productIds: string[];
  knowledgeIds: string[];
}

export class ChatSessionStateDto {
  lastIntent?: string;
  inferredIntentGroup?: string;
  categoryNames?: string[];
  brandNames?: string[];
  lastProductNames?: string[];
}

export class ChatMetaDto {
  totalHits: number;
  retrievalStrategy?: string;
  normalizedQuery?: string;
  cleanQuery?: string;

  queryId?: string;
  suggestedQueries?: string[];

  inferredIntentGroup?: string;
  inferredCategoryIds?: string[];
  inferredBrandIds?: string[];

  resolvedMessage?: string;
  sessionStateUsed?: boolean;
  sessionState?: ChatSessionStateDto;

  processingTimeMs?: number;

  llmUsed?: boolean;
  llmModel?: string;
  llmErrorReason?: string;

  knowledgeEnabled: boolean;
  fallbackUsed?: boolean;
}

export class ChatResponseDto {
  intent: string;
  answer: string;
  products: ChatProductDto[];
  sources: ChatSourcesDto;
  meta: ChatMetaDto;
}
