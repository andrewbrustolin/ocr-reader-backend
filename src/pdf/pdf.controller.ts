import {
  Controller,
  Get,
  UseGuards,
  Param,
  ParseIntPipe,
  Res,
  Request,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentService } from '../document/document.service';
import { PdfService } from './pdf.service';

const uploadsDir = './uploads';

@UseGuards(AuthGuard('jwt'))
@Controller('documents/:documentId/pdf')
export class PdfController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly pdfService: PdfService
  ) {}

  @Get('generate')
async generatePdf(
  @Param('documentId', ParseIntPipe) documentId: number,
  @Request() req,
  @Res() res: Response
) {
  try {
    const doc = await this.documentService.getById(documentId, req.user.userId);
    
    // Verify document exists and has valid path
    if (!fs.existsSync(doc.path)) {
      throw new NotFoundException('Document file not found');
    }

    // Check file extension
    const ext = path.extname(doc.path).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      throw new BadRequestException('Unsupported file format for PDF generation');
    }

    const llmSession = await this.getLlmSession(documentId);
    const tempFilePath = path.join(uploadsDir, `temp-${Date.now()}.pdf`);

    let preparedLlmSession;
    if (llmSession) {
      preparedLlmSession = {
        questions: llmSession.questions?.filter(q => typeof q === 'string') || [],
        answers: llmSession.answers?.filter(a => typeof a === 'string') || []
      };
    }
    
    await this.pdfService.generateDocumentPdf({
        documentPath: doc.path,
        extractedText: doc.extractedText ?? undefined, // This converts null to undefined
        llmSession: preparedLlmSession, 
        outputPath: tempFilePath
        });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}-report.pdf"`);
    fs.createReadStream(tempFilePath).pipe(res);

    res.on('finish', () => {
      fs.unlink(tempFilePath, () => {});
    });
    
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw new InternalServerErrorException(err.message || 'Failed to generate PDF');
  }
}

  private async getLlmSession(documentId: number): Promise<{
    questions: string[];
    answers: string[];
    } | null> {
    try {
        const session = await this.documentService.getLlmSession(documentId);
        if (!session) return null;
        
        return {
        questions: Array.isArray(session.questions) 
            ? session.questions.filter((q: any) => typeof q === 'string')
            : [],
        answers: Array.isArray(session.answers) 
            ? session.answers.filter((a: any) => typeof a === 'string')
            : []
        };
    } catch {
        return null;
    }
    }
}