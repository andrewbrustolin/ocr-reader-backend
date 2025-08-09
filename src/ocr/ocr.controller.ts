import {
  Controller,
  Post,
  Get,
  UseGuards,
  Param,
  ParseIntPipe,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OcrService } from './ocr.service';
import { DocumentService } from '../document/document.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';


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
export class OcrController {
  constructor(
    private readonly ocr: OcrService,
    private readonly docs: DocumentService,
  ) {}

  // Start OCR for an existing document (async with progress)
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/ocr')
  async startOcr(@Param('id', ParseIntPipe) id: number, @Request() req: any, @Query('lang') lang?: string) {
    const res = await this.ocr.startAsync(id, req.user.userId);
    return {
      ...res,
      statusEndpoint: `/documents/${id}/ocr/status`,
    };
  }

  // Upload + start OCR asynchronously, return 202 and a status endpoint
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('with-ocr/async')
  @UseInterceptors(FileInterceptor('file', diskStorageOpts))
  async createWithOcrAsync(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Query('lang') lang?: string,
    ) {
        // 1) Create the document row
        const doc = await this.docs.createDocument({
        userId: req.user.userId,
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
        });

        // Kick off OCR asynchronously (progress tracked)
        await this.ocr.startAsync(doc.id, req.user.userId);

        //  Respond with 202 and where to poll
        return {
        accepted: true,
        documentId: doc.id,
        status: 'queued',
        statusEndpoint: `/documents/${doc.id}/ocr/status`,

        };
    }

  // Poll progress
  @Get(':id/ocr/status')
  async status(@Param('id', ParseIntPipe) id: number) {
    return this.ocr.status(id);
  }
}
