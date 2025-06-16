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
  height: 60px;
  background-color: ${(props) => (props.isCrashed ? "#ff0000" : "#9b4dca")};
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
  box-shadow: 0 0 10px rgba(155, 77, 202, 0.5);
`;

interface DrunkEnemyCarProps {
  car: EnemyCarType;
  position: number;
}

const DrunkEnemyCar: React.FC<DrunkEnemyCarProps> = ({ car, position }) => {
  const [turnDirection, setTurnDirection] = useState<"left" | "right" | "none">("none");
  const prevLaneRef = useRef<number>(car.lane);

  useEffect(() => {
    // Play turn animation when lane actually changes
    if (car.lane !== prevLaneRef.current) {
      const direction = car.lane < prevLaneRef.current ? "left" : "right";
      setTurnDirection(direction);
      setTimeout(() => setTurnDirection("none"), 300);
    }

    prevLaneRef.current = car.lane;
  }, [car.lane]);

  return (
    <CarContainer position={position} top={car.top} turnDirection={turnDirection} isCrashed={car.isCrashed} />
  );
};

export default DrunkEnemyCar; 