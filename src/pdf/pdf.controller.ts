import {
  Controller,
  Get,
  UseGuards,
  Param,
  ParseIntPipe,
  Res,
  Request,
  InternalServerErrorException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentService } from '../document/document.service';
import { PdfService } from './pdf.service';

const uploadsDir = './uploads';

@UseGuards(AuthGuard('jwt'))
@Controller('pdf')
export class PdfController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly pdfService: PdfService
  ) {}

  @Get('generate/:documentId')
  async generatePdf(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Request() req,
    @Res() res: Response
  ) {
    try {
      // Get document and LLM session
      const doc = await this.documentService.getById(documentId, req.user.userId);
      const llmSession = await this.getLlmSession(documentId);

      const tempFilePath = path.join(uploadsDir, `temp-${Date.now()}.pdf`);

      let preparedLlmSession;
      if (llmSession) {
        preparedLlmSession = {
          questions: Array.isArray(llmSession.questions) 
            ? llmSession.questions.filter(q => typeof q === 'string') 
            : [],
          answers: Array.isArray(llmSession.answers) 
            ? llmSession.answers.filter(a => typeof a === 'string')
            : []
        };
      }
      
      await this.pdfService.generateDocumentPdf({
        documentPath: doc.path,
        extractedText: doc.extractedText || undefined,
        llmSession: preparedLlmSession, 
        outputPath: tempFilePath
      });

      // Send PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}-report.pdf"`);
      fs.createReadStream(tempFilePath).pipe(res);

      // Clean up temp file after sending
      res.on('finish', () => {
        fs.unlink(tempFilePath, () => {});
      });
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      throw new InternalServerErrorException('Failed to generate PDF');
    }
  }

  private async getLlmSession(documentId: number) {
    try {
      return await this.documentService.getLlmSession(documentId);
    } catch {
      return null;
    }
  }
}