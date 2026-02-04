import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';
import { getTokenPosition } from '../utils/helpers.js';
import { getMovableTokens } from '../utils/rules.js';

const Token = ({ token }) => {
  const { state, moveToken } = useGame();
  const { currentPlayer, diceValue } = state;
  const isCurrentPlayer = currentPlayer === token.playerId;
  const movableTokens = diceValue
    ? getMovableTokens(state.tokens.filter((t) => t.playerId === token.playerId), diceValue)
    : [];
  const isMovable = isCurrentPlayer && movableTokens.some((t) => t.id === token.id);
  const position = getTokenPosition(token);

  return (
    <motion.button
      className={`token p${token.playerId} ${isMovable ? 'movable' : ''}`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      onClick={() => isMovable && moveToken(token.id)}
      type="button"
      animate={{ left: `${position.x}%`, top: `${position.y}%` }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    />
  );
};

export default Token;
