// src/game-session/game-session.service.ts
// Add this method to your existing GameSessionService class

/**
 * Find a game session by ID
 */
async findById(id: string): Promise<GameSession> {
  const session = await this.gameSessionModel.findById(id).exec();
  
  if (!session) {
    throw new NotFoundException(`Game session with ID ${id} not found`);
  }
  
  return session;
}

// Update the create method to automatically generate a session code
// in the existing GameSessionService class

async create(userId: string, createGameSessionDto: CreateGameSessionDto): Promise<GameSession> {
  const sessionId = createGameSessionDto.sessionId || uuidv4();
  
  // Set expiration date (24 hours from now by default)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const createdSession = new this.gameSessionModel({
    sessionId,
    hostId: userId,
    status: GameSessionStatus.CREATED,
    settings: createGameSessionDto.settings,
    expiresAt,
  });

  const session = await createdSession.save();
  
  // Generate a session code (handled in the controller via SessionCodeService)
  // This is moved to the controller to avoid circular dependencies
  
  this.logger.log(`Game session created: ${sessionId} by host: ${userId}`);
  return session;
}
