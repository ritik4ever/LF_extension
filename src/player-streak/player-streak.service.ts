import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PlayerStreak, PlayerStreakDocument } from './schemas/player-streak.schema';

@Injectable()
export class PlayerStreakService {
  // Define milestone thresholds for streaks
  private readonly STREAK_MILESTONES = [3, 5, 10, 15, 20, 25, 50];
  // Define the time window within which answers must be given to maintain a streak (30 minutes)
  private readonly STREAK_TIMEOUT_MS = 30 * 60 * 1000;

  constructor(
    @InjectModel(PlayerStreak.name) private playerStreakModel: Model<PlayerStreakDocument>,
  ) {}

  async getPlayerStreak(userId: string): Promise<PlayerStreakDocument> {
    const objectId = new Types.ObjectId(userId);
    let playerStreak = await this.playerStreakModel.findOne({ userId: objectId });
    
    if (!playerStreak) {
      playerStreak = new this.playerStreakModel({
        userId: objectId,
        currentStreak: 0,
        highestStreak: 0,
        lastCorrectAnswerAt: new Date(0), // Set to epoch to ensure first answer counts
        streakMilestones: {},
        streakBonusActive: false,
      });
      await playerStreak.save();
    }
    
    return playerStreak;
  }

  async incrementStreak(userId: string): Promise<PlayerStreakDocument> {
    const playerStreak = await this.getPlayerStreak(userId);
    const now = new Date();
    
    // Check if the streak is still active (within time window)
    const timeSinceLastCorrect = now.getTime() - playerStreak.lastCorrectAnswerAt.getTime();
    
    if (timeSinceLastCorrect <= this.STREAK_TIMEOUT_MS) {
      // Increment streak
      playerStreak.currentStreak += 1;
    } else {
      // Reset streak if too much time has passed
      playerStreak.currentStreak = 1; // Start new streak with this correct answer
    }
    
    // Update highest streak if current streak is higher
    if (playerStreak.currentStreak > playerStreak.highestStreak) {
      playerStreak.highestStreak = playerStreak.currentStreak;
    }
    
    // Update last correct answer timestamp
    playerStreak.lastCorrectAnswerAt = now;
    
    // Check for new milestone achievements
    this.checkAndUpdateMilestones(playerStreak);
    
    // Update streak bonus status
    playerStreak.streakBonusActive = playerStreak.currentStreak >= 3;
    
    await playerStreak.save();
    return playerStreak;
  }

  async resetStreak(userId: string): Promise<PlayerStreakDocument> {
    const playerStreak = await this.getPlayerStreak(userId);
    playerStreak.currentStreak = 0;
    playerStreak.streakBonusActive = false;
    await playerStreak.save();
    return playerStreak;
  }

  private checkAndUpdateMilestones(playerStreak: PlayerStreakDocument): void {
    for (const milestone of this.STREAK_MILESTONES) {
      if (playerStreak.currentStreak >= milestone && !playerStreak.streakMilestones[milestone]) {
        playerStreak.streakMilestones[milestone] = true;
      }
    }
  }

  async calculateBonusPoints(userId: string): Promise<number> {
    const playerStreak = await this.getPlayerStreak(userId);
    
    if (!playerStreak.streakBonusActive) {
      return 1; // No bonus (multiplier of 1)
    }
    
    // Basic bonus calculation: streak multiplier increases with streak length
    if (playerStreak.currentStreak >= 10) {
      return 3; // 3x multiplier
    } else if (playerStreak.currentStreak >= 5) {
      return 2; // 2x multiplier
    } else if (playerStreak.currentStreak >= 3) {
      return 1.5; // 1.5x multiplier
    }
    
    return 1; // Default no bonus
  }
}