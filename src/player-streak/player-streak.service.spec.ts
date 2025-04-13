
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PlayerStreakService } from './player-streak.service';
import { PlayerStreak, PlayerStreakDocument } from './schemas/player-streak.schema';

describe('PlayerStreakService', () => {
  let service: PlayerStreakService;
  let model: Model<PlayerStreakDocument>;

  const mockPlayerStreakModel = {
    findOne: jest.fn(),
    constructor: jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(undefined),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerStreakService,
        {
          provide: getModelToken(PlayerStreak.name),
          useValue: mockPlayerStreakModel,
        },
      ],
    }).compile();

    service = module.get<PlayerStreakService>(PlayerStreakService);
    model = module.get<Model<PlayerStreakDocument>>(getModelToken(PlayerStreak.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlayerStreak', () => {
    it('should return an existing player streak', async () => {
      const mockStreak = {
        userId: new Types.ObjectId('5f7d7bed3bd6d20f6428a84b'),
        currentStreak: 5,
        highestStreak: 10,
        lastCorrectAnswerAt: new Date(),
        streakMilestones: { '3': true, '5': true },
        streakBonusActive: true,
        save: jest.fn().mockResolvedValue(true),
      };
      
      jest.spyOn(model, 'findOne').mockResolvedValueOnce(mockStreak as any);
      
      const result = await service.getPlayerStreak('5f7d7bed3bd6d20f6428a84b');
      expect(result).toEqual(mockStreak);
    });
  });

  // Add more tests for other methods
});