import React from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import Board from './components/Board.jsx';
import Dice from './components/Dice.jsx';
import PlayerPanel from './components/PlayerPanel.jsx';
import Controls from './components/Controls.jsx';

const GameShell = () => {
  const { state, currentPlayer } = useGame();

  return (
    <div className="app">
      <header>
        <div>
          <h1>Advance Ludo</h1>
          <p>Instant play • No login required</p>
        </div>
        <div className="status">
          <span className="status-label">Turn</span>
          <strong style={{ color: currentPlayer.color }}>
            {currentPlayer.name}
          </strong>
          {state.status === 'paused' && <span className="badge">Paused</span>}
          {state.status === 'gameover' && <span className="badge">Game Over</span>}
        </div>
      </header>
      <main>
        <section className="board-section">
          <Board />
          <div className="dice-panel">
            <Dice />
            <div className="roll-info">
              <div className="roll-history">
                <span>Recent:</span>
                {state.rollHistory.map((value, idx) => (
                  <span key={`${value}-${idx}`} className="roll-chip">{value}</span>
                ))}
              </div>
              <div className="ranking">
                <span>Ranking:</span>
                {state.winnerRanking.length ? (
                  <ol>
                    {state.winnerRanking.map((player) => (
                      <li key={player.id}>{player.name}</li>
                    ))}
                  </ol>
                ) : (
                  <span>In progress</span>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="sidebar">
          <PlayerPanel />
          <Controls />
        </section>
      </main>
    </div>
  );
};

const App = () => (
  <GameProvider>
    <GameShell />
  </GameProvider>
);

export default App;
