// src/game-session/game-session.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { GameSessionService } from './game-session.service';
import { GameSessionController } from './game-session.controller';
import { GameSession, GameSessionSchema } from './schemas/game-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameSession.name, schema: GameSessionSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [GameSessionController],
  providers: [GameSessionService],
  exports: [GameSessionService],
})
export class GameSessionModule {}
