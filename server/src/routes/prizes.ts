import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const prizeSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  pointCost: z.number().int().min(1),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().default(true),
});

// Public — dashboard prize shop
router.get('/', async (_req, res, next) => {
  try {
    const prizes = await prisma.prize.findMany({
      where: { isActive: true },
      orderBy: { pointCost: 'asc' },
    });
    res.json(prizes);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const prize = await prisma.prize.findUnique({ where: { id: Number(req.params.id) } });
    if (!prize) throw new AppError(404, 'Prize not found');
    res.json(prize);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = prizeSchema.parse(req.body);
    const prize = await prisma.prize.create({ data });
    res.status(201).json(prize);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = prizeSchema.partial().parse(req.body);
    const prize = await prisma.prize.update({ where: { id: Number(req.params.id) }, data });
    res.json(prize);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.prize.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
