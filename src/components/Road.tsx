import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { v4 as uuidv4 } from 'uuid';
import type { Lane, EnemyCar, GameState } from '../types';
import EnemyCarComponent from './EnemyCar';
import DrunkEnemyCarComponent from './DrunkEnemyCar';
import BusEnemyCarComponent from './BusEnemyCar';
import DrunkBusEnemyCarComponent from './DrunkBusEnemyCar';
import Ad from './Ad';

const laneCount = 7;
const laneWidth = 100;

const RoadContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: #000;
  overflow: hidden;
  display: flex;
  justify-content: center;
`;

const LanesContainer = styled.div`
  position: relative;
  display: flex;
  height: 100%;
  width: ${laneCount * laneWidth}px;
`;

const LaneContainer = styled.div`
  position: relative;
  width: ${laneWidth}px;
  height: 100%;
  border-left: 2px solid white;
  border-right: 2px solid white;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  margin: 0;
`;

const Car = styled.div<{ position: number; turnDirection: 'left' | 'right' | 'none' }>`
  position: absolute;
  width: 40px;
  height: 60px;
  background-color: white;
  left: ${(props) => props.position}px;
  bottom: 150px;
  transform: translateX(-50%)
    ${(props) =>
      props.turnDirection === 'left'
        ? 'rotate(-15deg)'
        : props.turnDirection === 'right'
        ? 'rotate(15deg)'
        : 'rotate(0deg)'};
  transition: left 0.3s ease, transform 0.3s ease;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
`;

const MilesDisplay = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  color: white;
  font-size: 24px;
  z-index: 5;
  font-family: monospace;
`;

const GameOverOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 24px;
  z-index: 10;
`;

const TryAgainButton = styled.button`
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 18px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #45a049;
  }
`;

const GameOverText = styled.div`
  margin-bottom: 20px;
