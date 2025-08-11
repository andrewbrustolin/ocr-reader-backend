import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  BadRequestException,
  Res,
  Query,
  NotFoundException
} from '@nestjs/common';
import { ServerResponse } from 'http';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentService } from './document.service';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import * as PDFDocument from 'pdfkit';
import { PdfService } from 'src/pdf/pdf.service';


const uploadsDir = './uploads';
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const diskStorageOpts = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Ensure the uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/image\/(jpeg|png|jpg)/)) {
      return cb(new BadRequestException('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
};



@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentController {
  constructor(private readonly docs: DocumentService, private readonly pdfService: PdfService) {}

  // Create (upload)
  @Post()
  @UseInterceptors(FileInterceptor('file', diskStorageOpts))
  async create(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {

      // Check if the uploaded file is empty (0KB)
      if (file.size === 0) {
        throw new BadRequestException('Uploaded file is empty');
      }

      const doc = await this.docs.createDocument({
        userId: req.user.userId,
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
      });
      return { message: 'File uploaded successfully', fileId: doc.id, filename: doc.filename };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message || 'Unexpected error occurred');
    }
  }

  // Replace file (clears extractedText inside DocumentService.updateFile)
  @Put(':id/file')
  @UseInterceptors(FileInterceptor('file', diskStorageOpts))
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    try {
      await this.docs.updateFile(id, req.user.userId, file);
      return { message: 'File replaced. OCR text cleared.' };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message || 'Unexpected error occurred');
    }
  }

  // List documents
  @Get()
  async list(@Request() req) {
    return this.docs.listForUser(req.user.userId);
  }

  // Get a single document
  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.docs.getById(id, req.user.userId);
  }

  // Delete a document
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    try {
      await this.docs.deleteDocument(id, req.user.userId);
      return { message: 'Document deleted successfully' };
      } catch (error: any) {
        throw new InternalServerErrorException(error.message || 'Unexpected error occurred');
      }
    }

    // GET /documents/:id/file?download=1  -> attachment
    // GET /documents/:id/file             -> inline preview
    @Get(':id/file')
      async streamFile(
        @Param('id', ParseIntPipe) id: number,
        @Request() req,
        @Res() res: Response,
        @Query('download') download?: string,
      ) {
        try {
          const doc = await this.docs.getById(id, req.user.userId);

          if (!fs.existsSync(doc.path)) {
            throw new NotFoundException('File not found on server');
          }

          const stats = fs.statSync(doc.path);
          if (stats.size === 0) {
            throw new InternalServerErrorException('File is empty and cannot be served');
          }

          const stream = fs.createReadStream(doc.path);
          
          // Set appropriate headers
          res.setHeader('Content-Type', doc.mimeType);
          const disposition = String(download) === '1' ? 'attachment' : 'inline';
          res.setHeader('Content-Disposition', `${disposition}; filename="${doc.filename}"`);
          res.setHeader('Content-Length', stats.size.toString());

          // Pipe stream directly to response
          stream.pipe(res);

          stream.on('end', () => {
            console.log('Stream finished successfully');
          });

          stream.on('error', (err) => {
            console.error('Error streaming file:', err);
            res.status(500).send('Error streaming file');
          });

        } catch (err) {
          console.error('Error in streamFile:', err);
          res.status(500).send('Error while serving the file');
        }
      }

      

      private async getLlmSession(documentId: number) {
        try {
          return await this.docs.getLlmSession(documentId);
        } catch {
          return null;
        }
      }
  

}
