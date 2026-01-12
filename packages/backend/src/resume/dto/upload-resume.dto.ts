import { IsString, IsOptional } from 'class-validator';

export class UploadResumeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}
