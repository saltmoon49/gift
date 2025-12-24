import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import './TreeMaterials';

// Helpers
const randomSpherePoint = (radius: number) => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const conePoint = (height: number, baseRadius: number, yRatio: number) => {
  const y = (yRatio - 0.5) * height; // Center vertically roughly
  const r = (1 - yRatio) * baseRadius; // Radius shrinks as we go up
  const theta = Math.random() * Math.PI * 2;
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
};

interface TreeSystemProps {
  state: TreeState;
}

export const TreeFoliage: React.FC<TreeSystemProps> = ({ state }) => {
  // Balanced particle count - Reduced to 2000 for performance
  const COUNT = 2000; 
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null); 

  const [positions, phases, sizes, dualData] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const phs = new Float32Array(COUNT);
    const szs = new Float32Array(COUNT);
    const data: { chaos: THREE.Vector3; target: THREE.Vector3; speed: number }[] = [];

    for (let i = 0; i < COUNT; i++) {
      const chaos = randomSpherePoint(20);
      
      // OPTIMIZED DISTRIBUTION: 
      // Use 1 - sqrt(rand) to bias distribution towards 0 (bottom of tree)
      // This matches the surface area of a cone (more area at bottom)
      const r = Math.random();
      const biasedY = 1 - Math.sqrt(r); // 0 = Bottom, 1 = Top

      // Add a small random jitter to Y to prevent visible "banding" if math is too perfect
      const finalY = THREE.MathUtils.clamp(biasedY + (Math.random() - 0.5) * 0.05, 0, 1);
      
      const target = conePoint(16, 7, finalY); // Increased base radius slightly to 7

      data.push({
        chaos,
        target,
        speed: 0.5 + Math.random() * 1.5 
      });

      pos[i * 3] = chaos.x;
      pos[i * 3 + 1] = chaos.y;
      pos[i * 3 + 2] = chaos.z;

      phs[i] = Math.random() * Math.PI * 2;
      szs[i] = (Math.random() * 0.5 + 0.5) * 8.0; 
    }
    return [pos, phs, szs, data];
  }, []);

  useFrame((stateThree, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    
    // Safety: Clamp delta to avoid physics explosions when tab is inactive
    const safeDelta = Math.min(delta, 0.1);
    
    materialRef.current.uTime = stateThree.clock.elapsedTime;
    materialRef.current.uPixelRatio = Math.min(window.devicePixelRatio, 2);

    const positionsAttribute = meshRef.current.geometry.attributes.position;
    
    // UPDATE: Tree should remain formed when viewing a photo
    const isFormed = state === TreeState.FORMED || state === TreeState.PHOTO_FOCUS;
    
    for (let i = 0; i < COUNT; i++) {
      const { chaos, target, speed } = dualData[i];
      const ix = i * 3;
      const dest = isFormed ? target : chaos;
      const factor = THREE.MathUtils.clamp(safeDelta * speed * (isFormed ? 1.0 : 0.6), 0, 1);
      
      positionsAttribute.array[ix] = THREE.MathUtils.lerp(positionsAttribute.array[ix], dest.x, factor);
      positionsAttribute.array[ix+1] = THREE.MathUtils.lerp(positionsAttribute.array[ix+1], dest.y, factor);
      positionsAttribute.array[ix+2] = THREE.MathUtils.lerp(positionsAttribute.array[ix+2], dest.z, factor);
    }
    positionsAttribute.needsUpdate = true;
    
    if (isFormed) {
        meshRef.current.rotation.y += safeDelta * 0.05;
    } else {
        meshRef.current.rotation.y += safeDelta * 0.01;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aPhase" count={phases.length} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

export const OrnamentsInstanced: React.FC<{
  state: TreeState;
  count: number;
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  scaleBase: number;
  weight: number; 
  spread?: number;
}> = ({ state, count, geo, mat, scaleBase, weight, spread = 6 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const dualData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const chaos = randomSpherePoint(18);
      
      // Same optimized distribution for ornaments
      const r = Math.random();
      const biasedY = 1 - Math.sqrt(r); // Bottom heavy
      const finalY = THREE.MathUtils.clamp(biasedY + (Math.random() - 0.5) * 0.1, 0, 1);

      const target = conePoint(16, spread, finalY); 
      
      data.push({
        chaos,
        target,
        scale: (Math.random() * 0.4 + 0.6) * scaleBase,
        rotationSpeed: (Math.random() - 0.5) * 0.2, 
        phase: Math.random() * Math.PI
      });
    }
    return data;
  }, [count, scaleBase, spread]);

  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;
    
    // Safety: Clamp delta
    const safeDelta = Math.min(delta, 0.1);
    
    // UPDATE: Tree should remain formed when viewing a photo
    const isFormed = state === TreeState.FORMED || state === TreeState.PHOTO_FOCUS;

    dualData.forEach((d, i) => {
      if (!(d as any).currentPos) (d as any).currentPos = d.chaos.clone();
      const currentPos: THREE.Vector3 = (d as any).currentPos;

      const dest = isFormed ? d.target : d.chaos;
      const factor = THREE.MathUtils.clamp(safeDelta * weight * (isFormed ? 0.8 : 0.4), 0, 1);
      currentPos.lerp(dest, factor);

      dummy.position.copy(currentPos);
      
      dummy.rotation.x += d.rotationSpeed * safeDelta;
      dummy.rotation.y += d.rotationSpeed * safeDelta;
      dummy.rotation.z += d.rotationSpeed * safeDelta;
      
      const pulse = 1 + 0.05 * Math.sin(stateThree.clock.elapsedTime * 1.0 + d.phase);
      dummy.scale.setScalar(d.scale * pulse);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (isFormed) {
        meshRef.current.rotation.y += safeDelta * 0.05;
    } else {
        meshRef.current.rotation.y += safeDelta * 0.01;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, count]} castShadow receiveShadow />
  );
};