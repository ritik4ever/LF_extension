import { ApiProperty } from '@nestjs/swagger';
import { 
  IsBoolean, 
  IsEnum, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsUUID, 
  IsInt,
  Min,
  Max
} from 'class-validator';
import { AnswerShape, AnswerColor } from './answer-option.entity';

export class CreateAnswerOptionDto {
  @ApiProperty({ description: 'The question ID this option belongs to' })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'The text content of the answer option' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ 
    description: 'The shape of the answer option', 
    enum: AnswerShape, 
    example: AnswerShape.CIRCLE 
  })
  @IsEnum(AnswerShape)
  @IsNotEmpty()
  shape: AnswerShape;

  @ApiProperty({ 
    description: 'The color of the answer option', 
    enum: AnswerColor, 
    example: AnswerColor.BLUE 
  })
  @IsEnum(AnswerColor)
  @IsNotEmpty()
  color: AnswerColor;

  @ApiProperty({ 
    description: 'Whether this option is the correct answer', 
    default: false 
  })
  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;

  @ApiProperty({ 
    description: 'Pattern for accessibility (for colorblind users)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  accessibilityPattern?: string;

  @ApiProperty({ 
    description: 'The display order of the option (0-3)', 
    minimum: 0, 
    maximum: 3,
    default: 0
  })
  @IsInt()
  @Min(0)
  @Max(3)
  @IsOptional()
  displayOrder?: number;
}

export class UpdateAnswerOptionDto {
  @ApiProperty({ description: 'The text content of the answer option', required: false })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ 
    description: 'The shape of the answer option', 
    enum: AnswerShape, 
    required: false 
  })
  @IsEnum(AnswerShape)
  @IsOptional()
  shape?: AnswerShape;

  @ApiProperty({ 
    description: 'The color of the answer option', 
    enum: AnswerColor, 
    required: false 
  })
  @IsEnum(AnswerColor)
  @IsOptional()
  color?: AnswerColor;

  @ApiProperty({ 
    description: 'Whether this option is the correct answer', 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;

  @ApiProperty({ 
    description: 'Pattern for accessibility (for colorblind users)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  accessibilityPattern?: string;

  @ApiProperty({ 
    description: 'The display order of the option (0-3)', 
    minimum: 0, 
    maximum: 3,
    required: false
  })
  @IsInt()
  @Min(0)
  @Max(3)
  @IsOptional()
  displayOrder?: number;
}

export class AnswerOptionResponseDto {
  @ApiProperty()
  optionId: string;

  @ApiProperty()
  questionId: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ enum: AnswerShape })
  shape: AnswerShape;

  @ApiProperty({ enum: AnswerColor })
  color: AnswerColor;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty()
  accessibilityPattern: string;

  @ApiProperty()
  displayOrder: number;
}