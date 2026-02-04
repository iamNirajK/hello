import express from 'express';
import { chooseAiMove } from '../ai/aiEngine.js';

const router = express.Router();

router.post('/ai-move', (req, res) => {
  const { state, playerId, roll, difficulty } = req.body;
  if (!state || playerId === undefined || !roll) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const tokenId = chooseAiMove({ state, playerId, roll, difficulty });
  return res.json({ tokenId });
});

router.post('/validate', (req, res) => {
  const { state } = req.body;
  if (!state) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  return res.json({ valid: true });
});

export default router;
