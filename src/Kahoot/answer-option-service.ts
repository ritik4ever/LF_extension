import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnswerOption, AnswerShape, AnswerColor } from './answer-option.entity';
import { CreateAnswerOptionDto, UpdateAnswerOptionDto } from './answer-option.dto';
import { QuestionService } from '../question/question.service';

@Injectable()
export class AnswerOptionService {
  // Standard shape and color combinations for Kahoot-style
  private readonly standardCombinations = {
    0: { shape: AnswerShape.TRIANGLE, color: AnswerColor.RED, pattern: 'dotted' },
    1: { shape: AnswerShape.CIRCLE, color: AnswerColor.BLUE, pattern: 'dashed' },
    2: { shape: AnswerShape.SQUARE, color: AnswerColor.YELLOW, pattern: 'solid' },
    3: { shape: AnswerShape.DIAMOND, color: AnswerColor.GREEN, pattern: 'zigzag' },
  };

  constructor(
    @InjectRepository(AnswerOption)
    private answerOptionRepository: Repository<AnswerOption>,
    private questionService: QuestionService,
  ) {}

  async create(createAnswerOptionDto: CreateAnswerOptionDto): Promise<AnswerOption> {
    // Verify the question exists
    await this.questionService.findOne(createAnswerOptionDto.questionId);

    // Check if the question already has 4 options
    const existingCount = await this.answerOptionRepository.count({
      where: { questionId: createAnswerOptionDto.questionId },
    });

    if (existingCount >= 4) {
      throw new BadRequestException('Question already has the maximum of 4 answer options');
    }

    // Validate the shape/color combination
    this.validateShapeColorCombination(createAnswerOptionDto.shape, createAnswerOptionDto.color);

    // Auto-assign accessibility pattern if not provided
    if (!createAnswerOptionDto.accessibilityPattern) {
      createAnswerOptionDto.accessibilityPattern = this.getAccessibilityPattern(
        createAnswerOptionDto.shape, 
        createAnswerOptionDto.color
      );
    }

    // Create the answer option
    const answerOption = this.answerOptionRepository.create(createAnswerOptionDto);
    return this.answerOptionRepository.save(answerOption);
  }

  async createBulk(
    questionId: string, 
    options: Omit<CreateAnswerOptionDto, 'questionId'>[]
  ): Promise<AnswerOption[]> {
    // Verify the question exists
    await this.questionService.findOne(questionId);

    // Check if we have a valid number of options
    if (options.length < 2 || options.length > 4) {
      throw new BadRequestException('Questions must have between 2 and 4 answer options');
    }

    // Check if at least one option is marked as correct
    const hasCorrectOption = options.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      throw new BadRequestException('At least one answer option must be marked as correct');
    }

    // Check if there are any duplicate shape/color combinations
    const combinations = new Set();
    options.forEach(option => {
      const combo = `${option.shape}-${option.color}`;
      if (combinations.has(combo)) {
        throw new BadRequestException('Each answer option must have a unique shape/color combination');
      }
      combinations.add(combo);
    });

    // Create the options with auto assignment for accessibilityPattern if missing
    const optionsWithQuestionId = options.map(option => ({
      ...option,
      questionId,
      accessibilityPattern: option.accessibilityPattern || 
        this.getAccessibilityPattern(option.shape, option.color)
    }));

    // Create and save all options
    const createdOptions = this.answerOptionRepository.create(optionsWithQuestionId);
    return this.answerOptionRepository.save(createdOptions);
  }

  async findAll(): Promise<AnswerOption[]> {
    return this.answerOptionRepository.find();
  }

  async findOne(optionId: string): Promise<AnswerOption> {
    const option = await this.answerOptionRepository.findOne({ where: { optionId } });
    if (!option) {
      throw new NotFoundException(`Answer option with ID ${optionId} not found`);
    }
    return option;
  }

  async findByQuestionId(questionId: string): Promise<AnswerOption[]> {
    return this.answerOptionRepository.find({
      where: { questionId },
      order: { displayOrder: 'ASC' },
    });
  }

  async update(optionId: string, updateAnswerOptionDto: UpdateAnswerOptionDto): Promise<AnswerOption> {
    const option = await this.findOne(optionId);
    
    // If updating shape or color, validate the combination
    if (updateAnswerOptionDto.shape || updateAnswerOptionDto.color) {
      this.validateShapeColorCombination(
        updateAnswerOptionDto.shape || option.shape,
        updateAnswerOptionDto.color || option.color
      );
    }

    // If shape or color is updated, update the accessibility pattern too
    if ((updateAnswerOptionDto.shape || updateAnswerOptionDto.color) && 
        !updateAnswerOptionDto.accessibilityPattern) {
      updateAnswerOptionDto.accessibilityPattern = this.getAccessibilityPattern(
        updateAnswerOptionDto.shape || option.shape,
        updateAnswerOptionDto.color || option.color
      );
    }
    
    // Update the option
    Object.assign(option, updateAnswerOptionDto);
    return this.answerOptionRepository.save(option);
  }

  async remove(optionId: string): Promise<void> {
    const option = await this.findOne(optionId);
    await this.answerOptionRepository.remove(option);
  }

  async removeAllByQuestionId(questionId: string): Promise<void> {
    await this.answerOptionRepository.delete({ questionId });
  }

  // Helper method to generate standard answer options for a question
  async generateStandardOptions(questionId: string): Promise<AnswerOption[]> {
    // Verify the question exists
    await this.questionService.findOne(questionId);
    
    // Check if the question already has options
    const existingOptions = await this.findByQuestionId(questionId);
    if (existingOptions.length > 0) {
      throw new BadRequestException('Question already has answer options');
    }
    
    // Create standard options with placeholder text
    const standardOptions = Object.entries(this.standardCombinations).map(([order, combo]) => ({
      questionId,
      text: `Option ${Number(order) + 1}`,
      shape: combo.shape,
      color: combo.color,
      accessibilityPattern: combo.pattern,
      isCorrect: Number(order) === 0, // First option is correct by default
      displayOrder: Number(order)
    }));
    
    const createdOptions = this.answerOptionRepository.create(standardOptions);
    return this.answerOptionRepository.save(createdOptions);
  }
  
  // Helper method to auto-assign accessibility pattern based on color
  private getAccessibilityPattern(shape: AnswerShape, color: AnswerColor): string {
    const patternMap = {
      [AnswerColor.RED]: 'dotted',
      [AnswerColor.BLUE]: 'dashed',
      [AnswerColor.YELLOW]: 'solid',
      [AnswerColor.GREEN]: 'zigzag',
    };
    
    return patternMap[color] || 'solid';
  }
  
  // Validate shape and color combinations
  private validateShapeColorCombination(shape: AnswerShape, color: AnswerColor): void {
    // For now, we allow any combination of shape and color
    // In a real application, you might want to enforce specific combinations
    // or check for existing combinations for a specific question
  }
  
  // Convenience method to get all shape options
  getShapeOptions(): string[] {
    return Object.values(AnswerShape);
  }
  
  // Convenience method to get all color options
  getColorOptions(): string[] {
    return Object.values(AnswerColor);
  }
  
  // Convenience method to get standard combinations
  getStandardCombinations() {
    return this.standardCombinations;
  }
}