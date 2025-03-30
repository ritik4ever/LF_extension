// src/game-session/game-session.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { GameSessionStatus } from './schemas/game-session.schema';

interface JoinSessionPayload {
  sessionId: string;
}

interface UpdateSessionPayload {
  sessionId: string;
  status?: GameSessionStatus;
  settings?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'game-sessions',
})
export class GameSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameSessionGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly gameSessionService: GameSessionService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token and verify (implementation depends on your auth strategy)
      const token = client.handshake.auth.token || client.handshake.query.token;
      // Verify token and get userId - this is simplified, you should use your auth service
      const userId = await this.getUserIdFromToken(token as string);
      
      if (!userId) {
        client.disconnect();
        return;
      }
      
      // Store userId in socket data for later use
      client.data.userId = userId;
      
      this.logger.log(`Client connected to game sessions: ${client.id} for user ${userId}`);
    } catch (error) {
      this.logger.error('Connection error', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const { userId, sessionId } = client.data;
      
      // If client was in a session room, handle leaving
      if (userId && sessionId) {
        client.leave(`session_${sessionId}`);
        this.logger.log(`Client left session ${sessionId}: ${client.id} for user ${userId}`);
      }
      
      this.logger.log(`Client disconnected from game sessions: ${client.id}`);
    } catch (error) {
      this.logger.error('Disconnect error', error);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionPayload,
  ) {
    try {
      const userId = client.data.userId;
      const { sessionId } = payload;
      
      // Get session to validate it exists
      const session = await this.gameSessionService.findOne(sessionId);
      
      // Add user to participants if not already
      await this.gameSessionService.addParticipant(sessionId, userId);
      
      // Join socket room for this session
      client.join(`session_${sessionId}`);
      client.data.sessionId = sessionId;
      
      // Notify everyone in the room that a new player joined
      this.server.to(`session_${sessionId}`).emit('playerJoined', {
        userId,
        sessionId,
        participantCount: