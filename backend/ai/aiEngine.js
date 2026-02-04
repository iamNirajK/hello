const TRACK_LENGTH = 52;
const HOME_LENGTH = 6;
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const getGlobalIndex = (steps, playerId) => {
  if (steps < 0 || steps >= TRACK_LENGTH) return null;
  const offset = playerId * 13;
  return (offset + steps) % TRACK_LENGTH;
};

const canMoveToken = (token, roll) => {
  if (token.steps < 0) return roll === 6;
  if (token.steps >= TRACK_LENGTH + HOME_LENGTH) return false;
  return token.steps + roll <= TRACK_LENGTH + HOME_LENGTH - 1;
};

const getMovableTokens = (tokens, roll) => tokens.filter((token) => canMoveToken(token, roll));

const evaluateMove = ({ state, token, roll, difficulty }) => {
  const moveScore = {
    easy: 1,
    medium: 1.4,
    hard: 1.8,
  }[difficulty] || 1.4;

  const wasLocked = token.steps < 0;
  const newSteps = wasLocked ? 0 : token.steps + roll;
  const landingIndex = getGlobalIndex(newSteps, token.playerId);
  let score = 0;

  if (wasLocked) score += 10;
  score += newSteps * 0.6;
  if (newSteps >= TRACK_LENGTH) score += 12;

  if (landingIndex !== null && SAFE_INDICES.includes(landingIndex)) {
    score += 8;
  }

  const cutTargets = state.tokens.filter((other) => {
    if (other.playerId === token.playerId || other.steps < 0) return false;
    const otherIndex = getGlobalIndex(other.steps, other.playerId);
    return landingIndex !== null && landingIndex === otherIndex && !SAFE_INDICES.includes(landingIndex);
  });

  if (cutTargets.length) score += 30 + cutTargets.length * 8;

  if (landingIndex !== null && !SAFE_INDICES.includes(landingIndex)) {
    const threats = state.tokens.filter((other) => {
      if (other.playerId === token.playerId || other.steps < 0 || other.steps >= TRACK_LENGTH) return false;
      const otherIndex = getGlobalIndex(other.steps, other.playerId);
      if (otherIndex === null) return false;
      const distance = (landingIndex - otherIndex + TRACK_LENGTH) % TRACK_LENGTH;
      return distance > 0 && distance <= 6;
    });
    score -= threats.length * 6;
  }

  return score * moveScore + Math.random();
};

export const chooseAiMove = ({ state, playerId, roll, difficulty }) => {
  const playerTokens = state.tokens.filter((token) => token.playerId === playerId);
  const movable = getMovableTokens(playerTokens, roll);
  if (!movable.length) return null;

  if (difficulty === 'easy') {
    return movable[Math.floor(Math.random() * movable.length)].id;
  }

  return movable.reduce((best, token) => {
    const score = evaluateMove({ state, token, roll, difficulty });
    if (!best || score > best.score) {
      return { id: token.id, score };
    }
    return best;
  }, null).id;
};
