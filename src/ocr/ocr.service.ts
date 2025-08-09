import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as Tesseract from 'tesseract.js';
import { DocumentService } from '../document/document.service';
import { OcrProgressService } from './ocr-progress.service';

@Injectable()
export class OcrService {
  constructor(private readonly documents: DocumentService, private readonly progress: OcrProgressService,) {}

  async extractText(documentId: number, userId: number) {
    const doc = await this.documents.getById(documentId, userId);

    if (!fs.existsSync(doc.path)) {
      throw new InternalServerErrorException('File not found on server');
    }

    try {
      const { data } = await Tesseract.recognize(doc.path, 'eng', {
        logger: (m) => console.log(m), 
      });

      await this.documents.updateExtractedText(doc.id, data.text);

      return {
        message: 'OCR completed successfully',
        documentId: doc.id,
        extractedText: data.text,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(`OCR processing failed: ${error.message}`);
    }
  }

  async clearOcrText(documentId: number, userId: number) {
    const doc = await this.documents.getById(documentId, userId);
    await this.documents.updateExtractedText(doc.id, null); 
    return { message: 'OCR text cleared' };
  }


  async startAsync(documentId: number, userId: number) {
    const doc = await this.documents.getById(documentId, userId);
    if (!fs.existsSync(doc.path)) {
      throw new InternalServerErrorException('File not found on server');
    }

    // Mark queued and immediately start in background
    this.progress.set(documentId, { status: 'queued', progress: 0, message: 'Queued' });

    void (async () => {
      try {
        this.progress.set(documentId, { status: 'running', message: 'Starting OCR', progress: 1 });

        const { data } = await Tesseract.recognize(doc.path, 'eng', {
          logger: (m) => {
            // m = { status: 'recognizing text', progress: 0.42 } etc.
            const pct = Math.round((m.progress ?? 0) * 100);
            this.progress.set(documentId, {
              status: 'running',
              progress: pct,
              message: m.status,
            });
          },
        });

        await this.documents.updateExtractedText(documentId, data.text);
        this.progress.set(documentId, { status: 'completed', progress: 100, message: 'Done' });
      } catch (err: any) {
        this.progress.set(documentId, { status: 'failed', error: err?.message || 'OCR failed' });
      }
    })();

    // Get the updated document with the extracted text
    await this.documents.getById(documentId, userId);

    // Return immediately; frontend will poll status endpoint
    return { 
      accepted: true,
      documentId,
      status: 'queued',
      statusEndpoint: `/documents/${documentId}/ocr/status`, 
    };
  }

  status(documentId: number) {
    return this.progress.get(documentId);
  }
}
