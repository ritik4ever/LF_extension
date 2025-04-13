import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class PlayerStreak {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, default: 0 })
  currentStreak: number;

  @Prop({ required: true, default: 0 })
  highestStreak: number;

  @Prop({ required: true, default: new Date() })
  lastCorrectAnswerAt: Date;

  @Prop({ default: {} })
  streakMilestones: Record<number, boolean>;
  
  @Prop({ default: false })
  streakBonusActive: boolean;
}

export type PlayerStreakDocument = PlayerStreak & Document;
export const PlayerStreakSchema = SchemaFactory.createForClass(PlayerStreak);