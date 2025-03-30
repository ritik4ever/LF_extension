// src/session-code/session-code.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionCodeService } from './session-code.service';
import { SessionCodeController } from './session-code.controller';
import { SessionCode, SessionCodeSchema } from './schemas/session-code.schema';
import { GameSessionModule } from '../game-session/game-session.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionCode.name, schema: SessionCodeSchema },
    ]),
    ScheduleModule.forRoot(),
    GameSessionModule, // Import GameSessionModule to use its service
  ],
  controllers: [SessionCodeController],
  providers: [SessionCodeService],
  exports: [SessionCodeService],
})
export class SessionCodeModule {}
