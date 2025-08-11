import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  async generateDocumentPdf(options: {
    documentPath: string;
    extractedText?: string;
    llmSession?: {
      questions: string[];
      answers: string[];
    };
    outputPath: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true // Important for page numbers
        });
        
        const writeStream = fs.createWriteStream(options.outputPath);
        pdfDoc.pipe(writeStream);

        // Add document image on first page
        if (fs.existsSync(options.documentPath)) {
          this.addDocumentImagePage(pdfDoc, options.documentPath);
          pdfDoc.addPage(); // Move to next page for OCR text
        }

        // Add OCR text on second page
        if (options.extractedText) {
          this.addOcrTextPage(pdfDoc, options.extractedText);
          pdfDoc.addPage(); // Move to next page for LLM content
        }

        // Add LLM session if exists on third page
        if (options.llmSession) {
          this.addLlmSessionPages(pdfDoc, options.llmSession);
        }

        // Add page numbers
        this.addPageNumbers(pdfDoc);

        pdfDoc.end();

        writeStream.on('finish', () => resolve(options.outputPath));
        writeStream.on('error', reject);
        
      } catch (err) {
        reject(err);
      }
    });
  }

  private addDocumentImagePage(pdfDoc: PDFKit.PDFDocument, imagePath: string) {
  try {
    pdfDoc.font('Helvetica-Bold')
      .fontSize(18)
      .text('Original Document', { align: 'center' });
    
    pdfDoc.moveDown(0.5);
    
    const imageWidth = 500;
    const imageHeight = 400;
    const xPos = (pdfDoc.page.width - imageWidth) / 2;
    
    pdfDoc.rect(xPos - 5, pdfDoc.y, imageWidth + 10, imageHeight + 10)
      .stroke('#cccccc');
    
    // Add try-catch for image loading
    try {
      pdfDoc.image(imagePath, xPos, pdfDoc.y + 5, {
        width: imageWidth,
        height: imageHeight,
        align: 'center',
        valign: 'center'
      });
    } catch (imageError) {
      console.error('Error loading image:', imageError);
      pdfDoc.text('(Could not load original document image)', {
        width: imageWidth,
        align: 'center'
      });
    }
    
    pdfDoc.moveDown(imageHeight / 72 + 2);
  } catch (err) {
    console.error('Error adding document image page:', err);
    throw err;
  }
}

  private addOcrTextPage(pdfDoc: PDFKit.PDFDocument, extractedText: string) {
    // Header
    pdfDoc.font('Helvetica-Bold')
      .fontSize(18)
      .text('Extracted Text', { align: 'center' });
    
    pdfDoc.moveDown(0.5);
    
    // Text content with styling
    pdfDoc.font('Helvetica')
      .fontSize(11)
      .text(extractedText, {
        width: 500,
        align: 'left',
        indent: 20,
        columns: 1,
        height: 600,
        ellipsis: false
      });
  }

  private addLlmSessionPages(pdfDoc: PDFKit.PDFDocument, llmSession: {
    questions: string[];
    answers: string[];
  }) {
    // Header
    pdfDoc.font('Helvetica-Bold')
      .fontSize(18)
      .text('Document Analysis', { align: 'center' });
    
    pdfDoc.moveDown(1);

    // Contextualization section
    if (llmSession?.answers[0]) {
      pdfDoc.font('Helvetica-Bold')
        .fontSize(14)
        .text('Contextual Summary:', { underline: true });
      
      pdfDoc.moveDown(0.5);
      
      pdfDoc.font('Helvetica')
        .fontSize(12)
        .text(llmSession.answers[0], {
          width: 500,
          align: 'left',
          indent: 20,
          lineGap: 5
        });
      
      pdfDoc.moveDown(1.5);
    }

    // Q&A section
    if (llmSession?.questions.length > 1) {
      pdfDoc.font('Helvetica-Bold')
        .fontSize(14)
        .text('Question & Answer History:', { underline: true });
      
      pdfDoc.moveDown(0.5);

      for (let i = 1; i < llmSession.questions.length; i++) {
        // Question
        pdfDoc.font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#2c5282') // Blue color for questions
          .text(`Q${i}: ${llmSession.questions[i]}`, {
            width: 500,
            indent: 10
          });
        
        pdfDoc.moveDown(0.3);
        
        // Answer
        if (llmSession.answers[i]) {
          pdfDoc.font('Helvetica')
            .fontSize(11)
            .fillColor('#4a5568') // Gray color for answers
            .text(llmSession.answers[i], {
              width: 500,
              indent: 30,
              lineGap: 3,
              paragraphGap: 5
            });
        }
        
        pdfDoc.moveDown(0.8);
        
        // Add page break if needed
        if (pdfDoc.y > pdfDoc.page.height - 100) {
          pdfDoc.addPage();
          pdfDoc.moveDown(1);
        }
      }
    }
  }

  private addPageNumbers(pdfDoc: PDFKit.PDFDocument) {
    const pages = pdfDoc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      pdfDoc.switchToPage(i);
      
      // Footer with page number
      pdfDoc.font('Helvetica')
        .fontSize(10)
        .fillColor('#666666')
        .text(
          `Page ${i + 1} of ${pages.count}`,
          pdfDoc.page.width - 50,
          pdfDoc.page.height - 30,
          { align: 'right' }
        );
    }
  }
}