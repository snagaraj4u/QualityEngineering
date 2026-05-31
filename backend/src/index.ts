import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import jiraRouter from './routes/jira.js';
import qmetryRouter from './routes/qmetry.js';
import testCasesRouter from './routes/test-cases.js';
import generateRouter from './routes/generate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/jira', jiraRouter);
app.use('/api/qmetry', qmetryRouter);
app.use('/api/test-cases', testCasesRouter);
app.use('/api/test-cases/generate', generateRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', statusCode: 404 });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
