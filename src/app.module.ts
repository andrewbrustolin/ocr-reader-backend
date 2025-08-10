import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './user/user.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentModule } from './document/document.module';
import { OcrModule } from './ocr/ocr.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [AuthModule, UserModule, PrismaModule, DocumentModule, OcrModule, LlmModule],
  controllers: [AppController, UserController],
  providers: [AppService],
  
})
export class AppModule {}
