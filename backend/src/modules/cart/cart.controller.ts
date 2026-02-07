import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { CartService } from './cart.service';
import {
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
  checkout(@Req() req, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.cartService.checkout(req.user.id, idempotencyKey);
  }
}
