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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentService } from './document.service';
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
export class DocumentController {
  constructor(private readonly docs: DocumentService) {}

  // Create (upload)
  @Post()
  @UseInterceptors(FileInterceptor('file', diskStorageOpts))
  async create(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
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
  

}
