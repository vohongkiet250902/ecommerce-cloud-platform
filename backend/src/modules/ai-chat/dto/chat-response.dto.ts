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

export class ChatMetaDto {
  totalHits: number;
  retrievalStrategy?: string;
  normalizedQuery?: string;
  cleanQuery?: string;
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
