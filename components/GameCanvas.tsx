
import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Plane, Tower, Particle, Challenge, EnvironmentMode } from '../types';
import { 
  GRAVITY, JUMP_FORCE, TOWER_SPEED, TOWER_SPACING, 
  TOWER_WIDTH, GAP_HEIGHT, PLANE_WIDTH, PLANE_HEIGHT,
  CLOUD_COUNT 
} from '../constants';
import { GoogleGenAI } from "@google/genai";

interface Props {
  gameState: GameState;
  onGameOver: (score: number) => void;
  onCrash: () => void;
  onScoreUpdate: (score: number) => void;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GameCanvas: React.FC<Props> = ({ gameState, onGameOver, onCrash, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const planeRef = useRef<Plane>({ 
    x: 100, y: 300, velocity: 0, width: PLANE_WIDTH, height: PLANE_HEIGHT, rotation: 0,
    isDamaged: false, strikes: 0
  });
  const towersRef = useRef<Tower[]>([]);
  const cloudsRef = useRef<{x: number, y: number, s: number}[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const challengeRef = useRef<Challenge | null>(null);
  const envModeRef = useRef<EnvironmentMode>('DAY');
  const scoreRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const explosionTimerRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  
  // Blindness mechanic refs
  const blindnessTimerRef = useRef<number>(0);

  const initGame = useCallback(() => {
    planeRef.current = { 
      x: 100, y: 300, velocity: 0, width: PLANE_WIDTH, height: PLANE_HEIGHT, rotation: 0,
      isDamaged: false, strikes: 0
    };
    towersRef.current = [];
    scoreRef.current = 0;
    particlesRef.current = [];
    challengeRef.current = null;
    explosionTimerRef.current = 0;
    shakeRef.current = 0;
    blindnessTimerRef.current = 0;
    envModeRef.current = Math.random() > 0.5 ? 'NIGHT' : 'DAY';
    onScoreUpdate(0);
    cloudsRef.current = Array.from({ length: CLOUD_COUNT }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 300,
      s: 0.5 + Math.random()
    }));
  }, [onScoreUpdate]);

  useEffect(() => {
    if (gameState === GameState.START || gameState === GameState.PLAYING) {
      initGame();
    }
  }, [gameState, initGame]);

  const triggerExplosion = useCallback(() => {
    onCrash();
    shakeRef.current = 25;
    explosionTimerRef.current = 60;
    const p = planeRef.current;
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particlesRef.current.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 + Math.random() * 0.8,
        size: Math.random() * 10 + 5,
        color: ['#ff4400', '#ffcc00', '#444444', '#ffffff'][Math.floor(Math.random() * 4)]
      });
    }
  }, [onCrash]);

  const jump = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      const power = planeRef.current.isDamaged ? JUMP_FORCE * 1.2 : JUMP_FORCE;
      planeRef.current.velocity = power;
      
      const smokeColor = envModeRef.current === 'DAY' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(100, 116, 139, 0.4)';
      for(let i=0; i<3; i++) {
        particlesRef.current.push({
          x: planeRef.current.x,
          y: planeRef.current.y + 15,
          vx: -2 - Math.random() * 2,
          vy: Math.random() * 1 - 0.5,
          life: 0.5,
          color: planeRef.current.isDamaged ? '#555' : smokeColor
        });
      }
    }
  }, [gameState]);

  const handleChallengeFail = useCallback(() => {
    if (planeRef.current.isDamaged) {
      triggerExplosion();
    } else {
      planeRef.current.strikes += 1;
      shakeRef.current = 15;
      if (planeRef.current.strikes >= 3) {
        triggerExplosion();
      } else {
        planeRef.current.isDamaged = true;
        for(let i=0; i<15; i++) {
          particlesRef.current.push({
            x: planeRef.current.x + planeRef.current.width/2,
            y: planeRef.current.y + planeRef.current.height/2,
            vx: -Math.random() * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: '#444',
            size: 6
          });
        }
      }
    }
    challengeRef.current = null;
  }, [triggerExplosion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;

      if (challengeRef.current) {
        const char = e.key;
        if (/^[0-9]$/.test(char)) {
          const pressedNum = parseInt(char);
          if (pressedNum === challengeRef.current.number) {
            challengeRef.current = null;
            scoreRef.current += 2;
            onScoreUpdate(scoreRef.current);
            return;
          } else {
            handleChallengeFail();
            return;
          }
        }
      }

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        jump();
      }
    };

    const handleMouseDown = () => {
      jump();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    canvasRef.current?.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvasRef.current?.removeEventListener('mousedown', handleMouseDown);
    };
  }, [gameState, jump, handleChallengeFail, onScoreUpdate]);

  const drawBuilding = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isTop: boolean, isNight: boolean) => {
    ctx.fillStyle = isNight ? '#020617' : '#94a3b8'; 
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = isNight ? '#fde047' : '#7dd3fc'; 
    const winSize = 6;
    const winPadding = 8;
    for (let wy = y + 10; wy < y + h - 10; wy += winSize + winPadding) {
      for (let wx = x + 8; wx < x + w - 8; wx += winSize + winPadding) {
        if (((wx + wy) % (isNight ? 5 : 7)) !== 0) {
          ctx.fillRect(wx, wy, winSize, winSize);
        }
      }
    }
    ctx.fillStyle = isNight ? '#334155' : '#475569';
    if (isTop) ctx.fillRect(x + w/2 - 2, y + h - 5, 4, 15);
    else ctx.fillRect(x + w/2 - 2, y - 10, 4, 15);
  }, []);

  const drawCelestial = useCallback((ctx: CanvasRenderingContext2D, isNight: boolean) => {
    const x = 320;
    const y = 80;
    ctx.save();
    if (isNight) {
      // Moon
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#94a3b8';
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      // Craters
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#cbd5e1';
      [ {cx: -10, cy: -5, r: 6}, {cx: 8, cy: 10, r: 4}, {cx: -5, cy: 15, r: 3} ].forEach(c => {
        ctx.beginPath();
        ctx.arc(x + c.cx, y + c.cy, c.r, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Sun
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fill();
      // Sun rays
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      const rayCount = 12;
      const rotation = Date.now() / 2000;
      for (let i = 0; i < rayCount; i++) {
        const angle = rotation + (i / rayCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 45, y + Math.sin(angle) * 45);
        ctx.lineTo(x + Math.cos(angle) * 60, y + Math.sin(angle) * 60);
        ctx.stroke();
      }
    }
    ctx.restore();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.save();
    if (shakeRef.current > 0) {
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
    }

    const isNight = envModeRef.current === 'NIGHT';
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isNight) {
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#1e1b4b');
    } else {
      gradient.addColorStop(0, '#0ea5e9');
      gradient.addColorStop(1, '#38bdf8');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);

    drawCelestial(ctx, isNight);

    ctx.fillStyle = isNight ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.5)';
    cloudsRef.current.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 20 * c.s, 0, Math.PI * 2);
      ctx.fill();
    });

    towersRef.current.forEach(tower => {
      drawBuilding(ctx, tower.x, 0, tower.width, tower.topHeight, true, isNight);
      drawBuilding(ctx, tower.x, tower.topHeight + GAP_HEIGHT, tower.width, canvas.height - (tower.topHeight + GAP_HEIGHT), false, isNight);
    });

    if (gameState === GameState.PLAYING) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < planeRef.current.strikes ? '#ef4444' : '#1e293b';
        ctx.fillRect(10 + i * 25, 10, 20, 10);
      }
    }

    if (challengeRef.current) {
      const c = challengeRef.current;
      ctx.save();
      const pulse = Math.sin(Date.now() / 150) * 5;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius + pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.font = 'bold 30px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'red';
      ctx.fillText(c.number.toString(), c.x, c.y);
      
      ctx.font = 'bold 10px "Press Start 2P"';
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
      ctx.fillText("PRESS KEY", c.x, c.y + 35);
      
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius + 10, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * (c.timeLeft / 4.0)));
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();
    }

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.size || 4) * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    if (gameState !== GameState.EXPLODING && gameState !== GameState.GAME_OVER) {
      const p = planeRef.current;
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      ctx.rotate(p.rotation);
      ctx.fillStyle = isNight ? '#991b1b' : '#ef4444';
      ctx.beginPath();
      if (p.isDamaged) {
        ctx.ellipse(0, 0, p.width / 2, p.height / 4, 0, -Math.PI/2, Math.PI/2);
        ctx.lineTo(0, p.height/4);
        ctx.lineTo(0, -p.height/4);
      } else {
        ctx.ellipse(0, 0, p.width / 2, p.height / 4, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = isNight ? '#0c4a6e' : '#bae6fd';
      ctx.beginPath();
      ctx.ellipse(8, -4, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!p.isDamaged) {
        ctx.fillStyle = isNight ? '#7f1d1d' : '#dc2626';
        ctx.fillRect(-p.width/2, -12, 10, 12);
      }
      ctx.fillStyle = isNight ? '#450a0a' : '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(p.width/2 - 2, 0, 2, p.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Blindness Overlay
    if (blindnessTimerRef.current > 0) {
      ctx.globalAlpha = Math.min(1, blindnessTimerRef.current * 2); // Quick fade-out
      ctx.fillStyle = isNight ? '#000000' : '#ffffff';
      ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }, [gameState, drawBuilding, drawCelestial]);

  const update = useCallback((time: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = lastTimeRef.current === 0 ? 0 : (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    // Update blindness timer
    if (blindnessTimerRef.current > 0) {
      blindnessTimerRef.current -= deltaTime;
    }

    if (gameState === GameState.PLAYING) {
      const