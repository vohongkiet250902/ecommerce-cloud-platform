import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from './schemas/cart.schema';
import { Product } from '../products/schemas/product.schema';
import { UpsertCartItemDto, RemoveCartItemDto } from './dto/cart.dto';
import { OrdersService } from '../orders/orders.service';

type ExpandedCartItem = {
  productId: string;
  sku: string;
  quantity: number;
  product?: {
    _id: string;
    name: string;
    slug: string;
    status: string;
    images: { url: string; publicId: string }[];
    categoryId: string;
    brandId: string;
  };
  variant?: {
    sku: string;
    price: number;
    stock: number;
    status: string;
    attributes: { key: string; value: string }[];
    image?: { url: string; publicId: string } | null;
  };
  lineTotal?: number;
};

@Injectable()
export class CartService {
  // guardrails nhỏ để tránh abuse
  private readonly MAX_ITEMS = 50;
  private readonly MAX_QTY_PER_ITEM = 999;

  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    private readonly ordersService: OrdersService,
  ) {}

  private toObjectId(id: string, field = 'id') {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`${field} không hợp lệ`);
    }
    return new Types.ObjectId(id);
  }

  private normalizeSku(sku: string) {
    const s = String(sku ?? '').trim();
    if (!s) throw new BadRequestException('sku không hợp lệ');
    return s;
  }

  private clampQty(qty: number) {
    if (!Number.isFinite(qty) || !Number.isInteger(qty)) {
      throw new BadRequestException('quantity phải là số nguyên');
    }
    if (qty < 1) throw new BadRequestException('quantity phải >= 1');
    if (qty > this.MAX_QTY_PER_ITEM) {
      throw new BadRequestException(`quantity tối đa ${this.MAX_QTY_PER_ITEM}`);
    }
    return qty;
  }

  private async getOrCreateCartDoc(userId: string) {
    const uid = this.toObjectId(userId, 'userId');

    // 1 cart / 1 user (unique index). Upsert để đảm bảo luôn có cart.
    const cart = await this.cartModel
      .findOneAndUpdate(
        { userId: uid },
        { $setOnInsert: { userId: uid, items: [] } },
        { new: true, upsert: true },
      )
      .exec();

    return cart;
  }

  /**
   * Validate product + sku tồn tại, product/variant active.
   * (Không check stock ở đây - stock check nằm ở OrdersService khi checkout)
   */
  private async assertValidProductSku(productId: Types.ObjectId, sku: string) {
    const p = await this.productModel
      .findById(productId)
      .select('name slug status images categoryId brandId variants')
      .lean()
      .exec();

    if (!p) throw new NotFoundException('Sản phẩm không tồn tại');
    if (p.status !== 'active') {
      throw new BadRequestException('Sản phẩm hiện không khả dụng');
    }

    const v = (p.variants || []).find((x: any) => x.sku === sku);
    if (!v) throw new BadRequestException('SKU không tồn tại');
    if ((v.status ?? 'active') !== 'active') {
      throw new BadRequestException('Biến thể hiện không khả dụng');
    }

    return { product: p, variant: v };
  }

  /**
   * Get cart của user
   * - expand=false: trả cart thô (items)
   * - expand=true : kèm product + variant + tính total
   */
  async getCart(userId: string, expand = false) {
    const cart = await this.getOrCreateCartDoc(userId);

    const plain = {
      _id: cart._id?.toString?.() ?? undefined,
      userId: cart.userId?.toString?.() ?? String(cart.userId),
      items: (cart.items || []).map((it: any) => ({
        productId: it.productId?.toString?.() ?? String(it.productId),
        sku: it.sku,
        quantity: it.quantity,
      })),
      createdAt: (cart as any).createdAt,
      updatedAt: (cart as any).updatedAt,
    };

    if (!expand) return plain;

    // expand: lấy tất cả products 1 lần
    const ids = plain.items.map((i) =>
      this.toObjectId(i.productId, 'productId'),
    );
    const products = await this.productModel
      .find({ _id: { $in: ids } })
      .select('name slug status images categoryId brandId variants')
      .lean()
      .exec();

    const map = new Map<string, any>();
    for (const p of products) map.set(String(p._id), p);

    const expandedItems: ExpandedCartItem[] = plain.items.map((it) => {
      const p = map.get(it.productId);
      const v = p?.variants?.find?.((x: any) => x.sku === it.sku);

      const productInfo = p
        ? {
            _id: String(p._id),
            name: p.name,
            slug: p.slug,
            status: p.status,
            images: p.images || [],
            categoryId: p.categoryId?.toString?.() ?? String(p.categoryId),
            brandId: p.brandId?.toString?.() ?? String(p.brandId),
          }
        : undefined;

      const variantInfo = v
        ? {
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            status: v.status ?? 'active',
            attributes: v.attributes || [],
            image: v.image ?? null,
          }
        : undefined;

      const lineTotal =
        typeof variantInfo?.price === 'number'
          ? variantInfo.price * it.quantity
          : undefined;

      return {
        ...it,
        product: productInfo,
        variant: variantInfo,
        lineTotal,
      };
    });

    const total = expandedItems.reduce(
      (sum, it) => sum + (it.lineTotal || 0),
      0,
    );

    return {
      ...plain,
      items: expandedItems,
      total,
    };
  }

  /**
   * Upsert item: set quantity
   * - nếu item đã có -> set quantity
   * - nếu chưa có -> add item
   */
  async upsertItem(userId: string, dto: UpsertCartItemDto) {
    const pid = this.toObjectId(dto.productId, 'productId');
    const sku = this.normalizeSku(dto.sku);
    const quantity = this.clampQty(dto.quantity);

    // validate product/sku
    await this.assertValidProductSku(pid, sku);

    const cart = await this.getOrCreateCartDoc(userId);

    // guardrail: limit số items
    const items = cart.items || [];
    const key = `${pid.toString()}:${sku}`;
    const idx = items.findIndex(
      (x: any) =>
        String(x.productId) === pid.toString() && String(x.sku) === sku,
    );

    if (idx >= 0) {
      items[idx].quantity = quantity;
    } else {
      if (items.length >= this.MAX_ITEMS) {
        throw new BadRequestException(`Cart tối đa ${this.MAX_ITEMS} items`);
      }
      items.push({ productId: pid, sku, quantity } as any);
    }

    cart.items = items as any;
    await cart.save();

    return this.getCart(userId, true);
  }

  async removeItem(userId: string, dto: RemoveCartItemDto) {
    const pid = this.toObjectId(dto.productId, 'productId');
    const sku = this.normalizeSku(dto.sku);

    const cart = await this.getOrCreateCartDoc(userId);
    const before = cart.items?.length || 0;

    cart.items = (cart.items || []).filter(
      (x: any) =>
        !(String(x.productId) === pid.toString() && String(x.sku) === sku),
    ) as any;

    if ((cart.items?.length || 0) !== before) {
      await cart.save();
    }

    return this.getCart(userId, true);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCartDoc(userId);
    cart.items = [] as any;
    await cart.save();
    return this.getCart(userId, true);
  }

  /**
   * Checkout toàn bộ cart -> tạo order pending -> clear cart
   * - idempotencyKey sẽ được OrdersService validate + enforce uniqueness
   */
  async checkout(userId: string, idempotencyKey?: string) {
    const cart = await this.getOrCreateCartDoc(userId);
    const items = (cart.items || []).map((it: any) => ({
      productId: it.productId?.toString?.() ?? String(it.productId),
      sku: this.normalizeSku(it.sku),
      quantity: this.clampQty(it.quantity),
    }));

    if (!items.length) {
      throw new BadRequestException('Giỏ hàng trống');
    }

    // Validate nhanh product/sku trước khi gọi OrdersService để lỗi rõ ràng hơn
    // (stock check sẽ do OrdersService.atomicDeductStock)
    for (const it of items) {
      const pid = this.toObjectId(it.productId, 'productId');
      await this.assertValidProductSku(pid, it.sku);
    }

    const order = await this.ordersService.create(userId, {
      items,
      idempotencyKey,
    });

    // Nếu tạo order thành công (hoặc idempotent trả lại order), clear cart.
    cart.items = [] as any;
    await cart.save();

    return order;
  }
}
