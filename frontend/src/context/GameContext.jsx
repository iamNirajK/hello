import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useSound } from '../hooks/useSound.js';
import { AVATARS, HOME_LENGTH, PLAYER_COLORS, PLAYER_NAMES, TRACK_LENGTH } from '../utils/helpers.js';
import { applyMove, getMovableTokens, rollDice } from '../utils/rules.js';

const GameContext = createContext(null);

const createPlayers = (playerCount, mode) =>
  Array.from({ length: playerCount }, (_, idx) => ({
    id: idx,
    name: PLAYER_NAMES[idx],
    color: PLAYER_COLORS[idx],
    avatar: AVATARS[idx % AVATARS.length],
    isAI: mode === 'ai' ? idx !== 0 : false,
  }));

const createTokens = (playerCount) =>
  Array.from({ length: playerCount * 4 }, (_, idx) => ({
    id: `token-${idx}`,
    playerId: Math.floor(idx / 4),
    tokenIndex: idx % 4,
    steps: -1,
  }));

const initialSettings = {
  mode: 'ai',
  playerCount: 2,
  aiDifficulty: 'medium',
  sound: true,
  theme: 'dark',
};

const buildInitialState = (settings) => {
  const players = createPlayers(settings.playerCount, settings.mode);
  return {
    players,
    tokens: createTokens(settings.playerCount),
    currentPlayer: 0,
    diceValue: null,
    diceRolling: false,
    rollHistory: [],
    sixStreak: 0,
    status: 'playing',
    winnerRanking: [],
    lastMove: null,
  };
};

const gameReducer = (state, action) => {
  switch (action.type) {
    case 'RESET':
      return buildInitialState(action.settings);
    case 'ROLL_START':
      return { ...state, diceRolling: true };
    case 'ROLL_END': {
      const rollHistory = [...state.rollHistory.slice(-2), action.value];
      const sixStreak = action.value === 6 ? state.sixStreak + 1 : 0;
      if (sixStreak >= 3) {
        return {
          ...state,
          diceRolling: false,
          diceValue: null,
          rollHistory,
          sixStreak: 0,
          currentPlayer: (state.currentPlayer + 1) % state.players.length,
        };
      }
      return {
        ...state,
        diceRolling: false,
        diceValue: action.value,
        rollHistory,
        sixStreak,
      };
    }
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'MOVE_TOKEN': {
      const { nextState, result } = action.payload;
      return {
        ...nextState,
        diceValue: null,
        lastMove: action.payload.lastMove,
        currentPlayer: result.extraTurn ? nextState.currentPlayer : (nextState.currentPlayer + 1) % nextState.players.length,
      };
    }
    case 'SKIP_TURN':
      return {
        ...state,
        diceValue: null,
        currentPlayer: (state.currentPlayer + 1) % state.players.length,
        sixStreak: 0,
      };
    case 'UNDO':
      return action.previousState || state;
    case 'UPDATE_PLAYERS':
      return { ...state, players: action.players };
    default:
      return state;
  }
};

