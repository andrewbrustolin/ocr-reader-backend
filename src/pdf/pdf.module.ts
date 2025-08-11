import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { DocumentService } from '../document/document.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PdfController],
  providers: [PdfService, DocumentService, PrismaService],
  exports: [PdfService]
})
export class PdfModule {}