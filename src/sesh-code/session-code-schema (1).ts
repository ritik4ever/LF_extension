// src/session-code/schemas/session-code.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoose from 'mongoose';

@Schema({ timestamps: true })
export class SessionCode extends Document {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'GameSession', required: true, index: true })
  gameSessionId: mongoose.Types.ObjectId;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: false })
  isExpired: boolean;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: false })
  isPrimary: boolean;
}

export const SessionCodeSchema = SchemaFactory.createForClass(SessionCode);

// Create compound index for faster lookups for active codes
SessionCodeSchema.index({ isExpired: 1, isUsed: 1 });
