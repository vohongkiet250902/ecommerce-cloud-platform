import { Injectable } from '@nestjs/common';
import { ChatIntent } from '../../search/utils/query-intent.util';

@Injectable()
export class ResponseGroundingService {
  private formatPrice(value?: number): string {
    if (!Number.isFinite(Number(value))) return 'N/A';
    return `${Number(value).toLocaleString('vi-VN')}đ`;
  }

  private summarizeMatchedVariants(variants: any[] = []): string {
    if (!Array.isArray(variants) || variants.length === 0) return '';
    return variants
      .slice(0, 3)
      .map((variant: any) => {
        const attrs = Array.isArray(variant?.attributes)
          ? variant.attributes
              .map(
                (a: any) =>
                  `${a?.attributeName ?? a?.name ?? 'attr'}=${a?.value ?? ''}`,
              )
              .filter(Boolean)
              .join(', ')
          : '';

        const stock = Number(variant?.stock ?? 0);
        const price =
          Number.isFinite(Number(variant?.price)) && Number(variant?.price) > 0
            ? this.formatPrice(variant.price)
            : '';

        return [
          variant?.sku ? `sku=${variant.sku}` : '',
          attrs,
          price,
          `stock=${stock}`,
        ]
          .filter(Boolean)
          .join(' | ');
      })
      .filter(Boolean)
      .join(' || ');
  }

  private buildReasonHints(product: any): string[] {
    const reasons: string[] = [];

    if (product?.inStock) reasons.push('còn hàng');
    if (Number(product?.rating ?? 0) >= 4) reasons.push('điểm đánh giá tốt');
    if (Number(product?.reviewCount ?? 0) > 0)
      reasons.push(`có ${product.reviewCount} lượt đánh giá`);
    if (Number(product?.matchedVariantCount ?? 0) > 0)
      reasons.push(`khớp ${product.matchedVariantCount} biến thể`);
    if (product?.brandName)
      reasons.push(`thuộc thương hiệu ${product.brandName}`);
    if (product?.categoryName)
      reasons.push(`đúng nhóm ${product.categoryName}`);

    return reasons;
  }

