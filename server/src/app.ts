import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import childrenRoutes from './routes/children';
import choreTemplateRoutes from './routes/choreTemplates';
import choreRoutes from './routes/chores';
import bountyTemplateRoutes from './routes/bountyTemplates';
import bountyRoutes from './routes/bounties';
import bountyClaimRoutes from './routes/bountyClaims';
import prizeRoutes from './routes/prizes';
import prizeRequestRoutes from './routes/prizeRequests';
import transactionRoutes from './routes/transactions';
import settingsRoutes from './routes/settings';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/chore-templates', choreTemplateRoutes);
app.use('/api/chores', choreRoutes);
app.use('/api/bounty-templates', bountyTemplateRoutes);
app.use('/api/bounties', bountyRoutes);
app.use('/api/bounty-claims', bountyClaimRoutes);
app.use('/api/prizes', prizeRoutes);
app.use('/api/prize-requests', prizeRequestRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);

// Serve client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
