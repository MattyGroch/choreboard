import cron from 'node-cron';
import { seedWeeklyChores } from './seedWeeklyChores';
import { seedNightlyBounties } from './seedNightlyBounties';
import { autoApproveZeroPenaltyChores } from './autoApproveChores';
import { runWeeklyPayout } from './weeklyPayout';

export function startCronJobs(): void {
  // Seed weekly chores at 00:01 — runs daily, checks inside if it's week start day
  cron.schedule('1 0 * * *', async () => {
    try {
      await seedWeeklyChores();
    } catch (err) {
      console.error('[cron] seedWeeklyChores failed:', err);
    }
  });

  // Seed nightly bounties at 01:00
  cron.schedule('0 1 * * *', async () => {
    try {
      await seedNightlyBounties();
    } catch (err) {
      console.error('[cron] seedNightlyBounties failed:', err);
    }
  });

  // Auto-approve zero-penalty chores at 23:55
  cron.schedule('55 23 * * *', async () => {
    try {
      await autoApproveZeroPenaltyChores();
    } catch (err) {
      console.error('[cron] autoApproveChores failed:', err);
    }
  });

  // Weekly payout at 23:59 — runs daily, checks inside if it's week end day
  cron.schedule('59 23 * * *', async () => {
    try {
      await runWeeklyPayout();
    } catch (err) {
      console.error('[cron] weeklyPayout failed:', err);
    }
  });

  console.log('[cron] All jobs scheduled');
}
