import { Injectable, OnModuleInit } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private client: MeiliSearch;

  constructor() {
    this.client = new MeiliSearch({
      host: 'http://localhost:7700',
      apiKey: 'EcommerceSearchKey_2026_SecretString',
    });
  }

  async onModuleInit() {
    const index = this.client.index('products');
    await index.updateSettings({
      searchableAttributes: ['name', 'description'],
      filterableAttributes: ['categoryId', 'brandId', 'price', 'isFeatured'],
      sortableAttributes: ['price', 'createdAt'],
    });
  }

  async addOrUpdateProduct(productData: any) {
    const document = {
      id: productData._id.toString(),
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      categoryId: productData.categoryId.toString(),
      brandId: productData.brandId.toString(),
      price: productData.variants?.[0]?.price || 0,
      image: productData.images?.[0]?.url || null,
      isFeatured: productData.isFeatured,
      createdAt: productData.createdAt,
    };
    return this.client
      .index('products')
      .addDocuments([document], { primaryKey: 'id' });
  }

  async removeProduct(productId: string) {
    return this.client.index('products').deleteDocument(productId);
  }

  async searchProducts(keyword: string, limit = 10) {
    return this.client.index('products').search(keyword, { limit });
  }
}
