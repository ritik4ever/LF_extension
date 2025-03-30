// src/session-code/session-code.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SessionCode } from './schemas/session-code.schema';
import { Interval } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class SessionCodeService {
  private readonly logger = new Logger(SessionCodeService.name);
  private readonly ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY_HOURS = 24;
  private readonly MAX_GENERATION_ATTEMPTS = 10;

  constructor(
    @InjectModel(SessionCode.name) private sessionCodeModel: Model<SessionCode>,
  ) {}

  /**
   * Generate a unique 6-digit alphanumeric code
   */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < this.MAX_GENERATION_ATTEMPTS; attempt++) {
      const code = this.generateRandomCode();
      
      // Check if code already exists
      const existingCode = await this.sessionCodeModel.findOne({ code, isExpired: false });
      
      // If code doesn't exist, return it
      if (!existingCode) {
        return code;
      }
      
      this.logger.verbose(`Code collision detected for ${code}, regenerating...`);
    }
    
    // If we exhaust all attempts, use a more complex approach
    const timestamp = Date.now().toString();
    const hash = crypto.createHash('sha256').update(timestamp).digest('hex');
    return hash.substring(0, this.CODE_LENGTH);
  }
  
  /**
   * Generate a random alphanumeric code
   */
  private generateRandomCode(): string {
    let result = '';
    const charactersLength = this.ALPHANUMERIC_CHARS.length;
    
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      result += this.ALPHANUMERIC_CHARS.charAt(randomIndex);
    }
    
    return result;
  }

  /**
   * Create a new session code for a game session
   */
  async createSessionCode(gameSessionId: string, isPrimary: boolean = false): Promise<SessionCode> {
    const objectId = new Types.ObjectId(gameSessionId);
    const code = await this.generateUniqueCode();
    
    // Set expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.CODE_EXPIRY_HOURS);
    
    // Create the new session code
    const sessionCode = new this.sessionCodeModel({
      code,
      gameSessionId: objectId,
      expiresAt,
      isPrimary,
    });
    
    await sessionCode.save();
    this.logger.log(`Created new session code ${code} for game session ${gameSessionId}`);
    
    return sessionCode;
  }

  /**
   * Find a session code by its code value
   */
  async findByCode(code: string): Promise<SessionCode> {
    const sessionCode = await this.sessionCodeModel.findOne({
      code,
      isExpired: false,
      isUsed: false,
    }).exec();
    
    if (!sessionCode) {
      throw new NotFoundException(`Session code ${code} not found or has expired`);
    }
    
    return sessionCode;
  }

  /**
   * Get all active codes for a game session
   */
  async getCodesForSession(gameSessionId: string): Promise<SessionCode[]> {
    const objectId = new Types.ObjectId(gameSessionId);
    
    return this.sessionCodeModel.find({
      gameSessionId: objectId,
      isExpired: false,
    }).exec();
  }

  /**
   * Get the primary code for a game session
   */
  async getPrimaryCodeForSession(gameSessionId: string): Promise<SessionCode | null> {
    const objectId = new Types.ObjectId(gameSessionId);
    
    return this.sessionCodeModel.findOne({
      gameSessionId: objectId,
      isPrimary: true,
      isExpired: false,
    }).exec();
  }

  /**
   * Mark a code as used
   */
  async markCodeAsUsed(code: string): Promise<SessionCode> {
    const sessionCode = await this.findByCode(code);
    
    sessionCode.usageCount += 1;
    
    // If the code isn't primary, mark it as used after first use
    if (!sessionCode.isPrimary) {
      sessionCode.isUsed = true;
    }
    
    await sessionCode.save();
    
    return sessionCode;
  }

  /**
   * Regenerate the primary code for a game session
   */
  async regeneratePrimaryCode(gameSessionId: string): Promise<SessionCode> {
    const objectId = new Types.ObjectId(gameSessionId);
    
    // Expire any existing primary codes
    await this.sessionCodeModel.updateMany(
      { gameSessionId: objectId, isPrimary: true, isExpired: false },
      { isExpired: true }
    );
    
    // Create a new primary code
    return this.createSessionCode(gameSessionId, true);
  }

  /**
   * Generate a single-use code for a game session
   */
  async generateSingleUseCode(gameSessionId: string): Promise<SessionCode> {
    return this.createSessionCode(gameSessionId, false);
  }

  /**
   * Generate a QR code for a session code
   */
  async generateQRCode(code: string, baseUrl: string): Promise<string> {
    const sessionCode = await this.findByCode(code);
    
    if (!sessionCode) {
      throw new NotFoundException('Session code not found or has expired');
    }
    
    const joinUrl = `${baseUrl}/join/${code}`;
    
    try {
      // Generate QR code as a data URL
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
      });
      
      return qrDataUrl;
    } catch (error) {
      this.logger.error(`Error generating QR code: ${error.message}`);
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  /**
   * Expire a specific code
   */
  async expireCode(code: string): Promise<void> {
    await this.sessionCodeModel.updateOne(
      { code },
      { isExpired: true }
    );
    
    this.logger.log(`Expired code ${code}`);
  }

  /**
   * Expire all codes for a game session
   */
  async expireAllCodesForSession(gameSessionId: string): Promise<void> {
    const objectId = new Types.ObjectId(gameSessionId);
    
    await this.sessionCodeModel.updateMany(
      { gameSessionId: objectId, isExpired: false },
      { isExpired: true }
    );
    
    this.logger.log(`Expired all codes for game session ${gameSessionId}`);
  }

  /**
   * Clean up expired session codes
   * Run once per day
   */
  @Interval(24 * 60 * 60 * 1000)
  async cleanupExpiredCodes() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Clean up codes that have been expired for over 30 days
    const result = await this.sessionCodeModel.deleteMany({
      $or: [
        { isExpired: true, updatedAt: { $lt: thirtyDaysAgo } },
        { expiresAt: { $lt: new Date() } }
      ]
    });
    
    if (result.deletedCount > 0) {
      this.logger.log(`Cleaned up ${result.deletedCount} expired session codes`);
    }
    
    // Mark codes as expired if their expiration date has passed
    const expireResult = await this.sessionCodeModel.updateMany(
      { isExpired: false, expiresAt: { $lt: new Date() } },
      { isExpired: true }
    );
    
    if (expireResult.modifiedCount > 0) {
      this.logger.log(`Marked ${expireResult.modifiedCount} session codes as expired`);
    }
  }
}
