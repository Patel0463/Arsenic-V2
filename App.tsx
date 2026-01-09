
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameOverlay } from './components/GameOverlay';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
  };

  const onCrash = () => {
    setGameState(GameState.EXPLODING);
  };

  const gameOver = (finalScore: number) => {
    setGameState(GameState.GAME_OVER);
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-sky-900">
      <GameCanvas 
        gameState={gameState} 
        onGameOver={gameOver} 
        onCrash={onCrash}
        onScoreUpdate={setScore} 
      />
      <GameOverlay 
        gameState={gameState} 
        score={score} 
        highScore={highScore} 
        onStart={startGame} 
      />
    </div>
  );
};

export default App;
