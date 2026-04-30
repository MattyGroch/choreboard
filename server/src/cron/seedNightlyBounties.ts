import { prisma } from '../lib/prisma';
import { getWeekStart, todayUTC, endOfDayUTC } from '../lib/dates';
import { addDays } from 'date-fns';

export async function seedNightlyBounties(): Promise<void> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const weekStartDay = settings?.weekStartDay ?? 0;

  const today = todayUTC();
  const todayDow = today.getUTCDay();
  const weekStart = getWeekStart(weekStartDay, today);
  const weekEnd = addDays(weekStart, 6);
  const weekEndMs = new Date(
    Date.UTC(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth(), weekEnd.getUTCDate(), 23, 59, 59, 999)
  );

  const templates = await prisma.bountyTemplate.findMany({
    where: { isActive: true, recurrence: { not: 'NONE' } },
  });

  for (const template of templates) {
    if (template.recurrence === 'DAILY') {
      const existing = await prisma.bounty.findFirst({
        where: {
          templateId: template.id,
          createdAt: { gte: today },
        },
      });
      if (!existing) {
        await prisma.bounty.create({
          data: {
            templateId: template.id,
            name: template.name,
            description: template.description,
            pointValue: template.pointValue,
            maxClaims: template.maxClaims,
            expiresAt: endOfDayUTC(today),
          },
        });
      }
    } else if (template.recurrence === 'WEEKLY') {
      if (todayDow !== template.recurrenceDayOfWeek) continue;

      const existing = await prisma.bounty.findFirst({
        where: {
          templateId: template.id,
          createdAt: { gte: weekStart },
        },
      });
      if (!existing) {
        await prisma.bounty.create({
          data: {
            templateId: template.id,
            name: template.name,
            description: template.description,
            pointValue: template.pointValue,
            maxClaims: template.maxClaims,
            expiresAt: weekEndMs,
          },
        });
      }
    }
  }

  console.log('[cron] Nightly bounty seeding complete');
}