`;

const Road: React.FC = () => {
  const [currentLane, setCurrentLane] = useState<Lane>(3);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [turnDirection, setTurnDirection] = useState<"left" | "right" | "none">("none");
  const [enemyCars, setEnemyCars] = useState<EnemyCar[]>([]);
  const [gameState, setGameState] = useState<GameState>({ isGameOver: false, miles: 0 });
  const lastMileUpdate = useRef<number>(0);

  const spawnEnemyCar = useCallback(() => {
    const lane = Math.floor(Math.random() * 7) as Lane;
    const isDrunk = Math.random() < 0.2; // 20% chance of being drunk
    const isBus = Math.random() < 0.3; // 30% chance of being a bus
    setEnemyCars((prev) => [
      ...prev,
      {
        id: uuidv4(),
        lane,
        top: -100,
        switchingTo: null,
        switchTimer: 0,
        isCrashed: false,
        isDrunk,
        isBus,
      },
    ]);
  }, []);

  const updateEnemyCars = useCallback(() => {
    setEnemyCars((prevCars) =>
      prevCars
        .map((car) => {
          const newTop = car.top + (car.isCrashed ? 4 : 2);

          if (car.isDrunk) {
            // Drunk drivers have a 2% chance per frame to switch lanes
            if (car.switchingTo === null && !car.isCrashed && Math.random() < 0.02) {
              const possibleLanes = [car.lane - 1, car.lane + 1].filter(
                (lane) => lane >= 0 && lane < 7
              ) as Lane[];

              if (possibleLanes.length > 0) {
                const newLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
                return {
                  ...car,
                  top: newTop,
                  lane: newLane, // Instant lane change for drunk drivers
                };
              }
            }
            return { ...car, top: newTop };
          }

          // Normal car behavior
          if (car.switchingTo !== null) {
            const newTimer = car.switchTimer - 1;
            if (newTimer <= 0) {
              return {
                ...car,
                top: newTop,
                lane: car.switchingTo,
                switchingTo: null,
                switchTimer: 0,
              };
            }
            return { ...car, top: newTop, switchTimer: newTimer };
          }

          if (car.switchingTo === null && !car.isCrashed && Math.random() < 0.005) {
            const possibleLanes = [car.lane - 1, car.lane + 1].filter(
              (lane) => lane >= 0 && lane < 7
            ) as Lane[];

            if (possibleLanes.length > 0) {
              const newLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
              return {
                ...car,
                top: newTop,
                switchingTo: newLane,
                switchTimer: 90,
              };
            }
          }

          return { ...car, top: newTop };
        })
        .filter((car) => car.top < window.innerHeight + 100)
    );
  }, []);

  const checkCollisions = useCallback(() => {
    if (gameState.isGameOver) return;

    const playerCarHeight = 60;
    const collisionHeight = 40; // Reduced from 60 to 40
    const collisionWidth = 30; // Reduced from 40 to 30
    const roadStartX = (window.innerWidth - laneWidth * laneCount) / 2;

    const playerCar = {
      lane: currentLane,
      top: window.innerHeight - 150 - (playerCarHeight / 2),
      left: roadStartX + currentLane * laneWidth + (laneWidth - collisionWidth) / 2,
      right: roadStartX + currentLane * laneWidth + (laneWidth + collisionWidth) / 2,
    };

    const hasCollision = enemyCars.some((car) => {
      const enemyLeft = roadStartX + car.lane * laneWidth + (laneWidth - collisionWidth) / 2;
      const enemyRight = roadStartX + car.lane * laneWidth + (laneWidth + collisionWidth) / 2;
      
      return (
        car.lane === playerCar.lane &&
        Math.abs(car.top - playerCar.top) < collisionHeight &&
        playerCar.right > enemyLeft &&
        playerCar.left < enemyRight
      );
    });

    if (hasCollision) {
      setGameState(prev => ({ ...prev, isGameOver: true }));
    }
  }, [currentLane, enemyCars, gameState.isGameOver, laneWidth, laneCount]);

  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (gameState.isGameOver) {
        clearInterval(gameLoop);
        return;
      }

      updateEnemyCars();
      checkCollisions();
      
      // Update miles every 100ms (0.1 seconds)
      const now = Date.now();
      if (now - lastMileUpdate.current >= 100) {
        setGameState(prev => ({
          ...prev,
          miles: Number((prev.miles + 0.1).toFixed(1)) // Increment by 0.1 miles and keep one decimal place
        }));
        lastMileUpdate.current = now;
      }
    }, 16);

    return () => clearInterval(gameLoop);
  }, [updateEnemyCars, checkCollisions, gameState.isGameOver]);

  useEffect(() => {
    const spawnInterval = setInterval(spawnEnemyCar, 2000);
    return () => clearInterval(spawnInterval);
  }, [spawnEnemyCar]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameState.isGameOver) return;

    if (e.key === 'ArrowLeft' && currentLane > 0) {
      setTurnDirection('left');
      setCurrentLane((prev) => (prev - 1) as Lane);
      setTimeout(() => setTurnDirection('none'), 300);
    } else if (e.key === 'ArrowRight' && currentLane < laneCount - 1) {
      setTurnDirection('right');
      setCurrentLane((prev) => (prev + 1) as Lane);
      setTimeout(() => setTurnDirection('none'), 300);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState.isGameOver) return;
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || gameState.isGameOver) return;

    const diff = touchStart - e.touches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentLane < laneCount - 1) {
        setTurnDirection('right');
        setCurrentLane((prev) => (prev + 1) as Lane);
        setTimeout(() => setTurnDirection('none'), 300);
      } else if (diff < 0 && currentLane > 0) {
        setTurnDirection('left');
        setCurrentLane((prev) => (prev - 1) as Lane);
        setTimeout(() => setTurnDirection('none'), 300);
      }
      setTouchStart(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLane, gameState.isGameOver]);

  const roadStartX = (window.innerWidth - laneWidth * laneCount) / 2;

  const resetGame = () => {
    setEnemyCars([]);
    setGameState({ isGameOver: false, miles: 0 });
    setCurrentLane(3);
    lastMileUpdate.current = Date.now();
  };

  return (
    <RoadContainer onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
      <Ad position="top" style={{ marginTop: '20px' }} />
      <Ad position="bottom" style={{ marginBottom: '20px' }} />
      <LanesContainer>
        {Array.from({ length: laneCount }).map((_, index) => (
          <LaneContainer key={index} />
        ))}
      </LanesContainer>
      <Car 
        position={roadStartX + laneWidth * currentLane + laneWidth / 2} 
        turnDirection={turnDirection} 
      />
      {enemyCars.map((car) => {
        if (car.isDrunk) {
          return car.isBus ? (
            <DrunkBusEnemyCarComponent
              key={car.id}
              car={car}
              position={roadStartX + laneWidth * car.lane + laneWidth / 2}
            />
          ) : (
            <DrunkEnemyCarComponent
              key={car.id}
              car={car}
              position={roadStartX + laneWidth * car.lane + laneWidth / 2}
            />
          );
        }
        return car.isBus ? (
          <BusEnemyCarComponent
            key={car.id}
            car={car}
            position={roadStartX + laneWidth * car.lane + laneWidth / 2}
          />
        ) : (
          <EnemyCarComponent
            key={car.id}
            car={car}
            position={roadStartX + laneWidth * car.lane + laneWidth / 2}
          />
        );
      })}
      {gameState.isGameOver && (
        <GameOverOverlay>
          <GameOverText>Game Over!</GameOverText>
          <TryAgainButton onClick={resetGame}>Try Again</TryAgainButton>
        </GameOverOverlay>
      )}
      <MilesDisplay>{gameState.miles.toFixed(1)} miles</MilesDisplay>
    </RoadContainer>
  );
};

export default Road; 