// src/game-session/game-session.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Interval } from '@nestjs/schedule';
import { GameSession, GameSessionStatus } from './schemas/game-session.schema';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

@Injectable()
export class GameSessionService {
  private readonly logger = new Logger(GameSessionService.name);

  constructor(
    @InjectModel(GameSession.name) private gameSessionModel: Model<GameSession>,
  ) {}

  async create(userId: string, createGameSessionDto: CreateGameSessionDto): Promise<GameSession> {
    const sessionId = createGameSessionDto.sessionId || uuidv4();
    
    // Generate a random 6-digit access code
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration date (24 hours from now by default)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const createdSession = new this.gameSessionModel({
      sessionId,
      hostId: userId,
      status: GameSessionStatus.CREATED,
      settings: createGameSessionDto.settings,
      accessCode,
      expiresAt,
    });

    const session = await createdSession.save();
    this.logger.log(`Game session created: ${sessionId} by host: ${userId}`);
    return session;
  }

  async findAll(filters: any = {}): Promise<GameSession[]> {
    return this.gameSessionModel.find({ 
      isExpired: false,
      ...filters 
    }).exec();
  }

  async findAllByHost(hostId: string): Promise<GameSession[]> {
    return this.gameSessionModel.find({
      hostId,
      isExpired: false,
    }).exec();
  }

  async findPublicSessions(): Promise<GameSession[]> {
    return this.gameSessionModel.find({
      'settings.isPublic': true,
      status: { $in: [GameSessionStatus.WAITING, GameSessionStatus.CREATED] },
      isExpired: false,
    }).exec();
  }

  async findOne(sessionId: string): Promise<GameSession> {
    const session = await this.gameSessionModel.findOne({ 
      sessionId,
      isExpired: false, 
    }).exec();
    
    if (!session) {
      throw new NotFoundException(`Game session with ID ${sessionId} not found`);
    }
    
    return session;
  }

  async findByAccessCode(accessCode: string): Promise<GameSession> {
    const session = await this.gameSessionModel.findOne({
      accessCode,
      isExpired: false,
      status: { $in: [GameSessionStatus.CREATED, GameSessionStatus.WAITING, GameSessionStatus.ACTIVE] },
    }).exec();
    
    if (!session) {
      throw new NotFoundException(`Game session with access code ${accessCode} not found`);
    }
    
    return session;
  }

  async update(
    sessionId: string,
    hostId: string,
    updateGameSessionDto: UpdateGameSessionDto,
  ): Promise<GameSession> {
    const session = await this.gameSessionModel.findOne({ 
      sessionId,
      hostId,
      isExpired: false,
    }).exec();
    
    if (!session) {
      throw new NotFoundException(`Game session with ID ${sessionId} not found or you're not the host`);
    }
    
    // Check if we're trying to update the status
    if (updateGameSessionDto.status) {
      await this.validateStatusTransition(session, updateGameSessionDto.status);
      
      // Set timestamps based on status changes
      if (updateGameSessionDto.status === GameSessionStatus.ACTIVE && !session.startedAt) {
        session.startedAt = new Date();
      } else if (
        (updateGameSessionDto.status === GameSessionStatus.COMPLETED || 
         updateGameSessionDto.status === GameSessionStatus.TERMINATED) && 
        !session.endedAt
      ) {
        session.endedAt = new Date();
      }
    }
    
    // Update settings and other fields
    if (updateGameSessionDto.settings) {
      session.settings = {
        ...session.settings,
        ...updateGameSessionDto.settings,
      };
    }
    
    // Apply all other updates
    Object.assign(session, updateGameSessionDto);
    
    await session.save();
    this.logger.log(`Game session updated: ${sessionId} by host: ${hostId}`);
    return session;
  }

