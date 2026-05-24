import React, { useRef, useState } from 'react';
import { MeshProps } from '@react-three/fiber';
import { Mesh } from 'three';
import { Text } from '@react-three/drei';

interface BuildingProps extends MeshProps {
  floors: number;
  isRed?: boolean;
  onPress: () => void;
  houseNo?: string;
}

export const Building = ({ floors, isRed, onPress, houseNo, ...props }: BuildingProps) => {
  const meshRef = useRef<Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  // Height is 0.5 per floor, centered at height/2
  const height = floors * 0.8;
  const yPos = height / 2;

  return (
    <group position={props.position}>
      <mesh
        {...props}
        position={[0, yPos, 0]}
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onPress();
        }}
      >
        <boxGeometry args={[0.8, height, 0.8]} />
        <meshStandardMaterial 
          color={isRed ? '#ff5252' : (hovered ? '#e0e0e0' : '#ffffff')} 
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      {houseNo && (
        <Text
          position={[0, height + 0.2, 0]}
          fontSize={0.2}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {houseNo}
        </Text>
      )}
    </group>
  );
};
