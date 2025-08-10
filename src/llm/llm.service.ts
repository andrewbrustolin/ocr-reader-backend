import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';

@Injectable()
export class LlmService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Create the LLM session, including the extracted text as the first question
  async createLlmSession(userId: number, documentId: number, extractedText: string) {
    const answer = await this.generateAnswer(extractedText);

    return this.prisma.lLM.create({
      data: {
        userId,
        documentId,
        questions: [extractedText],
        answers: [answer],
      },
    });
  }

  // Add a new question and answer to the LLM session
  async addToLlmSession(llmId: number, question: string) {
    const answer = await this.generateAnswer(question);

    const session = await this.prisma.lLM.findUnique({ where: { id: llmId } });

    if (!session) {
      throw new Error('LLM session not found');
    }

    // Ensure questions and answers are arrays
    const questions = Array.isArray(session.questions) ? session.questions : [];
    const answers = Array.isArray(session.answers) ? session.answers : [];

    return this.prisma.lLM.update({
      where: { id: llmId },
      data: {
        questions: [...questions, question],
        answers: [...answers, answer],
      },
    });
  }

  // Call OpenAI's API to generate an answer based on the given text
  async generateAnswer(text: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4', 
      messages: [{ role: 'user', content: text }],
    });

    return response.choices[0]?.message?.content || '';
  }
}
