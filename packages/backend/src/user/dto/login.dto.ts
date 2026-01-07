import { IsEmail, IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Whether to remember the user (longer session)',
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  remember?: boolean = false;
}
