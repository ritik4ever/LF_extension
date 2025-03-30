// src/game-session/dto/create-game-session.dto.ts
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GameSessionSettingsDto {
  @ApiProperty({ description: 'Whether the session is public or private', default: false })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: 'Maximum number of players allowed', minimum: 1, maximum: 100, default: 30 })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxPlayers: number;

  @ApiPropertyOptional({ description: 'Total time limit for the game in seconds', minimum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Time limit for each question in seconds', minimum: 5, maximum: 120 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  questionTimeLimit?: number;

  @ApiProperty({ description: 'Allow players to join after the game has started', default: false })
  @IsBoolean()
  allowLateJoin: boolean;

  @ApiProperty({ description: 'Allow players to rejoin if disconnected', default: true })
  @IsBoolean()
  allowRejoin: boolean;

  @ApiProperty({ description: 'Show leaderboard during the game', default: true })
  @IsBoolean()
  showLeaderboard: boolean;

  @ApiPropertyOptional({ description: 'Game categories', type: [String] })
  @IsOptional()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Game difficulty level', enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;
}

export class CreateGameSessionDto {
  @ApiPropertyOptional({ description: 'Custom session ID (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ type: GameSessionSettingsDto })
  @ValidateNested()
  @Type(() => GameSessionSettingsDto)
  settings: GameSessionSettingsDto;
}

// src/game-session/dto/update-game-session.dto.ts
import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateGameSessionDto } from './create-game-session.dto';
import { GameSessionStatus } from '../schemas/game-session.schema';

export class UpdateGameSessionDto extends PartialType(CreateGameSessionDto) {
  @ApiPropertyOptional({ enum: GameSessionStatus, description: 'Game session status' })
  @IsOptional()
  @IsEnum(GameSessionStatus)
  status?: GameSessionStatus;
}

// src/game-session/dto/join-game-session.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class JoinGameSessionDto {
  @ApiProperty({ description: 'Access code for the game session' })
  @IsString()
  @IsNotEmpty()
  accessCode: string;
}