  private async validateStatusTransition(
    session: GameSession,
    newStatus: GameSessionStatus,
  ): Promise<void> {
    const currentStatus = session.status;
    
    // Define valid state transitions
    const validTransitions = {
      [GameSessionStatus.CREATED]: [GameSessionStatus.WAITING, GameSessionStatus.TERMINATED],
      [GameSessionStatus.WAITING]: [GameSessionStatus.ACTIVE, GameSessionStatus.TERMINATED],
      [GameSessionStatus.ACTIVE]: [GameSessionStatus.COMPLETED, GameSessionStatus.TERMINATED],
      [GameSessionStatus.COMPLETED]: [GameSessionStatus.TERMINATED],
      [GameSessionStatus.TERMINATED]: [],
    };
    
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  async remove(sessionId: string, hostId: string): Promise<void> {
    const session = await this.gameSessionModel.findOne({ 
      sessionId,
      hostId,
      isExpired: false,
    }).exec();
    
    if (!session) {
      throw new NotFoundException(`Game session with ID ${sessionId} not found or you're not the host`);
    }
    
    // Mark as terminated and set end time
    session.status = GameSessionStatus.TERMINATED;
    session.endedAt = new Date();
    session.isExpired = true;
    await session.save();
    
    this.logger.log(`Game session terminated: ${sessionId} by host: ${hostId}`);
  }

  async addParticipant(sessionId: string, participantId: string): Promise<GameSession> {
    const session = await this.gameSessionModel.findOne({ 
      sessionId,
      isExpired: false,
    }).exec();
    
    if (!session) {
      throw new NotFoundException(`Game session with ID ${sessionId} not found`);
    }
    
    // Check if the session is joinable
    if (
      session.status === GameSessionStatus.COMPLETED || 
      session.status === GameSessionStatus.TERMINATED
    ) {
      throw new BadRequestException('Cannot join a completed or terminated session');
    }
    
    // Check if late join is allowed
    if (
      session.status === GameSessionStatus.ACTIVE && 
      !session.settings.allowLateJoin
    ) {
      throw new BadRequestException('Late joining is not allowed for this session');
    }
    
    // Check if player limit reached
    if (
      session.participantCount >= session.settings.maxPlayers && 
      !session.participants.includes(participantId)
    ) {
      throw new BadRequestException('Maximum number of players reached');
    }
    
    // Add participant if not already in the list
    if (!session.participants.includes(participantId)) {
      session.participants.push(participantId);
      session.participantCount = session.participants.length;
      
      // If session was in CREATED state, move to WAITING when first participant joins
      if (
        session.status === GameSessionStatus.CREATED && 
        session.participants.length > 0
      ) {
        session.status = GameSessionStatus.WAITING;
      }
      
      await session.save();
    }
    
    return session;
  }

  async removeParticipant(sessionId: string, participantId: string): Promise<GameSession> {
    const session = await this.gameSessionModel.findOne({ 
      sessionId,
      isExpired: false,
    }).exec();
    
    if (!session) {
      throw new NotFoundException(`Game session with ID ${sessionId} not found`);
    }
    
    // Remove participant if in the list
    const index = session.participants.indexOf(participantId);
    if (index !== -1) {
      session.participants.splice(index, 1);
      session.participantCount = session.participants.length;
      await session.save();
    }
    
    return session;
  }

  @Interval(3600000) // Run every hour
  async cleanupExpiredSessions() {
    const now = new Date();
    
    // Find sessions that need to be expired
    const sessionsToExpire = await this.gameSessionModel.find({
      isExpired: false,
      expiresAt: { $lt: now },
    }).exec();
    
    if (sessionsToExpire.length > 0) {
      // Mark sessions as expired
      await this.gameSessionModel.updateMany(
        { _id: { $in: sessionsToExpire.map(s => s._id) } },
        { isExpired: true }
      );
      
      this.logger.log(`Expired ${sessionsToExpire.length} game sessions`);
    }
    
    // Find and delete terminated sessions older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deleteResult = await this.gameSessionModel.deleteMany({
      status: GameSessionStatus.TERMINATED,
      updatedAt: { $lt: thirtyDaysAgo },
    }).exec();
    
    if (deleteResult.deletedCount > 0) {
      this.logger.log(`Deleted ${deleteResult.deletedCount} old terminated game sessions`);
    }
  }
}
