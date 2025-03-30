import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerOptionService } from './answer-option.service';
import { AnswerOptionController } from './answer-option.controller';
import { AnswerOption } from './answer-option.entity';
import { QuestionModule } from '../question/question.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnswerOption]),
    QuestionModule, // Import QuestionModule to use QuestionService
  ],
  controllers: [AnswerOptionController],
  providers: [AnswerOptionService],
  exports: [AnswerOptionService],
})
export class AnswerOptionModule {}