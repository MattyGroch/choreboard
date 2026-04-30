import { prisma } from '../lib/prisma';
import { getWeekStart, toUTCMidnight } from '../lib/dates';
import { addDays } from 'date-fns';

export async function seedWeeklyChores(): Promise<void> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const weekStartDay = settings?.weekStartDay ?? 0;
  const weekStart = getWeekStart(weekStartDay);

  const templates = await prisma.choreTemplate.findMany({
    where: { isActive: true, isRecurring: true },
  });

  const allChildren = await prisma.child.findMany({ select: { id: true } });

  for (const template of templates) {
    for (const dayOffset of template.recurrenceDays) {
      const dueDate = toUTCMidnight(addDays(weekStart, dayOffset));

      // Skip if a chore for this template+day already exists
      const existing = await prisma.chore.findFirst({
        where: { templateId: template.id, dueDate },
      });
      if (existing) continue;

      const childIds =
        template.assignedChildIds.length > 0
          ? template.assignedChildIds
          : allChildren.map((c) => c.id);

      await prisma.chore.create({
        data: {
          templateId: template.id,
          name: template.name,
          description: template.description,
          penaltyValue: template.penaltyValue,
          isShared: template.isShared,
          dueDate,
          assignments: {
            create: childIds.map((childId) => ({ childId })),
          },
        },
      });
    }
  }

  console.log(`[cron] Seeded weekly chores for week starting ${weekStart.toISOString()}`);
}