export const GameProvider = ({ children }) => {
  const [settings, setSettings] = useLocalStorage('ludo-settings', initialSettings);
  const [history, setHistory] = useLocalStorage('ludo-history', []);
  const [state, dispatch] = useReducer(gameReducer, settings, buildInitialState);
  const { playTone } = useSound(settings.sound);

  const currentPlayer = state.players[state.currentPlayer];

  const updatePlayers = useCallback(
    (players) => {
      dispatch({ type: 'UPDATE_PLAYERS', players });
    },
    [dispatch]
  );

  const roll = useCallback(() => {
    if (state.status !== 'playing' || state.diceRolling || state.diceValue !== null) return;
    dispatch({ type: 'ROLL_START' });
    setTimeout(() => {
      const value = rollDice();
      playTone('dice');
      dispatch({ type: 'ROLL_END', value });
    }, 600);
  }, [state.status, state.diceRolling, state.diceValue, playTone]);

  const moveToken = useCallback(
    (tokenId) => {
      if (state.status !== 'playing' || state.diceValue === null) return;
      const movable = getMovableTokens(
        state.tokens.filter((token) => token.playerId === currentPlayer.id),
        state.diceValue
      );
      if (!movable.find((token) => token.id === tokenId)) return;

      const { state: nextState, result } = applyMove(state, tokenId, state.diceValue);
      if (result.cutTokens.length) {
        playTone('cut');
      } else {
        playTone('move');
      }

      const playerTokens = nextState.tokens.filter((token) => token.playerId === currentPlayer.id);
      const finalStep = TRACK_LENGTH + HOME_LENGTH - 1;
      const finishedAll = playerTokens.every((token) => token.steps === finalStep);
      if (finishedAll) {
        playTone('win');
        const ranking = [...state.winnerRanking, currentPlayer];
        nextState.winnerRanking = ranking;
        if (ranking.length === nextState.players.length) {
          nextState.status = 'gameover';
          setHistory((prev) => [
            { id: Date.now(), ranking, finishedAt: new Date().toISOString() },
            ...prev,
          ].slice(0, 10));
        }
      }

      dispatch({
        type: 'MOVE_TOKEN',
        payload: {
          nextState,
          result,
          lastMove: state,
        },
      });
    },
    [state, currentPlayer, playTone, setHistory]
  );

  const skipTurn = useCallback(() => {
    dispatch({ type: 'SKIP_TURN' });
  }, []);

  const undoMove = useCallback(() => {
    if (state.diceValue !== null) return;
    if (state.lastMove) {
      dispatch({ type: 'UNDO', previousState: state.lastMove });
    }
  }, [state.diceValue, state.lastMove]);

  const resetGame = useCallback(
    (nextSettings = settings) => {
      dispatch({ type: 'RESET', settings: nextSettings });
    },
    [settings]
  );

  const togglePause = useCallback(() => {
    dispatch({ type: 'SET_STATUS', status: state.status === 'paused' ? 'playing' : 'paused' });
  }, [state.status]);

  const updateSettings = useCallback(
    (partial) => {
      const nextSettings = { ...settings, ...partial };
      setSettings(nextSettings);
      resetGame(nextSettings);
    },
    [settings, setSettings, resetGame]
  );

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    if (state.status !== 'playing' || !currentPlayer?.isAI) return;
    if (state.diceValue === null && !state.diceRolling) {
      const delay = 500 + Math.random() * 700;
      const timer = setTimeout(() => roll(), delay);
      return () => clearTimeout(timer);
    }

    if (state.diceValue !== null) {
      const movable = getMovableTokens(
        state.tokens.filter((token) => token.playerId === currentPlayer.id),
        state.diceValue
      );
      if (!movable.length) {
        const timer = setTimeout(() => skipTurn(), 500);
        return () => clearTimeout(timer);
      }
      const decideMove = async () => {
        try {
          const response = await fetch('http://localhost:4000/api/ai-move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state,
              playerId: currentPlayer.id,
              roll: state.diceValue,
              difficulty: settings.aiDifficulty,
            }),
          });
          const data = await response.json();
          const tokenId = data.tokenId || movable[0].id;
          const delay = 500 + Math.random() * 700;
          setTimeout(() => moveToken(tokenId), delay);
        } catch (error) {
          const delay = 500 + Math.random() * 700;
          setTimeout(() => moveToken(movable[0].id), delay);
        }
      };
      decideMove();
    }
  }, [state, currentPlayer, roll, moveToken, skipTurn, settings.aiDifficulty]);

  useEffect(() => {
    if (state.status !== 'playing' || currentPlayer?.isAI) return;
    if (state.diceValue === null) return;
    const movable = getMovableTokens(
      state.tokens.filter((token) => token.playerId === currentPlayer.id),
      state.diceValue
    );
    if (!movable.length) {
      const timer = setTimeout(() => skipTurn(), 800);
      return () => clearTimeout(timer);
    }
  }, [state, currentPlayer, skipTurn]);

  const value = useMemo(
    () => ({
      state,
      settings,
      history,
      currentPlayer,
      roll,
      moveToken,
      undoMove,
      resetGame,
      togglePause,
      updateSettings,
      updatePlayers,
      setHistory,
    }),
    [state, settings, history, currentPlayer, roll, moveToken, undoMove, resetGame, togglePause, updateSettings, updatePlayers]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
