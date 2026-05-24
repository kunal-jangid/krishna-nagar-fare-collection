import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { StyleSheet, View } from 'react-native';

export const Scene = ({ children }: { children?: React.ReactNode }) => {
  return (
    <View style={styles.container}>
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
        <color attach="background" args={['#f0f0f0']} />
        <ambientLight intensity={1.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Grid 
          infiniteGrid 
          fadeDistance={50} 
          sectionSize={1} 
          cellColor="#6f6f6f"
          sectionColor="#9d9d9d"
        />
        {children}
        <OrbitControls makeDefault />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
