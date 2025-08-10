import { Controller, Post, Body, Param, BadRequestException, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { LlmService } from './llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('documents/:documentId/llm')
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly prisma: PrismaService
  ) {}

  // Endpoint for initializing the LLM session with the extracted OCR text
  @Post('initialize')
  async initialize(
    @Param('documentId') documentId: string,
    @Body() body: { text: string }
  ) {
    if (!body.text) {
      throw new BadRequestException('Text is required for initialization');
    }

    // Verify document exists
    const document = await this.prisma.document.findUnique({
      where: { id: parseInt(documentId) }
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    try {
      // Create LLM session with extracted text as the first question
      const llmSession = await this.llmService.createLlmSession(
        document.userId,
        parseInt(documentId),
        body.text
      );

      return { llmSession };
    } catch (error) {
      throw new BadRequestException('Error initializing LLM session');
    }
  }

  @Get('session')
  async getSession(@Param('documentId') documentId: string) {
    const document = await this.prisma.document.findUnique({
        where: { id: parseInt(documentId) },
        include: { llms: true }, 
    });

    if (!document || document.llms.length === 0) {
        throw new NotFoundException('LLM session not found for this document');
    }

    // Sort sessions by createdAt in descending order and get the most recent one
    const recentLlmSession = document.llms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return recentLlmSession;
  }

  // Endpoint for further user queries
  @Post(':llmId/answer')
  async answer(
    @Param('documentId') documentId: string,
    @Param('llmId') llmId: string,
    @Body() body: { text: string }
  ) {
    if (!body.text) {
      throw new BadRequestException('Text is required for answer');
    }

    // Verify document exists
    const document = await this.prisma.document.findUnique({
      where: { id: parseInt(documentId) }
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    // Verify LLM session exists
    const session = await this.prisma.lLM.findUnique({
      where: { id: parseInt(llmId) },
    });

    if (!session) {
      throw new BadRequestException('LLM session not found');
    }

    try {
      // Add the new question to the existing LLM session
      const updatedSession = await this.llmService.addToLlmSession(
        session.id,
        body.text
      );

      return { llmSession: updatedSession };
    } catch (error) {
      throw new BadRequestException('Error generating answer');
    }
  }
}
