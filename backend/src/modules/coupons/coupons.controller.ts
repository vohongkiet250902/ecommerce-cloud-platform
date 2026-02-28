import { Body, Controller, Post } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ApplyCouponDto } from './dto/coupon.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // User áp dụng mã khuyến mãi ở giỏ hàng
  @Post('apply')
  applyCoupon(@Body() dto: ApplyCouponDto) {
    return this.couponsService.calculateDiscount(dto);
  }
}
