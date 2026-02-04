import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';

const Dice = () => {
  const { state, roll } = useGame();
  const { diceValue, diceRolling } = state;

  return (
    <button className="dice" onClick={roll} type="button" disabled={diceRolling || diceValue !== null}>
      <motion.div
        className="dice-cube"
        animate={{ rotateX: diceRolling ? 360 : 0, rotateY: diceRolling ? 360 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <span>{diceValue ?? '-'}</span>
      </motion.div>
      <span className="dice-label">Roll</span>
    </button>
  );
};

export default Dice;
