// src/session-code/session-code.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { SessionCodeService } from './session-code.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GameSessionService } from '../game-session/game-session.service';

@ApiTags('session-codes')
@Controller('session-codes')
export class SessionCodeController {
  constructor(
    private readonly sessionCodeService: SessionCodeService,
    private readonly gameSessionService: GameSessionService,
  ) {}

  @Post('generate/:gameSessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a primary session code for a game session' })
  @ApiParam({ name: 'gameSessionId', description: 'The game session ID' })
  @ApiResponse({ status: 201, description: 'Session code generated successfully' })
  @ApiResponse({ status: 404, description: 'Game session not found' })
  async generateSessionCode(@Param('gameSessionId') gameSessionId: string) {
    // Verify the game session exists
    await this.gameSessionService.findOne(gameSessionId);
    
    // Generate a new primary code
    const sessionCode = await this.sessionCodeService.regeneratePrimaryCode(gameSessionId);
    
    return {
      code: sessionCode.code,
      expiresAt: sessionCode.expiresAt,
    };
  }

  @Post('single-use/:gameSessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a single-use session code for a game session' })
  @ApiParam({ name: 'gameSessionId', description: 'The game session ID' })
  @ApiResponse({ status: 201, description: 'Single-use code generated successfully' })
  async generateSingleUseCode(@Param('gameSessionId') gameSessionId: string) {
    // Verify the game session exists
    await this.gameSessionService.findOne(gameSessionId);
    
    // Generate a single-use code
    const sessionCode = await this.sessionCodeService.generateSingleUseCode(gameSessionId);
    
    return {
      code: sessionCode.code,
      expiresAt: sessionCode.expiresAt,
    };
  }

  @Get('session/:gameSessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active codes for a game session' })
  @ApiParam({ name: 'gameSessionId', description: 'The game session ID' })
  @ApiResponse({ status: 200, description: 'Returns all active codes for the session' })
  async getCodesForSession(@Param('gameSessionId') gameSessionId: string) {
    // Verify the game session exists
    await this.gameSessionService.findOne(gameSessionId);
    
    // Get all active codes
    const codes = await this.sessionCodeService.getCodesForSession(gameSessionId);
    
    // Return only the necessary information
    return codes.map(code => ({
      code: code.code,
      isPrimary: code.isPrimary,
      expiresAt: code.expiresAt,
      usageCount: code.usageCount,
    }));
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate a session code and get its game session' })
  @ApiParam({ name: 'code', description: 'The session code to validate' })
  @ApiResponse({ status: 200, description: 'Code is valid' })
  @ApiResponse({ status: 404, description: 'Code not found or expired' })
  async validateCode(@Param('code') code: string) {
    try {
      const sessionCode = await this.sessionCodeService.findByCode(code);
      
      // Get the game session for this code
      const gameSession = await this.gameSessionService.findById(sessionCode.gameSessionId.toString());
      
      return {
        valid: true,
        gameSessionId: sessionCode.gameSessionId,
        gameSession: {
          id: gameSession._id,
          name: gameSession.name, // Assuming your GameSession has a name field
          status: gameSession.status,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          valid: false,
          message: 'Invalid or expired code',
        };
      }
      throw error;
    }
  }

  @Post('use/:code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a code as used and join the associated game session' })
  @ApiParam({ name: 'code', description: 'The session code to use' })
  @ApiResponse({ status: 200, description: 'Successfully joined game session' })
  @ApiResponse({ status: 404, description: 'Code not found or expired' })
  async useCode(@Param('code') code: string) {
    // Mark the code as used
    const sessionCode = await this.sessionCodeService.markCodeAsUsed(code);
    
    // Return the game session details
    return {
      gameSessionId: sessionCode.gameSessionId,
      message: 'Successfully joined game session',
    };
  }

  @Get('qr/:code')
  @ApiOperation({ summary: 'Generate a QR code for a session code' })
  @ApiParam({ name: 'code', description: 'The session code' })
  @ApiQuery({ name: 'baseUrl', description: 'Base URL for the QR code link', required: false })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  @ApiResponse({ status: 404, description: 'Code not found or expired' })
  async generateQRCode(
    @Param('code') code: string,
    @Query('baseUrl') baseUrl: string = 'https://yourgame.com',
    @Res() response: Response,
  ) {
    const qrDataUrl = await this.sessionCodeService.generateQRCode(code, baseUrl);
    
    // Set content type to image
    response.type('image/png');
    
    // Remove the data URL prefix to get just the base64 data
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Send the buffer as response
    response.send(buffer);
  }

  @Post('expire/:code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Expire a specific session code' })
  @ApiParam({ name: 'code', description: 'The session code to expire' })
  @ApiResponse({ status: 200, description: 'Code expired successfully' })
  async expireCode(@Param('code') code: string) {
    await this.sessionCodeService.expireCode(code);
    
    return {
      message: 'Code expired successfully',
    };
  }

  @Post('expire-all/:gameSessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Expire all codes for a game session' })
  @ApiParam({ name: 'gameSessionId', description: 'The game session ID' })
  @ApiResponse({ status: 200, description: 'All codes expired successfully' })
  async expireAllCodes(@Param('gameSessionId') gameSessionId: string) {
    // Verify the game session exists
    await this.gameSessionService.findOne(gameSessionId);
    
    // Expire all codes
    await this.sessionCodeService.expireAllCodesForSession(gameSessionId);
    
    return {
      message: 'All codes expired successfully',
    };
  }
}
