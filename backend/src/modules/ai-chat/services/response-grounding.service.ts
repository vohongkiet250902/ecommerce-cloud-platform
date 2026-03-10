import { Injectable } from '@nestjs/common';
import { ChatIntent } from '../../search/utils/query-intent.util';

@Injectable()
export class ResponseGroundingService {
  private formatPrice(value?: number): string {
    if (!Number.isFinite(Number(value))) return 'N/A';
    return `${Number(value).toLocaleString('vi-VN')}đ`;
  }

  buildProductPrompt(input: {
    message: string;
    intent: ChatIntent;
    retrieval: any;
  }) {
    const products = Array.isArray(input.retrieval?.products)
      ? input.retrieval.products.slice(
          0,
          input.intent === 'product_comparison' ? 4 : 5,
        )
      : [];

    const productContext = products
      .map((p: any, index: number) => {
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
          `description: ${p.description ?? ''}`,
          `semantic_text: ${p.semanticText ?? ''}`,
        ].join('\n');
      })
      .join('\n\n');

    const system = [
      'Bạn là trợ lý tư vấn mua sắm cho hệ thống ecommerce.',
      'Chỉ được trả lời dựa trên dữ liệu sản phẩm đã được truy xuất trong ngữ cảnh.',
      'Không được bịa thêm thông số, chính sách, tồn kho hoặc giá ngoài dữ liệu được cung cấp.',
      'Nếu dữ liệu chưa đủ để khẳng định một điểm nào đó, phải nói rõ là chưa đủ thông tin.',
      'Trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc rõ ràng.',
      'Nếu đang tư vấn sản phẩm, hãy nêu lý do chọn sản phẩm.',
      'Nếu là so sánh, hãy so sánh theo dữ liệu hiện có và kết luận có điều kiện.',
    ].join('\n');

    const user = [
      `Intent: ${input.intent}`,
      `Câu hỏi người dùng: ${input.message}`,
      `Retrieval strategy: ${input.retrieval?.retrievalStrategy ?? 'unknown'}`,
      `Normalized query: ${input.retrieval?.normalizedQuery ?? ''}`,
      `Clean query: ${input.retrieval?.cleanQuery ?? ''}`,
      '',
      'Dữ liệu sản phẩm đã truy xuất:',
      productContext || 'Không có dữ liệu sản phẩm.',
      '',
      'Yêu cầu trả lời:',
      '- Mở đầu bằng 1-2 câu trả lời trực tiếp.',
      '- Nếu có sản phẩm phù hợp, nêu tối đa 3 sản phẩm đáng chú ý nhất.',
      '- Mỗi sản phẩm nêu lý do ngắn gọn.',
      '- Nếu intent là comparison, nêu điểm giống/khác và kết luận.',
      '- Không nhắc đến “prompt”, “retrieval”, “semantic_text”.',
    ].join('\n');

    return { system, user };
  }

  buildNoResultAnswer(message: string): string {
    return [
      `Mình chưa tìm thấy sản phẩm phù hợp cho câu hỏi: "${message}".`,
      'Bạn có thể thử nói rõ hơn về thương hiệu, mức giá hoặc mục đích sử dụng để mình tìm chính xác hơn.',
    ].join(' ');
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
