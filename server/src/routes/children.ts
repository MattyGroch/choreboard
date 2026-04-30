import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getWeekStart, getWeekEnd } from '../lib/dates';
import { addDays } from 'date-fns';

const router = Router();

const childSchema = z.object({
  name: z.string().min(1),
  avatarEmoji: z.string().min(1),
  pin: z.string().length(4).regex(/^\d{4}$/).nullable().optional(),
  baseAllowance: z.number().int().min(0),
});

const safeSelect = {
  id: true,
  name: true,
  avatarEmoji: true,
  pointBalance: true,
  weekStreak: true,
  baseAllowance: true,
  createdAt: true,
};

// Public — returns safe fields + pendingPrizeCount
router.get('/', async (_req, res, next) => {
  try {
    const children = await prisma.child.findMany({
      select: {
        ...safeSelect,
        prizeRequests: {
          where: { status: 'PENDING' },
          select: { id: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    res.json(
      children.map((c) => ({
        id: c.id,
        name: c.name,
        avatarEmoji: c.avatarEmoji,
        pointBalance: c.pointBalance,
        weekStreak: c.weekStreak,
        baseAllowance: c.baseAllowance,
        createdAt: c.createdAt,
        pendingPrizeCount: c.prizeRequests.length,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const child = await prisma.child.findUnique({
      where: { id: Number(req.params.id) },
      select: { ...safeSelect, pin: true },
    });
    if (!child) throw new AppError(404, 'Child not found');
    res.json(child);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = childSchema.parse(req.body);
    const child = await prisma.child.create({
      data: {
        name: data.name,
        avatarEmoji: data.avatarEmoji,
        pin: data.pin ?? null,
        baseAllowance: data.baseAllowance,
      },
    });
    res.status(201).json(child);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = childSchema.partial().parse(req.body);
    const child = await prisma.child.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(child);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.child.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/transactions', requireAuth, async (req, res, next) => {
  try {
    const transactions = await prisma.pointTransaction.findMany({
      where: { childId: Number(req.params.id) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/week-summary', requireAuth, async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new AppError(404, 'Child not found');

    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const weekStart = getWeekStart(settings?.weekStartDay ?? 0);
    const weekEnd = getWeekEnd(settings?.weekStartDay ?? 0);

    const assignments = await prisma.choreAssignment.findMany({
      where: {
        childId,
        chore: { dueDate: { gte: weekStart, lte: addDays(weekEnd, 1) } },
      },
      include: { chore: true },
    });

    const penaltyEnabled = settings?.penaltyDeductionEnabled ?? true;
    let totalPenalty = 0;
    if (penaltyEnabled) {
      for (const a of assignments) {
        if (!a.approvedAt) totalPenalty += a.chore.penaltyValue;
      }
    }

    const projectedPayout = Math.max(0, child.baseAllowance - totalPenalty);

    res.json({
      childId,
      weekStart,
      weekEnd,
      assignments,
      totalPenalty,
      projectedPayout,
      baseAllowance: child.baseAllowance,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
