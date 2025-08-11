import { Controller, Post, Body, Param, BadRequestException, Get, UseGuards, NotFoundException, Request, HttpException } from '@nestjs/common';
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
    @Body() body: { text: string },
    @Request() req: Request
  ) {
    if (!body.text) {
      throw new BadRequestException('Text is required for initialization');
    }

    const apiKey = req.headers['x-openai-api-key'] as string;
    if (!apiKey) throw new BadRequestException('OpenAI API key is required');

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
        body.text,
        apiKey
      );

      return { llmSession };
    } catch (error) {
        let statusCode = 400;
        let errorMessage = 'Error initializing LLM session';
        let solution = 'An error has occurred';

        if (error.message.includes('Invalid API key')) {
          statusCode = 401;
          errorMessage = 'Invalid API key provided';
          solution = 'Verify your API key at platform.openai.com/account/api-keys';
        }

        throw new HttpException({
          statusCode,
          error: errorMessage,
          solution
        }, statusCode);
      
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
    @Body() body: { text: string },
    @Request() req: Request
  ) {
    if (!body.text) {
      throw new BadRequestException('Text is required for answer');
    }

    const apiKey = req.headers['x-openai-api-key'] as string;
    if (!apiKey) throw new BadRequestException('OpenAI API key is required');

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
      const session = await this.prisma.lLM.findUnique({
        where: { id: parseInt(llmId) },
      });

      if (!session) {
        throw new BadRequestException('LLM session not found');
      }

      // Type-safe parsing of questions and answers
      const parseQuestions = (): string[] => {
        if (session.questions === null) return [];
        if (Array.isArray(session.questions)) return session.questions as string[];
        try {
          const parsed = JSON.parse(session.questions as string);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      const parseAnswers = (): string[] => {
        if (session.answers === null) return [];
        if (Array.isArray(session.answers)) return session.answers as string[];
        try {
          const parsed = JSON.parse(session.answers as string);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      const questions = parseQuestions();
      const answers = parseAnswers();

      // Build context from last 3 Q&A pairs
      const lastPairs = Math.min(questions.length, 3);
      let contextPrompt = "Context:\n";
      for (let i = questions.length - lastPairs; i < questions.length; i++) {
        contextPrompt += `\nQ: ${questions[i]}\nA: ${answers[i] || '[No answer]'}\n`;
      }
      contextPrompt += `\nNew question: ${body.text}`;

      const updatedSession = await this.llmService.addToLlmSession(
        session.id,
        body.text,
        contextPrompt,
        apiKey
      );

      return { llmSession: updatedSession };
    } catch (error) {
        if (error.message.includes('Invalid OpenAI API key')) {
          throw new BadRequestException({
            message: 'Invalid API Key',
            details: 'The provided OpenAI API key is invalid',
            statusCode: 401
          });
        }
        if (error.message.includes('You exceeded your current quota')) {
          throw new BadRequestException({
            message: 'You exceeded your current quota',
            details: 'You exceeded your current quota',
            statusCode: 429
          });
        }
        throw new BadRequestException(error.message || 'Error generating answer');
    }
  }
  
}
