import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const claimsInclude = {
  claims: {
    where: { status: { not: 'CANCELLED' as const } },
    select: { id: true, childId: true, status: true },
  },
};

// Public — dashboard uses this
router.get('/', async (_req, res, next) => {
  try {
    const now = new Date();
    const bounties = await prisma.bounty.findMany({
      where: {
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { OR: [{ templateId: null }, { template: { isActive: true } }] },
        ],
      },
      include: claimsInclude,
      orderBy: { createdAt: 'desc' },
    });

    const open = bounties.filter(
      (b) => b.maxClaims === null || b.claims.length < b.maxClaims
    );

    res.json(
      open.map((b) => ({
        ...b,
        activeClaims: b.claims.length,
        slotsRemaining: b.maxClaims !== null ? b.maxClaims - b.claims.length : null,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      pointValue: z.number().int().min(1),
      maxClaims: z.number().int().min(1).nullable().optional(),
      expiresAt: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const bounty = await prisma.bounty.create({
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: claimsInclude,
    });
    res.status(201).json(bounty);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const bounty = await prisma.bounty.findUnique({ where: { id: Number(req.params.id) } });
    if (!bounty) throw new AppError(404, 'Bounty not found');
    await prisma.bounty.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
