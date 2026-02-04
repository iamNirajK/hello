import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'Advance Ludo backend running' });
});

app.use('/api', gameRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
