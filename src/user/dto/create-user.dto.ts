/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
export class CreateUserDto {

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsString()
  @MinLength(6)
  password: string;
}