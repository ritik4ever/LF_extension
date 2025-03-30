import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AnswerShape, AnswerColor } from '../../models/answer-option.model';

export interface AnswerOption {
  optionId: string;
  text: string;
  shape: AnswerShape;
  color: AnswerColor;
  isCorrect: boolean;
  accessibilityPattern: string;
  displayOrder: number;
}

@Component({
  selector: 'app-answer-option-selector',
  templateUrl: './answer-option-selector.component.html',
  styleUrls: ['./answer-option-selector.component.scss']
})
export class AnswerOptionSelectorComponent implements OnInit {
  @Input() options: AnswerOption[] = [];
  @Input() isColorblindMode = false;
  @Input() isSubmitted = false;
  @Input() selectedOptionId: string | null = null;
  @Input() showCorrectAnswer = false;
  
  @Output() optionSelected = new EventEmitter<string>();
  
  constructor() { }

  ngOnInit(): void { }

  selectOption(optionId: string): void {
    if (!this.isSubmitted) {
      this.selectedOptionId = optionId;
      this.optionSelected.emit(optionId);
    }
  }

  getShapePath(shape: AnswerShape): string {
    switch (shape) {
      case AnswerShape.TRIANGLE:
        return 'M50,10 L90,90 L10,90 Z';
      case AnswerShape.CIRCLE:
        return '';  // Circle is handled with CSS border-radius
      case AnswerShape.SQUARE:
        return '';  // Square is the default shape
      case AnswerShape.DIAMOND:
        return 'M50,10 L90,50 L50,90 L10,50 Z';
      default:
        return '';
    }
  }

  getBackgroundColor(option: AnswerOption): string {
    if (this.isColorblindMode) {
      return 'white';  // Use white background in colorblind mode
    }
    
    switch (option.color) {
      case AnswerColor.RED:
        return '#ff3355';
      case AnswerColor.BLUE:
        return '#4477ff';
      case AnswerColor.YELLOW:
        return '#ffcc22';
      case AnswerColor.GREEN:
        return '#33cc66';
      default:
        return 'gray';
    }
  }

  getBorderStyle(option: AnswerOption): string {
    if (!this.isColorblindMode