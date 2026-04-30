import { prisma } from '../lib/prisma';
import { todayUTC } from '../lib/dates';
import { addDays } from 'date-fns';

export async function autoApproveZeroPenaltyChores(): Promise<void> {
  const today = todayUTC();
  const tomorrow = addDays(today, 1);
  const now = new Date();

  // Find all OPEN chores due today with penaltyValue = 0
  const chores = await prisma.chore.findMany({
    where: {
      status: 'OPEN',
      penaltyValue: 0,
      dueDate: { gte: today, lt: tomorrow },
    },
    include: { assignments: true },
  });

  for (const chore of chores) {
    await prisma.choreAssignment.updateMany({
      where: { choreId: chore.id, approvedAt: null },
      data: { approvedAt: now },
    });
    await prisma.chore.update({
      where: { id: chore.id },
      data: { status: 'COMPLETE' },
    });
  }

  if (chores.length > 0) {
    console.log(`[cron] Auto-approved ${chores.length} zero-penalty chore(s)`);
  }
}
