import { IsOptional, IsObject } from 'class-validator';

export class UpdateResumeDto {
  @IsOptional()
  @IsObject()
  parsedData?: Record<string, any>;
}
