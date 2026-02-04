import { HOME_LENGTH, SAFE_INDICES, TRACK_LENGTH, getGlobalIndex } from './helpers.js';

export const rollDice = () => Math.floor(Math.random() * 6) + 1;

export const canMoveToken = (token, roll) => {
  if (token.steps < 0) {
    return roll === 6;
  }
  if (token.steps >= TRACK_LENGTH + HOME_LENGTH) {
    return false;
  }
  return token.steps + roll <= TRACK_LENGTH + HOME_LENGTH - 1;
};

export const getMovableTokens = (tokens, roll) =>
  tokens.filter((token) => canMoveToken(token, roll));

export const applyMove = (state, tokenId, roll) => {
  const tokens = state.tokens.map((token) => ({ ...token }));
  const tokenIndex = tokens.findIndex((token) => token.id === tokenId);
  const token = tokens[tokenIndex];
  if (!token) return { state, result: { cutTokens: [], finished: false, extraTurn: false } };

  const wasLocked = token.steps < 0;
  if (wasLocked && roll !== 6) {
    return { state, result: { cutTokens: [], finished: false, extraTurn: false } };
  }

  token.steps = wasLocked ? 0 : token.steps + roll;

  const cutTokens = [];
  const landingIndex = getGlobalIndex(token.steps, token.playerId);
  if (landingIndex !== null && !SAFE_INDICES.includes(landingIndex)) {
    tokens.forEach((otherToken) => {
      if (otherToken.playerId !== token.playerId && otherToken.steps >= 0) {
        const otherIndex = getGlobalIndex(otherToken.steps, otherToken.playerId);
        if (otherIndex === landingIndex) {
          otherToken.steps = -1;
          cutTokens.push(otherToken.id);
        }
      }
    });
  }

  const finished = token.steps === TRACK_LENGTH + HOME_LENGTH - 1;

  return {
    state: {
      ...state,
      tokens,
    },
    result: {
      cutTokens,
      finished,
      extraTurn: roll === 6,
    },
  };
};

export const getWinnerRanking = (players, tokens) => {
  return players
    .map((player) => {
      const playerTokens = tokens.filter((token) => token.playerId === player.id);
      const finishedCount = playerTokens.filter(
        (token) => token.steps === TRACK_LENGTH + HOME_LENGTH - 1
      ).length;
      return {
        ...player,
        finishedCount,
      };
    })
    .sort((a, b) => b.finishedCount - a.finishedCount);
};
