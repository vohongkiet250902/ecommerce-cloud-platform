import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Patch,
  Post, // Bổ sung Post
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { CartService } from './cart.service';
import {
  ApplyCouponCartDto, // Import DTO Coupon
  CheckoutCartDto, // Import DTO Checkout
  GetCartQueryDto,
  RemoveCartItemDto,
  UpsertCartItemDto,
} from './dto/cart.dto';

@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req, @Query() query: GetCartQueryDto) {
    return this.cartService.getCart(req.user.id, !!query.expand);
  }

  // === BỔ SUNG: API Áp dụng mã giảm giá ===
  @Post('coupon')
  applyCoupon(@Req() req, @Body() dto: ApplyCouponCartDto) {
    return this.cartService.applyCoupon(req.user.id, dto.code);
  }

  // === BỔ SUNG: API Xóa mã giảm giá khỏi giỏ hàng ===
  @Delete('coupon')
  removeCoupon(@Req() req) {
    return this.cartService.removeCoupon(req.user.id);
  }

  /**
   * Upsert item: set quantity
   */
  @Patch('items')
  upsertItem(@Req() req, @Body() dto: UpsertCartItemDto) {
    return this.cartService.upsertItem(req.user.id, dto);
  }

  @Delete('items')
  removeItem(@Req() req, @Body() dto: RemoveCartItemDto) {
    return this.cartService.removeItem(req.user.id, dto);
  }

  @Delete()
  clear(@Req() req) {
    return this.cartService.clear(req.user.id);
  }

  /**
   * Checkout toàn bộ cart -> tạo order pending -> clear cart
   */
  @Patch('checkout')
  checkout(
    @Req() req,
    @Body() dto: CheckoutCartDto, // Bổ sung nhận DTO để lấy phương thức thanh toán
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.cartService.checkout(
      req.user.id,
      dto.shippingInfo,
      dto.paymentMethod,
      idempotencyKey,
    );
  }
}
