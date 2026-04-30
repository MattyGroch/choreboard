import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getWeekStart, parseDateParam, toUTCMidnight } from '../lib/dates';
import { addDays } from 'date-fns';

const router = Router();

const assignmentInclude = {
  assignments: {
    include: {
      child: { select: { id: true, name: true, avatarEmoji: true } },
    },
  },
};

// Public — dashboard needs this
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const weekStartDay = settings?.weekStartDay ?? 0;

    let weekStart: Date;
    if (typeof req.query.weekStart === 'string') {
      weekStart = parseDateParam(req.query.weekStart);
    } else {
      weekStart = getWeekStart(weekStartDay);
    }
    const weekEnd = addDays(weekStart, 7);

    const chores = await prisma.chore.findMany({
      where: { dueDate: { gte: weekStart, lt: weekEnd } },
      include: assignmentInclude,
      orderBy: [{ dueDate: 'asc' }, { name: 'asc' }],
    });

    res.json(chores);
  } catch (err) {
    next(err);
  }
});

// Create a one-off chore for the current week
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      penaltyValue: z.number().int().min(0),
      isShared: z.boolean().default(false),
      dueDate: z.string(),
      childIds: z.array(z.number().int()).min(1),
    });
    const data = schema.parse(req.body);
    const dueDate = toUTCMidnight(new Date(data.dueDate));

    const chore = await prisma.chore.create({
      data: {
        name: data.name,
        description: data.description,
        penaltyValue: data.penaltyValue,
        isShared: data.isShared,
        dueDate,
        assignments: {
          create: data.childIds.map((childId) => ({ childId })),
        },
      },
      include: assignmentInclude,
    });

    res.status(201).json(chore);
  } catch (err) {
    next(err);
  }
});

// Update penalty value on a single chore instance
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      penaltyValue: z.number().int().min(0).optional(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const chore = await prisma.chore.update({
      where: { id: Number(req.params.id) },
      data,
      include: assignmentInclude,
    });
    res.json(chore);
  } catch (err) {
    next(err);
  }
});

// Public — child marks their own assignment done (PIN validated)
router.patch('/assignments/:assignmentId/complete', async (req, res, next) => {
  try {
    const schema = z.object({ pin: z.string().optional() });
    const { pin } = schema.parse(req.body);

    const assignment = await prisma.choreAssignment.findUnique({
      where: { id: Number(req.params.assignmentId) },
      include: { child: true },
    });
    if (!assignment) throw new AppError(404, 'Assignment not found');
    if (assignment.completedAt) throw new AppError(400, 'Already marked done');
    if (assignment.child.pin && assignment.child.pin !== pin) throw new AppError(403, 'Invalid PIN');

    const updated = await prisma.choreAssignment.update({
      where: { id: assignment.id },
      data: { completedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const choreId = Number(req.params.id);
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
      include: { assignments: true },
    });
    if (!chore) throw new AppError(404, 'Chore not found');

    const now = new Date();

    if (chore.isShared) {
      // Approve all assignments
      await prisma.choreAssignment.updateMany({
        where: { choreId },
        data: { approvedAt: now },
      });
    } else {
      const schema = z.object({ childId: z.number().int() });
      const { childId } = schema.parse(req.body);
      const assignment = await prisma.choreAssignment.findUnique({
        where: { choreId_childId: { choreId, childId } },
      });
      if (!assignment) throw new AppError(404, 'Assignment not found');
      await prisma.choreAssignment.update({
        where: { id: assignment.id },
        data: { approvedAt: now },
      });
    }

    // Mark chore COMPLETE if all assignments are now approved
    const pending = await prisma.choreAssignment.count({
      where: { choreId, approvedAt: null },
    });
    if (pending === 0) {
      await prisma.chore.update({ where: { id: choreId }, data: { status: 'COMPLETE' } });
    }

    const updated = await prisma.chore.findUnique({
      where: { id: choreId },
      include: assignmentInclude,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/skip', requireAuth, async (req, res, next) => {
  try {
    const choreId = Number(req.params.id);
    const chore = await prisma.chore.update({
      where: { id: choreId },
      data: { status: 'SKIPPED' },
      include: assignmentInclude,
    });
    res.json(chore);
  } catch (err) {
    next(err);
  }
});

export default router;
