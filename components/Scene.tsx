import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { TreeState, PhotoData } from '../types';
import { TreeFoliage, OrnamentsInstanced } from './TreeSystem';
import { PhotoGallery } from './PhotoGallery';
import './TreeMaterials';

interface SceneProps {
  treeState: TreeState;
  photos: PhotoData[];
  focusedPhotoId: string | null;
  cameraRotation: { x: number, y: number };
}

// --- Snow Component ---
const Snow = () => {
  const meshRef = useRef<THREE.Points>(null);
  const count = 1500; // Good volume for snow
  
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;     // X: Wide spread
      pos[i * 3 + 1] = Math.random() * 40 - 10;    // Y: Top to bottom
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60; // Z: Depth
      spd[i] = 1 + Math.random() * 2.5;            // Random fall speed
    }
    return [pos, spd];
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    // Clamp delta
    const safeDelta = Math.min(delta, 0.1);
    
    const posAttr = meshRef.current.geometry.attributes.position;
    
    for (let i = 0; i < count; i++) {
      // Move down
      posAttr.array[i * 3 + 1] -= speeds[i] * safeDelta;

      // Reset if too low
      if (posAttr.array[i * 3 + 1] < -15) {
        posAttr.array[i * 3 + 1] = 25;
        // Randomize X/Z again on reset to avoid repeating patterns
        posAttr.array[i * 3] = (Math.random() - 0.5) * 60;
        posAttr.array[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    posAttr.needsUpdate = true;
    
    // Slight rotation of the whole snow system for "wind"
    meshRef.current.rotation.y += safeDelta * 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.15} 
        color="#FFFFFF" 
        transparent 
        opacity={0.6} 
        depthWrite={false} 
      />
    </points>
  );
};

// --- Star Component ---
const StarTop = ({ isFormed }: { isFormed: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1.2;
    const innerRadius = 0.5;
    
    // Draw Star Shape
    for(let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const a = (i / (points * 2)) * Math.PI * 2 + (Math.PI / 2); 
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if(i===0) shape.moveTo(x,y);
        else shape.lineTo(x,y);
    }
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 2
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFD700',
    emissive: '#AA8800',
    emissiveIntensity: 0.5,
    metalness: 1,
    roughness: 0.1
  }), []);

  useFrame((state, delta) => {
    if(!meshRef.current) return;
    const safeDelta = Math.min(delta, 0.1);
    
    // Rotate
    meshRef.current.rotation.y += safeDelta * 0.5;

    // Bobbing motion
    const time = state.clock.elapsedTime;
    const targetY = 10.0 + Math.sin(time) * 0.2; 
    
    // Chaos vs Formed position logic
    const currentPos = meshRef.current.position;
    
    if (isFormed) {
        currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetY, safeDelta * 2);
        currentPos.x = THREE.MathUtils.lerp(currentPos.x, 0, safeDelta * 2);
        currentPos.z = THREE.MathUtils.lerp(currentPos.z, 0, safeDelta * 2);
    } else {
        // In chaos, float higher and wander slightly
        currentPos.y = THREE.MathUtils.lerp(currentPos.y, 15, safeDelta * 0.5);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} position={[0, 15, 0]} castShadow receiveShadow />
  );
};

// Separate component to handle camera lerping
const CameraController: React.FC<{ rotationInput: { x: number, y: number }, treeState: TreeState }> = ({ rotationInput, treeState }) => {
  const cameraGroup = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (!cameraGroup.current) return;
    const safeDelta = Math.min(delta, 0.1);

    if (treeState === TreeState.PHOTO_FOCUS) {
      // FORCE RESET TO CENTER to look at the photo
      cameraGroup.current.rotation.y = THREE.MathUtils.lerp(cameraGroup.current.rotation.y, 0, safeDelta * 3);
      cameraGroup.current.rotation.x = THREE.MathUtils.lerp(cameraGroup.current.rotation.x, 0, safeDelta * 3);
    } 
    else if (treeState === TreeState.CHAOS) {
      const targetAzimuth = (rotationInput.x - 0.5) * Math.PI * 2; // Full rotation
      const targetPolar = (rotationInput.y - 0.5) * Math.PI;

      cameraGroup.current.rotation.y = THREE.MathUtils.lerp(cameraGroup.current.rotation.y, -targetAzimuth, safeDelta * 2);
      cameraGroup.current.rotation.x = THREE.MathUtils.lerp(cameraGroup.current.rotation.x, -targetPolar * 0.5, safeDelta * 2);
    } 
    else {
      // FORMED
      cameraGroup.current.rotation.x = THREE.MathUtils.lerp(cameraGroup.current.rotation.x, 0, safeDelta * 2);
      cameraGroup.current.rotation.y += safeDelta * 0.05; 
    }
  });

  return (
    <group ref={cameraGroup}>
      <PerspectiveCamera makeDefault position={[0, 0, 60]} fov={45} />
    </group>
  );
};