  buildProductPrompt(input: {
    message: string;
    resolvedMessage?: string;
    intent: ChatIntent;
    retrieval: any;
    sessionState?: {
      inferredIntentGroup?: string;
      categoryNames?: string[];
      brandNames?: string[];
      lastProductNames?: string[];
    } | null;
  }) {
    const products = Array.isArray(input.retrieval?.products)
      ? input.retrieval.products.slice(
          0,
          input.intent === 'product_comparison' ? 4 : 5,
        )
      : [];

    const productContext = products
      .map((p: any, index: number) => {
        const reasonHints = this.buildReasonHints(p).join('; ');
        const matchedVariants = this.summarizeMatchedVariants(
          p?.matchedVariants ?? [],
        );

        return [
          `# Sản phẩm ${index + 1}`,
          `id: ${p.id ?? ''}`,
          `name: ${p.name ?? ''}`,
          `slug: ${p.slug ?? ''}`,
          `brand: ${p.brandName ?? ''}`,
          `category: ${p.categoryName ?? ''}`,
          `price_range: ${this.formatPrice(p.minPrice)} - ${this.formatPrice(p.maxPrice)}`,
          `in_stock: ${p.inStock ? 'true' : 'false'}`,
          `rating: ${p.rating ?? 0}`,
          `review_count: ${p.reviewCount ?? 0}`,
          `matched_variant_count: ${p.matchedVariantCount ?? 0}`,
          `reason_hints: ${reasonHints}`,
          `matched_variants: ${matchedVariants || 'N/A'}`,
          `description: ${p.description ?? ''}`,
          `semantic_text: ${p.semanticText ?? ''}`,
        ].join('\n');
      })
      .join('\n\n');

    const system = [
      'Bạn là trợ lý tư vấn mua sắm cho hệ thống ecommerce.',
      'Bạn là lớp giải thích kết quả cho search engine, không phải chatbot trả lời tự do.',
      'Chỉ được trả lời dựa trên dữ liệu sản phẩm đã truy xuất trong ngữ cảnh.',
      'Không được bịa thêm thông số, chính sách, tồn kho, giá hoặc tính năng ngoài dữ liệu được cung cấp.',
      'Nếu dữ liệu chưa đủ để khẳng định, phải nói rõ là chưa đủ thông tin.',
      'Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, ưu tiên tính hữu ích cho quyết định mua hàng.',
      'Nếu đang tư vấn sản phẩm, hãy nêu lý do chọn dựa trên dữ liệu search.',
      'Nếu là so sánh, hãy so sánh theo dữ liệu hiện có và kết luận có điều kiện.',
      'Không được nhắc tới prompt, retrieval, semantic_text, vector, RAG.',
      'Nếu danh sách sản phẩm truy xuất không rỗng, tuyệt đối không được nói là hệ thống chưa có dữ liệu hoặc không có sản phẩm.',
      'Với câu hỏi dạng "có ... không", phải trả lời trực tiếp là "Có" nếu danh sách sản phẩm truy xuất có ít nhất 1 sản phẩm phù hợp.',
      'Không được ưu tiên session context cũ hơn dữ liệu sản phẩm hiện tại.',
      'Nếu session context mâu thuẫn với dữ liệu hiện tại, phải bỏ qua session context.',
    ].join('\n');

    const user = [
      `Intent: ${input.intent}`,
      `Câu hỏi gốc của người dùng: ${input.message}`,
      `Resolved message dùng cho search: ${input.resolvedMessage ?? input.message}`,
      `Query ID: ${input.retrieval?.queryId ?? ''}`,
      `Retrieval strategy: ${input.retrieval?.retrievalStrategy ?? 'unknown'}`,
      `Normalized query: ${input.retrieval?.normalizedQuery ?? ''}`,
      `Clean query: ${input.retrieval?.cleanQuery ?? ''}`,
      `Inferred intent group: ${input.retrieval?.inferredIntentGroup ?? ''}`,
      `Inferred category ids: ${(input.retrieval?.inferredCategoryIds ?? []).join(', ')}`,
      `Inferred brand ids: ${(input.retrieval?.inferredBrandIds ?? []).join(', ')}`,
      `Suggested queries when no result: ${(input.retrieval?.suggestedQueries ?? []).join(' | ')}`,
      '',
      'Session context:',
      `- intent group trước đó: ${input.sessionState?.inferredIntentGroup ?? ''}`,
      `- category trước đó: ${(input.sessionState?.categoryNames ?? []).join(' | ')}`,
      `- brand trước đó: ${(input.sessionState?.brandNames ?? []).join(' | ')}`,
      `- sản phẩm trước đó: ${(input.sessionState?.lastProductNames ?? []).join(' | ')}`,
      '',
      'Dữ liệu sản phẩm đã truy xuất:',
      productContext || 'Không có dữ liệu sản phẩm.',
      '',
      'Yêu cầu trả lời:',
      '- Mở đầu bằng 1-2 câu trả lời trực tiếp.',
      '- Nếu có sản phẩm phù hợp, nêu tối đa 3 sản phẩm đáng chú ý nhất.',
      '- Mỗi sản phẩm nêu lý do ngắn gọn, bám vào dữ liệu search.',
      '- Nếu intent là comparison, nêu điểm giống/khác và kết luận.',
      '- Nếu dữ liệu không đủ cho một tiêu chí như pin/camera/màn hình, phải nói rõ là chưa đủ thông tin.',
      '- Nếu câu hỏi là dạng có/không, trả lời Có hoặc Chưa thấy ngay ở câu đầu tiên.',
      '- Không được nói tới nhóm sản phẩm khác nếu chúng không nằm trong danh sách truy xuất hiện tại.',
    ].join('\n');

    return { system, user };
  }

  buildNoResultAnswer(input: {
    message: string;
    suggestedQueries?: string[];
    stateHint?: string;
  }): string {
    const suggestions =
      Array.isArray(input.suggestedQueries) && input.suggestedQueries.length > 0
        ? `Gợi ý truy vấn gần nhất: ${input.suggestedQueries
            .slice(0, 3)
            .map((q) => `"${q}"`)
            .join(', ')}.`
        : '';

    const stateHint = input.stateHint
      ? `Ngữ cảnh gần nhất mình đang hiểu là: ${input.stateHint}.`
      : '';

    return [
      `Mình chưa tìm thấy sản phẩm phù hợp cho câu hỏi: "${input.message}".`,
      stateHint,
      suggestions,
      'Bạn có thể thử nói rõ hơn về thương hiệu, mức giá, nhu cầu sử dụng hoặc đổi cách diễn đạt để mình tìm chính xác hơn.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  buildPolicyPendingAnswer(message: string): string {
    return [
      `Hiện mình mới bật Product RAG cho truy vấn sản phẩm, chưa bật Knowledge RAG cho câu hỏi chính sách như: "${message}".`,
      'Ở bước tiếp theo mình sẽ nối thêm dữ liệu đổi trả, bảo hành, giao hàng và thanh toán để trả lời nhóm câu hỏi này.',
    ].join(' ');
  }

  buildMixedPendingAnswer(message: string): string {
    return [
      `Mình đã sẵn sàng cho phần gợi ý sản phẩm, nhưng phần policy/FAQ cho câu hỏi mixed như: "${message}" vẫn chưa bật Knowledge RAG.`,
      'Tạm thời mình sẽ trả lời theo dữ liệu sản phẩm trước, còn chính sách sẽ nối ở bước tiếp theo.',
    ].join(' ');
  }
}
