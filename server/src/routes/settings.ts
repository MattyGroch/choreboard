import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

const settingsSchema = z.object({
  weekStartDay: z.number().int().min(0).max(6).optional(),
  penaltyDeductionEnabled: z.boolean().optional(),
});

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    const weekEndDay = (settings.weekStartDay + 6) % 7;
    res.json({ ...settings, weekEndDay });
  } catch (err) {
    next(err);
  }
});

router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const data = settingsSchema.parse(req.body);
    const settings = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    const weekEndDay = (settings.weekStartDay + 6) % 7;
    res.json({ ...settings, weekEndDay });
  } catch (err) {
    next(err);
  }
});

export default router;
