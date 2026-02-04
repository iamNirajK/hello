import { useCallback, useRef } from 'react';

const tones = {
  dice: 440,
  move: 520,
  cut: 220,
  win: 660,
};

export const useSound = (enabled) => {
  const audioContextRef = useRef(null);

  const playTone = useCallback(
    (type) => {
      if (!enabled) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = tones[type] || 440;
      gainNode.gain.value = 0.08;
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
    },
    [enabled]
  );

  return { playTone };
};
