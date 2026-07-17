import { ConsultController } from '../consult.controller';

describe('ConsultController behavior persistence', () => {
  const makeController = () => {
    const prisma = {
      consultRecord: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      interactionEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      namingResult: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      generationRun: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const consultService = {} as any;
    const personProfileService = {} as any;
    const routerService = {} as any;
    const orchestrator = {} as any;
    const behaviorService = {
      track: jest.fn(),
    };

    const controller = new ConsultController(
      prisma as any,
      consultService,
      personProfileService,
      routerService,
      orchestrator,
      behaviorService as any,
    );

    return { controller, prisma, behaviorService };
  };

  it('persists naming favorite as interaction event', async () => {
    const { controller, prisma, behaviorService } = makeController();
    prisma.consultRecord.findUnique.mockResolvedValue({
      id: 'record-1',
      userId: 'user-1',
      anonymousId: null,
    });
    prisma.interactionEvent.create.mockResolvedValue({ id: 'evt-1' });

    const result = await controller.saveBehavior(
      'record-1',
      { action: 'favorite', name: '陈知远' },
      { user: { id: 'user-1' } },
    );

    expect(behaviorService.track).toHaveBeenCalledWith('user-1', 'record-1', 'naming_favorite');
    expect(prisma.interactionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          recordId: 'record-1',
          eventType: 'naming_favorite',
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      recordId: 'record-1',
      eventType: 'naming_favorite',
    });
  });

  it('marks record shareGenerated when poster event is saved', async () => {
    const { controller, prisma, behaviorService } = makeController();
    prisma.consultRecord.findUnique.mockResolvedValue({
      id: 'record-2',
      userId: 'user-2',
      anonymousId: 'anon-2',
    });
    prisma.interactionEvent.create.mockResolvedValue({ id: 'evt-2' });
    prisma.consultRecord.update.mockResolvedValue({ id: 'record-2', shareGenerated: true });

    await controller.saveBehavior(
      'record-2',
      { eventType: 'poster_generated', payload: { routeType: 'ziping' } },
      { user: { id: 'user-2' } },
    );

    expect(behaviorService.track).toHaveBeenCalledWith('user-2', 'record-2', 'poster_generated');
    expect(prisma.consultRecord.update).toHaveBeenCalledWith({
      where: { id: 'record-2' },
      data: { shareGenerated: true },
    });
  });

  it('persists explicit candidate comparison state', async () => {
    const { controller, prisma, behaviorService } = makeController();
    prisma.consultRecord.findUnique.mockResolvedValue({ id: 'record-3', userId: 'user-3', anonymousId: null });
    prisma.interactionEvent.create.mockResolvedValue({ id: 'evt-3' });

    await controller.saveBehavior(
      'record-3',
      { eventType: 'naming_compare', payload: { candidateId: 'cand-a', selected: true } },
      { user: { id: 'user-3' } },
    );

    expect(behaviorService.track).toHaveBeenCalledWith('user-3', 'record-3', 'naming_compare');
    expect(prisma.interactionEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'naming_compare',
        eventJson: JSON.stringify({ candidateId: 'cand-a', selected: true }),
      }),
    }));
  });

  it('uses req.user.id and rebuilds naming selection state in history', async () => {
    const { controller, prisma } = makeController();
    prisma.namingResult.findMany.mockResolvedValue([
      { id: 'n1', consultRecordId: 'record-4', userId: 'user-4', names: '[{"candidateId":"cand-a","names":["知远"]}]' },
    ]);
    prisma.namingResult.count.mockResolvedValue(1);
    prisma.interactionEvent.findMany.mockResolvedValue([
      { recordId: 'record-4', eventType: 'naming_favorite', eventJson: '{"candidateId":"cand-a"}', createdAt: new Date() },
      { recordId: 'record-4', eventType: 'naming_final_select', eventJson: '{"candidateId":"cand-a"}', createdAt: new Date() },
    ]);

    const result = await controller.getNamingHistory({ user: { id: 'user-4' } }, '1', '20');

    expect(prisma.namingResult.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-4' } }));
    expect(result.records[0]).toMatchObject({
      names: [{ candidateId: 'cand-a', names: ['知远'] }],
      selectionState: {
        favoriteCandidateIds: ['cand-a'],
        finalCandidateId: 'cand-a',
      },
    });
  });
});
