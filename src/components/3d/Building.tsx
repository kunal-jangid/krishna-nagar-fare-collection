import React, { useRef, useState, memo } from 'react';
import { Mesh } from 'three';
import { Edges } from '@react-three/drei';
import { UI_CONSTANTS } from '../../constants/config';

import { StatusType } from '../../hooks/useBuildingData';

interface BuildingProps {
  floors: number;
  status: StatusType;
  onPress: () => void;
  houseNo?: string;
  position?: [number, number, number];
}

export const Building = memo(({ floors, status, onPress, houseNo, position }: BuildingProps) => {
  const meshRef = useRef<Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  // Height is centered at height/2
  const height = floors * UI_CONSTANTS.BUILDING_HEIGHT_MULTIPLIER;
  const yPos = height / 2;

  const color = status === 'green' 
    ? UI_CONSTANTS.GREEN_STATUS_COLOR 
    : status === 'grey' 
      ? UI_CONSTANTS.GREY_STATUS_COLOR
      : (hovered ? UI_CONSTANTS.HOVER_COLOR : UI_CONSTANTS.RED_STATUS_COLOR);

  return (
    <group position={position}>
      <mesh
        position={[0, yPos, 0]}
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onPress();
        }}
      >
        <boxGeometry args={[UI_CONSTANTS.BUILDING_WIDTH, height, UI_CONSTANTS.BUILDING_WIDTH]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.3}
          metalness={0.2}
        />
        {/* Add black edges to make buildings distinct */}
        <Edges
          threshold={15}
          color="#333"
          scale={1.001}
        />
      </mesh>
    </group>
  );
});
