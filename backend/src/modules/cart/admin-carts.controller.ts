import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CartService } from './cart.service';
import { GetCartQueryDto, RemoveCartItemDto } from './dto/cart.dto';

@Roles('admin')
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin/carts')
export class AdminCartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Get cart của user bất kỳ (hỗ trợ CS/support)
   */
  @Get(':userId')
  getCartOfUser(
    @Param('userId') userId: string,
    @Query() query: GetCartQueryDto,
  ) {
    return this.cartService.getCart(userId, !!query.expand);
  }

  /**
   * Clear cart của user
   */
  @Delete(':userId')
  clearCartOfUser(@Param('userId') userId: string) {
    return this.cartService.clear(userId);
  }

  /**
   * Remove 1 item khỏi cart của user (optional)
   */
  @Delete(':userId/items')
  removeItemOfUser(
    @Param('userId') userId: string,
    @Body() dto: RemoveCartItemDto,
  ) {
    return this.cartService.removeItem(userId, dto);
  }
}
