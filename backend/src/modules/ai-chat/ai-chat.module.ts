import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchModule } from '../search/search.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { LlmService } from './services/llm.service';
import { ResponseGroundingService } from './services/response-grounding.service';
import { AiChatLog, AiChatLogSchema } from './schemas/ai-chat-log.schema';

@Module({
  imports: [
    ConfigModule,
    SearchModule,
    MongooseModule.forFeature([
      { name: AiChatLog.name, schema: AiChatLogSchema },
    ]),
  ],
  controllers: [AiChatController],
  providers: [AiChatService, LlmService, ResponseGroundingService],
  exports: [AiChatService],
})
export class AiChatModule {}
