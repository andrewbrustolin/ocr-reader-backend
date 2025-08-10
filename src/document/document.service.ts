import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

type CreateDocumentInput = {
  userId: number;
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async createDocument(data: CreateDocumentInput) {
    return this.prisma.document.create({
      data: {
        filename: data.filename,
        originalName: data.originalName,
        path: data.path,
        mimeType: data.mimeType,
        size: data.size,
        user: { connect: { id: data.userId } },
      },
    });
  }

  async getById(id: number, userId: number) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return doc;
  }

  // replace file on disk + reset extractedText
  async updateFile(id: number, userId: number, file: Express.Multer.File) {
    const doc = await this.getById(id, userId);


    return this.prisma.document.update({
      where: { id },
      data: {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
        extractedText: null,
      },
    });
  }

  // UPDATE: only OCR text
  async updateExtractedText(id: number, text: string | null) {
    return this.prisma.document.update({
      where: { id },
      data: { extractedText: text },
    });
  }

  async listForUser(userId: number) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        extractedText: true,
        path: true, 
      },
    });
  }

  async deleteDocument(id: number, userId: number) {
    // Fetch the document to ensure the user is the owner
    const doc = await this.getById(id, userId);

    // Remove the file from the disk
    try {
      fs.unlinkSync(doc.path); // Delete the file from the filesystem
    } catch (error) {
      throw new InternalServerErrorException('Error while deleting the file from the filesystem');
    }

    return this.prisma.document.delete({
      where: { id },
    });
  }

  async getLlmSession(documentId: number) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { llms: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    return doc?.llms[0] || null;
  }

  
}