export const Scene: React.FC<SceneProps> = ({ treeState, photos, focusedPhotoId, cameraRotation }) => {
  // Geometry
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const ballGeo = useMemo(() => new THREE.SphereGeometry(0.6, 16, 16), []);
  const caneGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 1, 16), []);
  
  // Materials
  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#D4AF37',
    metalness: 1,
    roughness: 0.15,
    envMapIntensity: 1.5
  }), []);

  const redGiftMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8B0000', 
    metalness: 0.4,
    roughness: 0.3,
  }), []);

  const greenGiftMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#004225', 
    metalness: 0.5,
    roughness: 0.2,
  }), []);
  
  const whiteGlowMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFEE',
    emissive: '#FFFFDD',
    emissiveIntensity: 2,
    toneMapped: false 
  }), []);

  const caneMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FF0000',
    metalness: 0.1,
    roughness: 0.2,
    emissive: '#330000',
    emissiveIntensity: 0.2
  }), []);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
      shadows
    >
      <CameraController rotationInput={cameraRotation} treeState={treeState} />

      {/* Lighting */}
      <ambientLight intensity={0.2} color="#001a10" />
      <spotLight position={[10, 40, 10]} angle={0.3} penumbra={1} intensity={2} color="#F9E29C" castShadow />
      <pointLight position={[-10, 0, -10]} intensity={1} color="#D4AF37" />
      <pointLight position={[10, -5, 10]} intensity={1} color="#8B0000" />

      <Environment preset="city" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Background Snow Effect */}
      <Snow />

      <group position={[0, -5, 0]}>
        {/* Star Top - Updated Logic: Remains formed during Photo Focus */}
        <StarTop isFormed={treeState === TreeState.FORMED || treeState === TreeState.PHOTO_FOCUS} />

        <TreeFoliage state={treeState} />
        
        {/* Photo Cloud */}
        <PhotoGallery photos={photos} treeState={treeState} focusedId={focusedPhotoId} />

        {/* ORNAMENTS - OPTIMIZED COUNTS */}
        
        {/* RED Boxes (30 + 20 = 50) */}
        <OrnamentsInstanced state={treeState} count={50} geo={boxGeo} mat={redGiftMaterial} scaleBase={0.5} weight={2.0} />
        
        {/* GREEN Boxes (60 + 20 = 80) */}
        <OrnamentsInstanced state={treeState} count={80} geo={boxGeo} mat={greenGiftMaterial} scaleBase={0.5} weight={2.1} />

        {/* GOLD CUBES (150 / 2 = 75) */}
        <OrnamentsInstanced state={treeState} count={75} geo={boxGeo} mat={goldMaterial} scaleBase={0.55} weight={2.3} />

        {/* GOLD SPHERES (Increased to 100) */}
        <OrnamentsInstanced state={treeState} count={100} geo={ballGeo} mat={goldMaterial} scaleBase={0.5} weight={2.2} />

        {/* Small Gold Ornaments (Increased to 200) */}
        <OrnamentsInstanced state={treeState} count={200} geo={ballGeo} mat={goldMaterial} scaleBase={0.3} weight={3.5} />
        
        {/* White Glow Ornaments (Reduced from 400 to 200 for performance) */}
        <OrnamentsInstanced state={treeState} count={200} geo={ballGeo} mat={whiteGlowMaterial} scaleBase={0.1} weight={5.0} />
        
        {/* Candy Canes (Reduced from 15 to 10 for performance) */}
        <OrnamentsInstanced state={treeState} count={10} geo={caneGeo} mat={caneMaterial} scaleBase={0.8} weight={2.5} spread={6.5} />
      </group>
    </Canvas>
  );
};