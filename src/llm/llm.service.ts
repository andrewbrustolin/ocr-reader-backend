import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

@Injectable()
export class LlmService {
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Helper to safely parse JSON array or return empty array
  private parseJsonArray(value: any): string[] {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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

  async addToLlmSession(llmId: number, originalQuestion: string, contextQuestion?: string) {
  const session = await this.prisma.lLM.findUnique({ where: { id: llmId } });

  if (!session) {
    throw new Error('LLM session not found');
  }

  // Safely parse questions and answers
  const questions = this.parseJsonArray(session.questions);
  const answers = this.parseJsonArray(session.answers);

  // Build conversation history
  const conversationHistory: ChatCompletionMessageParam[] = [];
  for (let i = 0; i < questions.length; i++) {
    conversationHistory.push({
      role: "user",
      content: questions[i]
    });
    if (answers[i]) {
      conversationHistory.push({
        role: "assistant",
        content: answers[i]
      });
    }
  }

  // Get last 5 Q&A pairs (10 messages total)
  const recentHistory = conversationHistory.slice(-10);

  // Use context-enhanced question if provided, otherwise use original
  const questionToAnswer = contextQuestion || originalQuestion;

  const answer = await this.generateAnswer(questionToAnswer, recentHistory);

  return this.prisma.lLM.update({
    where: { id: llmId },
    data: {
      questions: [...questions, originalQuestion], // Store original question
      answers: [...answers, answer],
    },
  });
}

  // Call OpenAI's API to generate an answer based on the given text
  async generateAnswer(text: string, conversationHistory: ChatCompletionMessageParam[] = []): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
        {
        role: "system",
        content: "You are a helpful assistant. When answering questions, consider the full conversation history where relevant."
        },
        ...conversationHistory,
        { role: "user", content: text }
    ];

    const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
    }
}
//messages: [{ role: 'user', content: text }],