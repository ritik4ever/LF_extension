import { Injectable } from '@nestjs/common';
import { PlayerStreakService } from '../player-streak/player-streak.service';
// Import other necessary services and models

@Injectable()
export class GameRoundService {
  constructor(
    private readonly playerStreakService: PlayerStreakService,
    // Other dependencies
  ) {}

  // This method would be called when processing a player's answer
  async processAnswer(userId: string, isCorrect: boolean, gameData: any): Promise<any> {
    // Base score for a correct answer
    let finalScore = 0;
    let streakData = null;

    if (isCorrect) {
      // Increment the streak for correct answer
      const playerStreak = await this.playerStreakService.incrementStreak(userId);
      
      // Calculate bonus based on streak
      const bonusMultiplier = await this.playerStreakService.calculateBonusPoints(userId);
      
      // Apply bonus to the base score
      const baseScore = gameData.baseScore || 10;
      finalScore = baseScore * bonusMultiplier;
      
      // Include streak info in response
      streakData = {
        currentStreak: playerStreak.currentStreak,
        highestStreak: playerStreak.highestStreak,
        bonusActive: playerStreak.streakBonusActive,
        bonusMultiplier,
      };
    } else {
      // Reset streak for incorrect answer
      await this.playerStreakService.resetStreak(userId);
    }
    
    // Return the final score and streak data
    return {
      score: finalScore,
      streak: streakData,
      // Other game data
    };
  }
}