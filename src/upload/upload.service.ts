import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(private prisma: PrismaService) {}

  async handleUpload(file: Express.Multer.File, userId: number) {
    const saved = await this.prisma.document.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
        user: {
          connect: { id: userId }, 
        },
      },
    });

    return {
      message: 'File uploaded successfully',
      fileId: saved.id,
      filename: saved.filename,
    };
  }
}