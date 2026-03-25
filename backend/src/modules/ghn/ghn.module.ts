import { Module } from '@nestjs/common';
import { GhnService } from './ghn.service';
import { GhnController } from './ghn.controller';

@Module({
  controllers: [GhnController],
  providers: [GhnService],
  exports: [GhnService],
})
export class GhnModule {}
