// src/game-session/game-session.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GameSessionService } from './game-session.service';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';
import { JoinGameSessionDto } from './dto/join-game-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GameSessionStatus } from './schemas/game-session.schema';

@ApiTags('game-sessions')
@Controller('game-sessions')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new game session' })
  @ApiResponse({ status: 201, description: 'The game session has been created' })
  create(@Req() req, @Body() createGameSessionDto: CreateGameSessionDto) {
    const userId = req.user.id;
    return this.gameSessionService.create(userId, createGameSessionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all game sessions' })
  @ApiQuery({ name: 'status', enum: GameSessionStatus, required: false })
  @ApiQuery({ name: 'isPublic', type: Boolean, required: false })
  findAll(
    @Query('status') status?: GameSessionStatus,
    @Query('isPublic') isPublic?: boolean,
  ) {
    const filters: any = {};
    
    if (status) {
      filters.status = status;
    }
    
    if (isPublic !== undefined) {
      filters['settings.isPublic'] = isPublic === true || isPublic === 'true';
    }
    
    return this.gameSessionService.findAll(filters);
  }

  @Get('my-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all game sessions hosted by the current user' })
  findAllByHost(@Req() req) {
    const userId = req.user.id;
    return this.gameSessionService.findAllByHost(userId);
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all public game sessions that can be joined' })
  findPublicSessions() {
    return this.gameSessionService.findPublicSessions();
  }

  @Get(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single game session by ID' })
  @ApiParam({ name: 'sessionId', description: 'The game session ID' })
  @ApiResponse({ status: 200, description: 'Returns the game session' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  findOne(@Param('sessionId') sessionId: string) {
    return this.gameSessionService.findOne(sessionId);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a game session using an access code' })
  @ApiResponse({ status: 200, description: 'Successfully joined the game session' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  @ApiResponse({ status: 400, description: 'Cannot join this session' })
  async joinSession(@Req() req, @Body() joinGameSessionDto: JoinGameSessionDto) {
    const userId = req.user.id;
    
    // Find session by access code
    const session = await this.gameSessionService.findByAccessCode(joinGameSessionDto.accessCode);
    
    // Add participant to the session
    await this.gameSessionService.addParticipant(session.sessionId, userId);
    
    return { 
      message: 'Successfully joined the game session',
      sessionId: session.sessionId 
    };
  }

  @Post(':sessionId/participants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add current user as participant to a game session' })
  @ApiParam({ name: 'sessionId', description: 'The game session ID' })
  @ApiResponse({ status: 200, description: 'Successfully added as participant' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  @ApiResponse({ status: 400, description: 'Cannot join this session' })
  async addParticipant(@Req() req, @Param('sessionId') sessionId: string) {
    const userId = req.user.id;
    await this.gameSessionService.addParticipant(sessionId, userId);
    return { message: 'Successfully joined the game session' };
  }

  @Delete(':sessionId/participants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove current user from a game session' })
  @ApiParam({ name: 'sessionId', description: 'The game session ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeParticipant(@Req() req, @Param('sessionId') sessionId: string) {
    const userId = req.user.id;
    await this.gameSessionService.removeParticipant(sessionId, userId);
  }

  @Patch(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a game session' })
  @ApiParam({ name: 'sessionId', description: 'The game session ID' })
  @ApiResponse({ status: 200, description: 'The game session has been updated' })
  @ApiResponse({ status: 404, description: 'Game session not found or not host' })
  update(
    @Req() req,
    @Param('sessionId') sessionId: string,
    @Body() updateGameSessionDto: UpdateGameSessionDto,
  ) {
    const userId = req.user.id;
    return this.gameSessionService.update(sessionId, userId, updateGameSessionDto);
  }

  @Delete(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate a game session' })
  @ApiParam({ name: 'sessionId', description: 'The game session ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'The game session has been terminated' })
  @ApiResponse({ status: 404, description: 'Game session not found or not host' })
  async remove(@Req() req, @Param('sessionId') sessionId: string) {
    const userId = req.user.id;
    await this.gameSessionService.remove(sessionId, userId);
  }
  
  @Post(':sessionId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a game session' })
  @ApiParam({ name: 'sessionId', description: 'The game session ID' })
  @ApiResponse({ status: 200, description: 'The game session has been started' })
  async startSession(@Req() req, @Param('sessionId') sessionId: string) {
    const userId = req.user.id;
    const session = await this.gameSessionService.update(
      sessionId,
      userId,
      { status: GameSessionStatus.ACTIVE }
    );
    return { message: 'Game session started', session };
  }
  
  @Post(':sessionId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a game session as completed' })
  @ApiParam({ name: 'sessionId', description: 'The game session ID' })
  @ApiResponse({ status: 200, description: 'The game session has been completed' })
  async completeSession(@Req() req, @Param('sessionId') sessionId: string) {
    const userId = req.user.id;
    const session = await this.gameSessionService.update(
      sessionId,
      userId,
      { status: GameSessionStatus.COMPLETED }
    );
    return { message: 'Game session completed', session };
  }
}
