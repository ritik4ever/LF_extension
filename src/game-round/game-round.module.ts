import { Module } from '@nestjs/common';
import { GameRoundService } from './game-round.service';
import { GameRoundController } from './game-round.controller';
import { PlayerStreakModule } from '../player-streak/player-streak.module';
// Other imports

@Module({
  imports: [
    PlayerStreakModule,
    // Other imports
  ],
  controllers: [GameRoundController],
  providers: [GameRoundService],
  exports: [GameRoundService],
})
export class GameRoundModule {}