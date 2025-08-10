import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { OcrService } from '../ocr/ocr.service';
import { DocumentModule } from 'src/document/document.module';
import { OcrProgressService } from '../ocr/ocr-progress.service';
import { PrismaModule } from 'src/prisma/prisma.module';


@Module({
  imports: [DocumentModule, PrismaModule],
  providers: [LlmService, OcrService, OcrProgressService],
  controllers: [LlmController],
})
export class LlmModule {}
