import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';
import { DocumentModule } from '../document/document.module';
import { OcrProgressService } from './ocr-progress.service';

@Module({
  imports: [DocumentModule],
  controllers: [OcrController],
  providers: [OcrService, OcrProgressService],
})
export class OcrModule {}
