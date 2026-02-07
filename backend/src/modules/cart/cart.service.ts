import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from './schemas/cart.schema';
import { UpsertCartItemDto, RemoveCartItemDto } from './dto/cart.dto';
import { OrdersService } from '../orders/orders.service';
import { Product } from '../products/schemas/product.schema';

type ExpandCartItem = {
  productId: string;
  sku: string;
  quantity: number;
  // enrichment (optional)
  name?: string;
  imageUrl?: string;
  price?: number;
  lineTotal?: number;
  availableStock?: number;
  isValid?: boolean;
};

@Injectable()
export class CartService {
  // constraints chống abuse
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
    const s = String(sku).trim();
    if (!s) throw new BadRequestException('sku không hợp lệ');
    return s;
  }

  private clampQty(qty: number) {
    if (!Number.isFinite(qty))
      throw new BadRequestException('quantity không hợp lệ');
    if (!Number.isInteger(qty))
      throw new BadRequestException('quantity phải là số nguyên');
    if (qty < 1) throw new BadRequestException('quantity phải >= 1');
    if (qty > this.MAX_QTY_PER_ITEM) {
      throw new BadRequestException(`quantity tối đa ${this.MAX_QTY_PER_ITEM}`);
    }
    return qty;
  }

  private mergeDuplicates(
    items: { productId: Types.ObjectId; sku: string; quantity: number }[],
  ) {
    const map = new Map<
      string,
      { productId: Types.ObjectId; sku: string; quantity: number }
    >();
    for (const it of items) {
      const key = `${it.productId.toString()}:${it.sku}`;
      const existing = map.get(key);
      if (existing) existing.quantity += it.quantity;
      else map.set(key, { ...it });
    }
    return Array.from(map.values());
  }

  private validateIdempotencyKey(key?: string) {
    if (!key) return undefined;
    const trimmed = String(key).trim();
    if (trimmed.length < 8 || trimmed.length > 128) {
      throw new BadRequestException('Idempotency-Key không hợp lệ');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      throw new BadRequestException('Idempotency-Key không hợp lệ');
    }
    return trimmed;
  }

  /**
   * Get or create cart (idempotent)
   */
  async getOrCreateCart(userId: string) {
    const uid = this.toObjectId(userId, 'userId');

    const cart = await this.cartModel.findOne({ userId: uid }).lean();
    if (cart) return cart;

    // avoid race: create then re-find if duplicate key
    try {
      return await this.cartModel.create({ userId: uid, items: [] });
    } catch (e: any) {
      if (e?.code === 11000) {
        const existing = await this.cartModel.findOne({ userId: uid }).lean();
        if (existing) return existing;
      }
      throw e;
    }
  }

  /**
   * Upsert item: set quantity (not increment)
   * - merge duplicates in DB safe way (read-modify-save) with optimistic safety
   */
  async upsertItem(userId: string, dto: UpsertCartItemDto) {
    const uid = this.toObjectId(userId, 'userId');
    const pid = this.toObjectId(dto.productId, 'productId');
    const sku = this.normalizeSku(dto.sku);
    const quantity = this.clampQty(dto.quantity);

    const cart = await this.getOrCreateCart(userId);

    // Load fresh document for safe edit
    const doc = await this.cartModel.findOne({ userId: uid });
    if (!doc) throw new NotFoundException('Không tìm thấy cart');

    // set or add
    const idx = doc.items.findIndex(
      (i) => i.productId.toString() === pid.toString() && i.sku === sku,
    );

    if (idx >= 0) {
      doc.items[idx].quantity = quantity;
    } else {
      if (doc.items.length >= this.MAX_ITEMS) {
        throw new BadRequestException(`Cart tối đa ${this.MAX_ITEMS} sản phẩm`);
      }
      doc.items.push({ productId: pid as any, sku, quantity } as any);
    }

    // merge duplicates just in case (defensive)
    doc.items = this.mergeDuplicates(
      doc.items.map((i) => ({
        productId: i.productId as any,
        sku: i.sku,
        quantity: i.quantity,
      })),
    ) as any;

    if (doc.items.length > this.MAX_ITEMS) {
      throw new BadRequestException(`Cart tối đa ${this.MAX_ITEMS} sản phẩm`);
    }

    await doc.save();
    return doc.toObject();
  }

  async removeItem(userId: string, dto: RemoveCartItemDto) {
    const uid = this.toObjectId(userId, 'userId');
    const pid = this.toObjectId(dto.productId, 'productId');
    const sku = this.normalizeSku(dto.sku);

    const updated = await this.cartModel.findOneAndUpdate(
      { userId: uid },
      { $pull: { items: { productId: pid, sku } } },
      { new: true },
    );

    if (!updated) throw new NotFoundException('Không tìm thấy cart');
    return updated.toObject();
  }

  async clear(userId: string) {
    const uid = this.toObjectId(userId, 'userId');
    const updated = await this.cartModel.findOneAndUpdate(
      { userId: uid },
      { $set: { items: [] } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Không tìm thấy cart');
    return updated.toObject();
  }

  /**
   * Get cart
   * expand=false: return raw cart items
   * expand=true: enrich with product name/price/stock for UI
   */
  async getCart(userId: string, expand = false) {
    const uid = this.toObjectId(userId, 'userId');
    const cart = await this.getOrCreateCart(userId);

    if (!expand) return cart;

    // Enrich: fetch products in one query
    const ids = cart.items.map((i: any) =>
      this.toObjectId(i.productId.toString(), 'productId'),
    );
    const uniqueIds = Array.from(new Set(ids.map((x) => x.toString()))).map(
      (x) => new Types.ObjectId(x),
    );

    const products = await this.productModel
      .find({ _id: { $in: uniqueIds } }, { name: 1, images: 1, variants: 1 })
      .lean();

    const productMap = new Map<string, any>();
    for (const p of products) productMap.set(p._id.toString(), p);

    const expandedItems: ExpandCartItem[] = cart.items.map((it: any) => {
      const p = productMap.get(it.productId.toString());
      if (!p) {
        return {
          productId: it.productId.toString(),
          sku: it.sku,
          quantity: it.quantity,
          isValid: false,
        };
      }

      const v = (p.variants as any[])?.find((x) => x.sku === it.sku);
      const price = v?.price;
      const stock = v?.stock;

      return {
        productId: it.productId.toString(),
        sku: it.sku,
        quantity: it.quantity,
        name: p.name,
        imageUrl: (p.images as any[])?.[0]?.url,
        price,
        lineTotal: typeof price === 'number' ? price * it.quantity : undefined,
        availableStock: stock,
        isValid: !!v,
      };
    });

    return {
      ...cart,
      items: expandedItems,
    };
  }

  /**
   * Checkout:
   * - validate cart not empty
   * - call OrdersService.create(userId, {items}, idempotencyKey)
   * - clear cart best-effort
   *
   * IMPORTANT: Idempotency-Key recommended (prevents double checkout)
   */
  async checkout(userId: string, idempotencyKey?: string) {
    const uid = this.toObjectId(userId, 'userId');
    const key = this.validateIdempotencyKey(idempotencyKey);

    const cartDoc = await this.cartModel.findOne({ userId: uid }).lean();
    if (!cartDoc || !cartDoc.items?.length) {
      throw new BadRequestException('Cart trống');
    }

    // normalize items for order service
    const orderItems = cartDoc.items.map((it: any) => ({
      productId: it.productId.toString(),
      sku: it.sku,
      quantity: it.quantity,
    }));

    // For safety: reuse order idempotency if provided
    const order = await this.ordersService.create(
      userId,
      { items: orderItems } as any,
      key ? `checkout_${key}` : undefined,
    );

    // best-effort clear (idempotent)
    await this.cartModel.updateOne({ userId: uid }, { $set: { items: [] } });

    return order;
  }
}
