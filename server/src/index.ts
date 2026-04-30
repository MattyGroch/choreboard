import 'dotenv/config';
import app from './app';
import { startCronJobs } from './cron';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
  startCronJobs();
});
