import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function getWeekStart(weekStartDay: number, from: Date = new Date()): Date {
  const base = utcMidnight(from);
  const dow = base.getUTCDay();
  const daysBack = (dow - weekStartDay + 7) % 7;
  return new Date(base.getTime() - daysBack * 86400000);
}

async function main() {
  // Wipe in dependency order
  await prisma.pointTransaction.deleteMany();
  await prisma.prizeRequest.deleteMany();
  await prisma.bountyClaim.deleteMany();
  await prisma.bounty.deleteMany();
  await prisma.bountyTemplate.deleteMany();
  await prisma.choreAssignment.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.choreTemplate.deleteMany();
  await prisma.prize.deleteMany();
  await prisma.child.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  // AppSettings
  await prisma.appSettings.create({ data: { id: 1, weekStartDay: 0, penaltyDeductionEnabled: true } });

  // Users
  const hash = await bcrypt.hash('password', 10);
  await prisma.user.createMany({
    data: [
      { email: 'mom@example.com', passwordHash: hash, name: 'Mom', role: 'PARENT' },
      { email: 'dad@example.com', passwordHash: hash, name: 'Dad', role: 'PARENT' },
    ],
  });

  // Children
  const alex = await prisma.child.create({
    data: { name: 'Alex', avatarEmoji: '🦁', pin: '1234', baseAllowance: 60 },
  });
  const sam = await prisma.child.create({
    data: { name: 'Sam', avatarEmoji: '🐢', pin: '5678', baseAllowance: 50 },
  });
  const jordan = await prisma.child.create({
    data: { name: 'Jordan', avatarEmoji: '🦊', pin: null, baseAllowance: 55 },
  });
  const allChildIds = [alex.id, sam.id, jordan.id];

  // Chore Templates
  const makeBed = await prisma.choreTemplate.create({
    data: {
      name: 'Make bed',
      penaltyValue: 5,
      isRecurring: true,
      recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      isShared: false,
      assignedChildIds: allChildIds,
    },
  });

  const brushTeeth = await prisma.choreTemplate.create({
    data: {
      name: 'Brush teeth',
      penaltyValue: 3,
      isRecurring: true,
      recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      isShared: false,
      assignedChildIds: allChildIds,
    },
  });

  const cleanPlayroom = await prisma.choreTemplate.create({
    data: {
      name: 'Clean playroom',
      penaltyValue: 10,
      isRecurring: true,
      recurrenceDays: [3], // Wednesday
      isShared: true,
      assignedChildIds: [],
    },
  });

  // Seed this week's Chore instances
  const weekStart = getWeekStart(0); // Sunday
  const templates = [makeBed, brushTeeth, cleanPlayroom];

  for (const template of templates) {
    for (const dayOffset of template.recurrenceDays) {
      const dueDate = utcMidnight(addDays(weekStart, dayOffset));
      const childIds =
        template.assignedChildIds.length > 0 ? template.assignedChildIds : allChildIds;

      await prisma.chore.create({
        data: {
          templateId: template.id,
          name: template.name,
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

  // Bounty Templates
  const setTable = await prisma.bountyTemplate.create({
    data: {
      name: 'Set the table',
      pointValue: 15,
      maxClaims: 1,
      recurrence: 'DAILY',
    },
  });

  const sweepKitchen = await prisma.bountyTemplate.create({
    data: {
      name: 'Sweep the kitchen',
      pointValue: 25,
      maxClaims: 1,
      recurrence: 'WEEKLY',
      recurrenceDayOfWeek: 3,
    },
  });

  const helpGroceries = await prisma.bountyTemplate.create({
    data: {
      name: 'Help with groceries',
      pointValue: 20,
      maxClaims: 2,
      recurrence: 'NONE',
    },
  });

  // Bounty instances
  const now = new Date();
  const todayUTC = utcMidnight(now);
  const endOfToday = new Date(
    Date.UTC(
      todayUTC.getUTCFullYear(),
      todayUTC.getUTCMonth(),
      todayUTC.getUTCDate(),
      23, 59, 59, 999
    )
  );
  const weekEnd = addDays(weekStart, 6);
  const endOfWeek = new Date(
    Date.UTC(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth(), weekEnd.getUTCDate(), 23, 59, 59, 999)
  );

  await prisma.bounty.create({
    data: {
      templateId: setTable.id,
      name: setTable.name,
      pointValue: setTable.pointValue,
      maxClaims: setTable.maxClaims,
      expiresAt: endOfToday,
    },
  });

  await prisma.bounty.create({
    data: {
      templateId: sweepKitchen.id,
      name: sweepKitchen.name,
      pointValue: sweepKitchen.pointValue,
      maxClaims: sweepKitchen.maxClaims,
      expiresAt: endOfWeek,
    },
  });

  await prisma.bounty.create({
    data: {
      templateId: helpGroceries.id,
      name: helpGroceries.name,
      pointValue: helpGroceries.pointValue,
      maxClaims: helpGroceries.maxClaims,
    },
  });

  // Prizes
  await prisma.prize.createMany({
    data: [
      { name: '30 min extra screen time', pointCost: 20, isActive: true },
      { name: 'Choose dinner', pointCost: 50, isActive: true },
      { name: 'Stay up 30 min late', pointCost: 35, isActive: true },
      { name: 'Pick a movie', pointCost: 25, isActive: true },
    ],
  });

  console.log('✓ Seed complete');
  console.log('  Users: mom@example.com / dad@example.com  (password: "password")');
  console.log('  Children: Alex (🦁 pin:1234), Sam (🐢 pin:5678), Jordan (🦊 no pin)');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
