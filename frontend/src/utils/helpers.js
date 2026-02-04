export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'];
export const PLAYER_NAMES = ['Red', 'Blue', 'Yellow', 'Green'];
export const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐯', '🐧', '🦄', '🐲'];
export const TRACK_LENGTH = 52;
export const HOME_LENGTH = 6;
export const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

const startAngles = [-90, 0, 90, 180];

export const getTrackPositions = () => {
  const positions = [];
  const radius = 42;
  for (let i = 0; i < TRACK_LENGTH; i += 1) {
    const angle = ((i / TRACK_LENGTH) * 360 - 90) * (Math.PI / 180);
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    positions.push({ x, y });
  }
  return positions;
};

export const getHomePathPositions = () => {
  return startAngles.map((angleDeg) => {
    const angle = (angleDeg * Math.PI) / 180;
    return Array.from({ length: HOME_LENGTH }, (_, idx) => {
      const radius = 10 + idx * 5;
      return {
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
      };
    });
  });
};

export const getBasePositions = () => {
  return [
    [
      { x: 18, y: 18 },
      { x: 28, y: 18 },
      { x: 18, y: 28 },
      { x: 28, y: 28 },
    ],
    [
      { x: 72, y: 18 },
      { x: 82, y: 18 },
      { x: 72, y: 28 },
      { x: 82, y: 28 },
    ],
    [
      { x: 72, y: 72 },
      { x: 82, y: 72 },
      { x: 72, y: 82 },
      { x: 82, y: 82 },
    ],
    [
      { x: 18, y: 72 },
      { x: 28, y: 72 },
      { x: 18, y: 82 },
      { x: 28, y: 82 },
    ],
  ];
};

export const getTokenPosition = ({ steps, playerId, tokenIndex }) => {
  const track = getTrackPositions();
  const homePaths = getHomePathPositions();
  const bases = getBasePositions();
  const offset = playerId * 13;

  if (steps < 0) {
    return bases[playerId][tokenIndex];
  }

  if (steps < TRACK_LENGTH) {
    const trackIndex = (offset + steps) % TRACK_LENGTH;
    return track[trackIndex];
  }

  const homeIndex = steps - TRACK_LENGTH;
  return homePaths[playerId][homeIndex];
};

export const getGlobalIndex = (steps, playerId) => {
  if (steps < 0 || steps >= TRACK_LENGTH) return null;
  const offset = playerId * 13;
  return (offset + steps) % TRACK_LENGTH;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
