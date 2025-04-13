import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlayerStreak, PlayerStreakSchema } from './schemas/player-streak.schema';
import { PlayerStreakService } from './player-streak.service';
import { PlayerStreakController } from './player-streak.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlayerStreak.name, schema: PlayerStreakSchema },
    ]),
  ],
  controllers: [PlayerStreakController],
  providers: [PlayerStreakService],
  exports: [PlayerStreakService],
})
export class PlayerStreakModule {}