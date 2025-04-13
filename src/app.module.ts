import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlayerStreakModule } from './player-streak/player-streak.module';
// Other imports

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    // Add PlayerStreakModule to the imports
    PlayerStreakModule,
    // Your other modules
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}