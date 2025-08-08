import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { PrismaService } from './prisma/prisma.service';
import { UserController } from './user/user.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UploadModule } from './upload/upload.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, UserModule, UploadModule, PrismaModule],
  controllers: [AppController, UserController],
  providers: [AppService],
  
})
export class AppModule {}
