// src/game-session/game-session.controller.ts
// Add this constructor to your existing GameSessionController class
// or update the existing constructor

constructor(
  private readonly gameSessionService: GameSessionService,
  private readonly sessionCodeService: SessionCodeService, // Add this line
) {}

// Then add these new methods to your existing controller

@Post(':sessionId/generate-code')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Generate a join code for a game session' })
@ApiParam({ name: 'sessionId', description: 'The game session ID' })
@ApiResponse({ status: 201, description: 'Join code generated successfully' })
async generateJoinCode(
  @Req() req,
  @Param('sessionId') sessionId: string,
) {
  const userId = req.user.id;
  
  // Verify the session exists and user is host
  const session = await this.gameSessionService.findOne(sessionId);
  if (session.hostId !== userId) {
    throw new ForbiddenException('Only the host can generate join codes');
  }
  
  // Generate a new primary code
  const sessionCode = await this.sessionCodeService.regeneratePrimaryCode(sessionId);
  
  return {
    code: sessionCode.code,
    expiresAt: sessionCode.expiresAt,
  };
}

@Get(':sessionId/qr-code')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Get a QR code for the current join code' })
@ApiParam({ name: 'sessionId', description: 'The game session ID' })
@ApiQuery({ name: 'baseUrl', description: 'Base URL for the QR code link', required: false })
@ApiResponse({ status: 200, description: 'QR code generated successfully' })
async getQrCode(
  @Req() req,
  @Param('sessionId') sessionId: string,
  @Query('baseUrl') baseUrl: string = 'https://yourgame.com',
  @Res() response: Response,
) {
  const userId = req.user.id;
  
  // Verify the session exists and user is host
  const session = await this.gameSessionService.findOne(sessionId);
  if (session.hostId !== userId) {
    throw new ForbiddenException('Only the host can access the QR code');
  }
  
  // Get the primary code for this session
  const primaryCode = await this.sessionCodeService.getPrimaryCodeForSession(sessionId);
  
  if (!primaryCode) {
    throw new NotFoundException('No active join code found for this session');
  }
  
  // Generate QR code
  const qrDataUrl = await this.sessionCodeService.generateQRCode(primaryCode.code, baseUrl);
  
  // Set content type to image
  response.type('image/png');
  
  // Remove the data URL prefix to get just the base64 data
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Send the buffer as response
  response.send(buffer);
}

@Post('join-by-code')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: 'Join a game session using a code' })
@ApiResponse({ status: 200, description: 'Successfully joined the game session' })
@ApiResponse({ status: 404, description: 'Code not found or expired' })
async joinByCode(@Req() req, @Body() joinDto: { code: string }) {
  const userId = req.user.id;
  
  // Validate and mark the code as used
  const sessionCode = await this.sessionCodeService.markCodeAsUsed(joinDto.code);
  
  // Get the game session ID
  const gameSessionId = sessionCode.gameSessionId.toString();
  
  // Add user to the game session
  await this.gameSessionService.addParticipant(gameSessionId, userId);
  
  return {
    message: 'Successfully joined the game session',
    sessionId: gameSessionId,
  };
}
