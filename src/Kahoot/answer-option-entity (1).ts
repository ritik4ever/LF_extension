import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Check } from 'typeorm';
import { Question } from '../question/question.entity';

export enum AnswerShape {
  TRIANGLE = 'triangle',
  CIRCLE = 'circle',
  SQUARE = 'square',
  DIAMOND = 'diamond'
}

export enum AnswerColor {
  RED = 'red',
  BLUE = 'blue',
  YELLOW = 'yellow',
  GREEN = 'green'
}

@Entity()
@Check(`"shape" IN ('triangle', 'circle', 'square', 'diamond')`)
@Check(`"color" IN ('red', 'blue', 'yellow', 'green')`)
export class AnswerOption {
  @PrimaryGeneratedColumn('uuid')
  optionId: string;

  @Column({ type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question, question => question.answerOptions, {
    onDelete: 'CASCADE',
  })
  question: Question;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: AnswerShape,
  })
  shape: AnswerShape;

  @Column({
    type: 'enum',
    enum: AnswerColor,
  })
  color: AnswerColor;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ default: '' })
  accessibilityPattern: string;

  @Column({ default: 0 })
  displayOrder: number;
}