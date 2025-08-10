import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';

@Module({
  providers: [PdfService],
  exports: [PdfService],
  controllers: [PdfController]
})
export class PdfModule {}