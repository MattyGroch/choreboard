import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const requests = await prisma.prizeRequest.findMany({
      where: status ? { status: status as 'PENDING' | 'GIVEN' | 'CANCELLED' } : undefined,
      include: {
        child: { select: { id: true, name: true, avatarEmoji: true } },
        prize: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// Public — PIN validated server-side
router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      childId: z.number().int(),
      prizeId: z.number().int(),
      pin: z.string().optional(),
    });
    const { childId, prizeId, pin } = schema.parse(req.body);

    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new AppError(404, 'Child not found');
    if (child.pin && child.pin !== pin) throw new AppError(403, 'Invalid PIN');

    const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
    if (!prize) throw new AppError(404, 'Prize not found');
    if (!prize.isActive) throw new AppError(400, 'Prize is not active');

    const request = await prisma.prizeRequest.create({
      data: { childId, prizeId },
      include: {
        child: { select: { id: true, name: true, avatarEmoji: true } },
        prize: true,
      },
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/give', requireAuth, async (req, res, next) => {
  try {
    const request = await prisma.prizeRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { prize: true, child: true },
    });
    if (!request) throw new AppError(404, 'Request not found');
    if (request.status !== 'PENDING') throw new AppError(400, 'Request is not pending');
    if (request.child.pointBalance < request.prize.pointCost) {
      throw new AppError(400, 'Insufficient points');
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.prizeRequest.update({
        where: { id: request.id },
        data: { status: 'GIVEN', givenAt: now },
      }),
      prisma.child.update({
        where: { id: request.childId },
        data: { pointBalance: { decrement: request.prize.pointCost } },
      }),
      prisma.pointTransaction.create({
        data: {
          childId: request.childId,
          amount: -request.prize.pointCost,
          type: 'PRIZE',
          referenceId: request.id,
          note: `Prize redeemed: ${request.prize.name}`,
        },
      }),
    ]);

    const updated = await prisma.prizeRequest.findUnique({
      where: { id: request.id },
      include: {
        child: { select: { id: true, name: true, avatarEmoji: true } },
        prize: true,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const request = await prisma.prizeRequest.update({
      where: { id: Number(req.params.id) },
      data: { status: 'CANCELLED' },
    });
    res.json(request);
  } catch (err) {
    next(err);
  }
});

export default router;
