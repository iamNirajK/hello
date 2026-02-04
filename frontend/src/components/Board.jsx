import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';
import { SAFE_INDICES, getHomePathPositions, getTrackPositions } from '../utils/helpers.js';
import Token from './Token.jsx';

const Board = () => {
  const { state } = useGame();
  const track = getTrackPositions();
  const homePaths = getHomePathPositions();

  return (
    <div className="board">
      <svg className="board-track" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" className="track-ring" />
        {track.map((pos, index) => (
          <circle
            key={`track-${index}`}
            cx={pos.x}
            cy={pos.y}
            r={1.4}
            className={SAFE_INDICES.includes(index) ? 'track-safe' : 'track-node'}
          />
        ))}
        {homePaths.map((path, playerId) => (
          <g key={`home-${playerId}`}>
            {path.map((pos, idx) => (
              <circle key={`home-${playerId}-${idx}`} cx={pos.x} cy={pos.y} r={1.6} className={`home-node p${playerId}`} />
            ))}
          </g>
        ))}
      </svg>
      <motion.div className="board-center" layout>
        <div className="center-logo">LUDO</div>
      </motion.div>
      {state.tokens.map((token) => (
        <Token key={token.id} token={token} />
      ))}
    </div>
  );
};

export default Board;
