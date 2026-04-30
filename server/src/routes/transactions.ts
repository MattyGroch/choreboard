import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      childId: z.number().int(),
      amount: z.number().int().refine((n) => n !== 0, { message: 'Amount must be non-zero' }),
      note: z.string().min(1),
    });
    const { childId, amount, note } = schema.parse(req.body);

    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) throw new AppError(404, 'Child not found');

    const [tx] = await prisma.$transaction([
      prisma.pointTransaction.create({
        data: { childId, amount, type: 'MANUAL', note },
      }),
      prisma.child.update({
        where: { id: childId },
        data: { pointBalance: { increment: amount } },
      }),
    ]);

    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
});

export default router;
