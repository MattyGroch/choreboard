import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  penaltyValue: z.number().int().min(0),
  isRecurring: z.boolean().default(true),
  recurrenceDays: z.array(z.number().int().min(0).max(6)),
  isShared: z.boolean().default(false),
  assignedChildIds: z.array(z.number().int()).default([]),
  isActive: z.boolean().default(true),
});

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const templates = await prisma.choreTemplate.findMany({ orderBy: { name: 'asc' } });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const t = await prisma.choreTemplate.findUnique({ where: { id: Number(req.params.id) } });
    if (!t) throw new AppError(404, 'Template not found');
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = templateSchema.parse(req.body);
    const t = await prisma.choreTemplate.create({ data });
    res.status(201).json(t);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = templateSchema.partial().parse(req.body);
    const t = await prisma.choreTemplate.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.choreTemplate.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
