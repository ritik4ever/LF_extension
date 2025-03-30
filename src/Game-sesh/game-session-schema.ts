// src/game-session/schemas/game-session.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum GameSessionStatus {
  CREATED = 'created',
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
}

export interface GameSessionSettings {
  isPublic: boolean;
  maxPlayers: number;
  timeLimit?: number; // in seconds
  questionTimeLimit?: number; // in seconds
  allowLateJoin: boolean;
  allowRejoin: boolean;
  showLeaderboard: boolean;
  categories?: string[];
  difficulty?: string;
}

@Schema({ timestamps: true })
export class GameSession extends Document {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  hostId: string;

  @Prop({
    type: String,
    enum: GameSessionStatus,
    default: GameSessionStatus.CREATED,
    index: true,
  })
  status: GameSessionStatus;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  settings: GameSessionSettings;

  @Prop({ type: [String], default: [] })
  participants: string[];

  @Prop({ type: Number, default: 0 })
  participantCount: number;

  @Prop({ default: false })
  isExpired: boolean;

  @Prop()
  accessCode?: string;

  @Prop()
  expiresAt?: Date;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);

// Index for expiration queries
GameSessionSchema.index({ isExpired: 1, expiresAt: 1 });
