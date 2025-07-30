import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  create(@UploadedFile() file: Express.Multer.File) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new Error('Only PDF files are allowed');
    }
    return this.chatService.processAllPdfFiles(file);
  }

  @Post('ask-question')
  getAnswerFromVectorStore(@Body() input: any) {
    const { userQuery } = input;
    return this.chatService.getAnswerFromVectorStore(userQuery);
  }
}
