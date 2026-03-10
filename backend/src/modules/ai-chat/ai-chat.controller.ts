import { Body, Controller, Post } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('ai/chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async chat(@Body() body: ChatRequestDto) {
    return this.aiChatService.chat(body);
  }
}
