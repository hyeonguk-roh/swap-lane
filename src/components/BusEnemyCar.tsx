import React, { useState, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import type { EnemyCar as EnemyCarType } from "../types";

interface CarContainerProps {
  position: number;
  top: number;
  turnDirection: "left" | "right" | "none";
  isCrashed: boolean;
}

const CarContainer = styled.div<CarContainerProps>`
  position: absolute;
  width: 40px;
  height: 100px; // Longer than regular cars
  background-color: ${(props) => (props.isCrashed ? "#ff0000" : "#ffa500")}; // Orange color for buses
  left: ${(props) => props.position}px;
  top: ${(props) => props.top}px;
  transform: translateX(-50%)
    ${(props) =>
      props.turnDirection === "left"
        ? "rotate(-15deg)"
        : props.turnDirection === "right"
        ? "rotate(15deg)"
        : "rotate(0deg)"};
  transition: left 0.3s ease, transform 0.3s ease;
  box-shadow: 0 0 10px rgba(255, 165, 0, 0.5);
`;

const SwitchIndicator = styled.div<{ direction: "left" | "right" | "none"; isBlinking: boolean }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  opacity: ${(props) => (props.isBlinking ? 0.5 : 1)};
  transition: opacity 0.2s ease;
  ${(props) =>
    props.direction === "left"
      ? `
        border-width: 10px 15px 10px 0;
        border-color: transparent #ffa500 transparent transparent;
        left: -25px;
      `
      : props.direction === "right"
      ? `
        border-width: 10px 0 10px 15px;
        border-color: transparent transparent transparent #ffa500;
        right: -25px;
      `
      : "display: none;"}
`;

interface BusEnemyCarProps {
  car: EnemyCarType;
  position: number;
}

const BusEnemyCar: React.FC<BusEnemyCarProps> = ({ car, position }) => {
  const [turnDirection, setTurnDirection] = useState<"left" | "right" | "none">("none");
  const [isBlinking, setIsBlinking] = useState(false);
  const prevLaneRef = useRef<number>(car.lane);
  const prevSwitchingToRef = useRef<number | null>(null);

  useEffect(() => {
    // Start blinking when lane switch initiates
    if (car.switchingTo !== null && prevSwitchingToRef.current === null) {
      setIsBlinking(true);
    }

    // Play turn animation when lane actually changes
    if (car.lane !== prevLaneRef.current) {
      const direction = car.lane < prevLaneRef.current ? "left" : "right";
      setTurnDirection(direction);
      setTimeout(() => setTurnDirection("none"), 300);
    }

    // Stop blinking when lane switch completes
    if (car.switchingTo === null && prevSwitchingToRef.current !== null) {
      setIsBlinking(false);
    }

    prevLaneRef.current = car.lane;
    prevSwitchingToRef.current = car.switchingTo;
  }, [car.lane, car.switchingTo]);

  return (
    <CarContainer position={position} top={car.top} turnDirection={turnDirection} isCrashed={car.isCrashed}>
      <SwitchIndicator
        direction={car.switchingTo !== null ? (car.switchingTo < car.lane ? "left" : "right") : "none"}
        isBlinking={isBlinking}
      />
    </CarContainer>
  );
};

export default BusEnemyCar; 