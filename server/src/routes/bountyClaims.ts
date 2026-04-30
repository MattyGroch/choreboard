import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Public — PIN validated server-side
router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      bountyId: z.number().int(),
      childId: z.number().int(),
      pin: z.string().optional(),
    });
    const { bountyId, childId, pin } = schema.parse(req.body);

    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new AppError(404, 'Child not found');
    if (child.pin && child.pin !== pin) throw new AppError(403, 'Invalid PIN');

    const bounty = await prisma.bounty.findUnique({
      where: { id: bountyId },
      include: {
        claims: { where: { status: { not: 'CANCELLED' } } },
      },
    });
    if (!bounty) throw new AppError(404, 'Bounty not found');

    const now = new Date();
    if (bounty.expiresAt && bounty.expiresAt < now) {
      throw new AppError(400, 'Bounty has expired');
    }
    if (bounty.maxClaims !== null && bounty.claims.length >= bounty.maxClaims) {
      throw new AppError(400, 'Bounty is full');
    }

    const claim = await prisma.bountyClaim.create({
      data: { bountyId, childId },
    });

    res.status(201).json(claim);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/complete', async (req, res, next) => {
  try {
    const claim = await prisma.bountyClaim.findUnique({ where: { id: Number(req.params.id) } });
    if (!claim) throw new AppError(404, 'Claim not found');
    if (claim.status !== 'CLAIMED') throw new AppError(400, 'Claim is not in CLAIMED state');

    const updated = await prisma.bountyClaim.update({
      where: { id: claim.id },
      data: { status: 'COMPLETE', completedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const claim = await prisma.bountyClaim.findUnique({
      where: { id: Number(req.params.id) },
      include: { bounty: true, child: true },
    });
    if (!claim) throw new AppError(404, 'Claim not found');
    if (claim.status === 'APPROVED') throw new AppError(400, 'Already approved');
    if (claim.status === 'CANCELLED') throw new AppError(400, 'Claim was cancelled');

    const now = new Date();

    await prisma.$transaction([
      prisma.bountyClaim.update({
        where: { id: claim.id },
        data: { status: 'APPROVED', approvedAt: now },
      }),
      prisma.child.update({
        where: { id: claim.childId },
        data: { pointBalance: { increment: claim.bounty.pointValue } },
      }),
      prisma.pointTransaction.create({
        data: {
          childId: claim.childId,
          amount: claim.bounty.pointValue,
          type: 'BOUNTY',
          referenceId: claim.id,
          note: `Bounty approved: ${claim.bounty.name}`,
        },
      }),
    ]);

    const updated = await prisma.bountyClaim.findUnique({ where: { id: claim.id } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const claim = await prisma.bountyClaim.update({
      where: { id: Number(req.params.id) },
      data: { status: 'CANCELLED' },
    });
    res.json(claim);
  } catch (err) {
    next(err);
  }
});

export default router;
