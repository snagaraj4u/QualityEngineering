import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import jiraRouter from './routes/jira';
import qmetryRouter from './routes/qmetry';
import testCasesRouter from './routes/test-cases';
import videoRouter from './routes/video';
import testRouter from './routes/test';
import streamRouter from './routes/stream';
import defectsRouter from './routes/defects';
import dashboardRouter from './routes/dashboard';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/jira', jiraRouter);
app.use('/api/qmetry', qmetryRouter);
app.use('/api/test-cases', testCasesRouter);
app.use('/api/video', videoRouter);
app.use('/api/test', testRouter);
app.use('/api/test', streamRouter);
app.use('/api/defects', defectsRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', statusCode: 404 });
});

app.use(errorHandler);

// Only listen if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export { app };
