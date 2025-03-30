import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  HttpStatus,
  HttpCode,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AnswerOptionService } from './answer-option.service';
import { 
  CreateAnswerOptionDto, 
  UpdateAnswerOptionDto, 
  AnswerOptionResponseDto 
} from './answer-option.dto';
import { AnswerOption } from './answer-option.entity';

@ApiTags('answer-options')
@Controller('answer-options')
export class AnswerOptionController {
  constructor(private readonly answerOptionService: AnswerOptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new answer option' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'The answer option has been successfully created.', 
    type: AnswerOptionResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input or question already has max options.' 
  })
  async create(@Body() createAnswerOptionDto: CreateAnswerOptionDto): Promise<AnswerOption> {
    return this.answerOptionService.create(createAnswerOptionDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple answer options for a question' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        questionId: { type: 'string', format: 'uuid' },
        options: { type: 'array', items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            shape: { type: 'string', enum: ['triangle', 'circle', 'square', 'diamond'] },
            color: { type: 'string', enum: ['red', 'blue', 'yellow', 'green'] },
            isCorrect: { type: 'boolean' },
            accessibilityPattern: { type: 'string' },
            displayOrder: { type: 'integer', minimum: 0, maximum: 3 }
          },
          required: ['text', 'shape', 'color']
        }}
      },
      required: ['questionId', 'options']
    }
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'The answer options have been successfully created.', 
    type: [AnswerOptionResponseDto] 
  })
  async createBulk(
    @Body('questionId') questionId: string,
    @Body('options') options: Omit<CreateAnswerOptionDto, 'questionId'>[]
  ): Promise<AnswerOption[]> {
    return this.answerOptionService.createBulk(questionId, options);
  }

  @Get()
  @ApiOperation({ summary: 'Get all answer options' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return all answer options', 
    type: [AnswerOptionResponseDto] 
  })
  async findAll(): Promise<AnswerOption[]> {
    return this.answerOptionService.findAll();
  }

  @Get('question/:questionId')
  @ApiOperation({ summary: 'Get all answer options for a specific question' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return answer options for the question', 
    type: [AnswerOptionResponseDto] 
  })
  async findByQuestionId(@Param('questionId') questionId: string): Promise<AnswerOption[]> {
    return this.answerOptionService.findByQuestionId(questionId);
  }

  @Get('shapes')
  @ApiOperation({ summary: 'Get all available shapes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return all shape options' })
  getShapeOptions(): string[] {
    return this.answerOptionService.getShapeOptions();
  }

  @Get('colors')
  @ApiOperation({ summary: 'Get all available colors' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return all color options' })
  getColorOptions(): string[] {
    return this.answerOptionService.getColorOptions();
  }

  @Get('standard-combinations')
  @ApiOperation({ summary: 'Get standard shape-color combinations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Return standard combinations' })
  getStandardCombinations() {
    return this.answerOptionService.getStandardCombinations();
  }

  @Post('question/:questionId/generate-standard')
  @ApiOperation({ summary: 'Generate standard answer options for a question' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Standard options created successfully', 
    type: [AnswerOptionResponseDto] 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Question already has options' 
  })
  generateStandardOptions(@Param('questionId') questionId: string): Promise<AnswerOption[]> {
    return this.answerOptionService.generateStandardOptions(questionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single answer option by ID' })
  @ApiParam({ name: 'id', description: 'Answer option ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return the answer option', 
    type: AnswerOptionResponseDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Answer option not found' })
  async findOne(@Param('id') id: string): Promise<AnswerOption> {
    return this.answerOptionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an answer option' })
  @ApiParam({ name: 'id', description: 'Answer option ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The answer option has been successfully updated.', 
    type: AnswerOptionResponseDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Answer option not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAnswerOptionDto: UpdateAnswerOptionDto,
  ): Promise<AnswerOption> {
    return this.answerOptionService.update(id, updateAnswerOptionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an answer option' })
  @ApiParam({ name: 'id', description: 'Answer option ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'The answer option has been successfully deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Answer option not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.answerOptionService.remove(id);
  }

  @Delete('question/:questionId')
  @ApiOperation({ summary: 'Delete all answer options for a question' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Answer options have been successfully deleted.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAllByQuestionId(@Param('questionId') questionId: string): Promise<void> {
    return this.answerOptionService.removeAllByQuestionId(questionId);
  }
}