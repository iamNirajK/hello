import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { AVATARS } from '../utils/helpers.js';

const PlayerPanel = () => {
  const { state, currentPlayer, updatePlayers } = useGame();

  const updatePlayerField = (playerId, field, value) => {
    const nextPlayers = state.players.map((player) =>
      player.id === playerId ? { ...player, [field]: value } : player
    );
    updatePlayers(nextPlayers);
  };

  return (
    <div className="panel players">
      <h2>Players</h2>
      {state.players.map((player) => (
        <div key={player.id} className={`player-card ${currentPlayer.id === player.id ? 'active' : ''}`}>
          <div className="player-header" style={{ borderColor: player.color }}>
            <span className="player-avatar">{player.avatar}</span>
            <input
              type="text"
              value={player.name}
              maxLength={12}
              onChange={(event) => updatePlayerField(player.id, 'name', event.target.value)}
            />
            {player.isAI && <span className="ai-badge">AI</span>}
          </div>
          <div className="avatar-list">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                type="button"
                className={avatar === player.avatar ? 'selected' : ''}
                onClick={() => updatePlayerField(player.id, 'avatar', avatar)}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlayerPanel;
