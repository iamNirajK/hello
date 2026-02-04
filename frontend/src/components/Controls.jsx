import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

const Controls = () => {
  const {
    state,
    settings,
    history,
    undoMove,
    resetGame,
    togglePause,
    updateSettings,
  } = useGame();
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="panel controls">
      <h2>Match Controls</h2>
      <div className="control-grid">
        <label>
          Mode
          <select
            value={settings.mode}
            onChange={(event) => updateSettings({ mode: event.target.value })}
          >
            <option value="ai">Vs Computer</option>
            <option value="pass">Pass & Play</option>
          </select>
        </label>
        <label>
          Players
          <select
            value={settings.playerCount}
            onChange={(event) => updateSettings({ playerCount: Number(event.target.value) })}
          >
            <option value={2}>2 Players</option>
            <option value={3}>3 Players</option>
            <option value={4}>4 Players</option>
          </select>
        </label>
        <label>
          AI Difficulty
          <select
            value={settings.aiDifficulty}
            onChange={(event) => updateSettings({ aiDifficulty: event.target.value })}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label>
          Sound
          <button type="button" onClick={() => updateSettings({ sound: !settings.sound })}>
            {settings.sound ? 'On' : 'Off'}
          </button>
        </label>
        <label>
          Theme
          <button type="button" onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
            {settings.theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </label>
        <label>
          Fullscreen
          <button type="button" onClick={toggleFullscreen}>Toggle</button>
        </label>
      </div>
      <div className="action-row">
        <button type="button" onClick={togglePause}>
          {state.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button type="button" onClick={undoMove}>Undo</button>
        <button type="button" onClick={() => resetGame(settings)}>Restart</button>
        <button type="button" onClick={() => setShowRules(true)}>Rules</button>
        <button type="button" onClick={() => setShowHistory(true)}>History</button>
      </div>

      {showRules && (
        <div className="modal">
          <div className="modal-content">
            <h3>Official Rules</h3>
            <ul>
              <li>Roll a 6 to unlock a token.</li>
              <li>Extra turn on a 6.</li>
              <li>Three consecutive 6 rolls cancel the turn.</li>
              <li>Landing on an opponent cuts them back to base (except safe zones).</li>
              <li>Safe zones are marked with stars.</li>
              <li>Finish all tokens to win. Ranking is tracked.</li>
            </ul>
            <button type="button" onClick={() => setShowRules(false)}>Close</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal">
          <div className="modal-content">
            <h3>Match History</h3>
            {history.length === 0 ? (
              <p>No matches yet.</p>
            ) : (
              <ol>
                {history.map((entry) => (
                  <li key={entry.id}>
                    {entry.ranking.map((player) => player.name).join(' → ')}
                    <span className="timestamp">{new Date(entry.finishedAt).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
            <button type="button" onClick={() => setShowHistory(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Controls;
