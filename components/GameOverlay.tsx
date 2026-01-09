
import React from 'react';
import { GameState } from '../types';

interface Props {
  gameState: GameState;
  score: number;
  highScore: number;
  onStart: () => void;
}

export const GameOverlay: React.FC<Props> = ({ gameState, score, highScore, onStart }) => {
  // Hide UI during active gameplay or while exploding
  if (gameState === GameState.PLAYING || gameState === GameState.EXPLODING) {
    return (
      <div className="absolute top-10 left-0 w-full flex justify-center pointer-events-none">
        <div className="bg-black/40 px-6 py-2 rounded-full border-2 border-white/50">
          <span className="text-white text-3xl font-bold drop-shadow-lg">{score}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-white p-10 rounded-3xl border-8 border-slate-300 shadow-2xl flex flex-col items-center text-center max-w-sm w-full mx-4">
        {gameState === GameState.START ? (
          <>
            <h1 className="text-4xl font-extrabold text-sky-600 mb-2 uppercase tracking-tighter">Sky High</h1>
            <p className="text-slate-500 mb-8 font-sans text-sm">Pilot through the city skyline</p>
            <div className="w-24 h-24 mb-8 flex items-center justify-center bg-sky-100 rounded-full">
              <span className="text-5xl animate-bounce">🛩️</span>
            </div>
            <button 
              onClick={onStart}
              className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 px-10 rounded-xl shadow-lg transform transition active:scale-95 border-b-4 border-sky-700"
            >
              START ENGINE
            </button>
            <p className="mt-6 text-xs text-slate-400 uppercase">Space or Click to fly</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-red-500 mb-2 uppercase">Mayday!</h1>
            <p className="text-slate-500 mb-6 font-sans text-sm">You crashed or failed the timer!</p>
            
            <div className="bg-slate-50 w-full rounded-2xl p-6 mb-8 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 uppercase text-xs">Distance</span>
                <span className="text-2xl font-bold text-slate-800">{score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase text-xs">Record</span>
                <span className="text-xl font-bold text-sky-600">{highScore}</span>
              </div>
            </div>

            <button 
              onClick={onStart}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition active:scale-95 border-b-4 border-sky-700 mb-4"
            >
              RETRY FLIGHT
            </button>
          </>
        )}
      </div>
    </div>
  );
};
