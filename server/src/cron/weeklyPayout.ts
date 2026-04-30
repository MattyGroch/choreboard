import { prisma } from '../lib/prisma';
import { getWeekStart, weekEndDay, todayUTC } from '../lib/dates';
import { addDays } from 'date-fns';

export async function runWeeklyPayout(): Promise<void> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const weekStartDay = settings?.weekStartDay ?? 0;
  const penaltyEnabled = settings?.penaltyDeductionEnabled ?? true;

  const today = todayUTC();
  const todayDow = today.getUTCDay();
  const endDay = weekEndDay(weekStartDay);

  if (todayDow !== endDay) return;

  const weekStart = getWeekStart(weekStartDay, today);
  const weekEndDate = addDays(weekStart, 7);

  const children = await prisma.child.findMany();

  for (const child of children) {
    const assignments = await prisma.choreAssignment.findMany({
      where: {
        childId: child.id,
        chore: { dueDate: { gte: weekStart, lt: weekEndDate } },
      },
      include: { chore: true },
    });

    let totalPenalty = 0;
    if (penaltyEnabled) {
      for (const a of assignments) {
        if (!a.approvedAt) {
          totalPenalty += a.chore.penaltyValue;
        }
      }
    }

    const payout = Math.max(0, child.baseAllowance - totalPenalty);
    const now = new Date();

    await prisma.$transaction([
      prisma.child.update({
        where: { id: child.id },
        data: {
          pointBalance: { increment: payout },
          weekStreak:
            payout === child.baseAllowance
              ? { increment: 1 }
              : 0,
        },
      }),
      prisma.pointTransaction.create({
        data: {
          childId: child.id,
          amount: payout,
          type: 'ALLOWANCE',
          note: `Week of ${weekStart.toISOString().split('T')[0]}: base ${child.baseAllowance} - penalty ${totalPenalty} = ${payout}`,
        },
      }),
    ]);

    // Mark remaining OPEN chores as SKIPPED
    await prisma.chore.updateMany({
      where: {
        status: 'OPEN',
        dueDate: { gte: weekStart, lt: weekEndDate },
        assignments: { some: { childId: child.id } },
      },
      data: { status: 'SKIPPED' },
    });

    console.log(
      `[cron] Payout for ${child.name}: ${payout} pts (penalty: ${totalPenalty})`
    );
  }

  console.log('[cron] Weekly payout complete');
}
