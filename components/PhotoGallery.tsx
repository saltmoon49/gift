import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';
import { TreeState, PhotoData } from '../types';
import './TreeMaterials';

interface PhotoGalleryProps {
  photos: PhotoData[];
  treeState: TreeState;
  focusedId: string | null;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, treeState, focusedId }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const safeDelta = Math.min(delta, 0.1);
    
    // Slight rotation for the whole group when formed
    if (treeState === TreeState.FORMED) {
      groupRef.current.rotation.y += safeDelta * 0.05;
    } else if (treeState === TreeState.PHOTO_FOCUS) {
      // FIX: When focusing, the group might be rotated (e.g. 90 deg).
      // We must rotate it back to a multiple of 2PI (0 degrees visual) 
      // so that the photo at (0, 5, 45) aligns with the camera at (0, 0, 60).
      
      const currentRot = groupRef.current.rotation.y;
      // Find nearest multiple of 2PI to minimize spinning
      const targetRot = Math.round(currentRot / (Math.PI * 2)) * (Math.PI * 2);
      
      // Smoothly interpolate to aligned rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(currentRot, targetRot, safeDelta * 5);
    }
  });

  return (
    <group ref={groupRef}>
      {photos.map((photo) => (
        <PhotoItem 
          key={photo.id} 
          data={photo} 
          state={treeState} 
          isFocused={focusedId === photo.id} 
        />
      ))}
    </group>
  );
};

const PhotoItem: React.FC<{ data: PhotoData, state: TreeState, isFocused: boolean }> = ({ data, state, isFocused }) => {
  const ref = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const targetRot = useRef(new THREE.Quaternion());

  // Frame Geometry and Material (reused if possible, but created here for simplicity)
  // Simple gold border
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#D4AF37', 
    metalness: 0.9, 
    roughness: 0.1 
  }), []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const safeDelta = Math.min(delta, 0.1);

    // Determine targets based on state
    if (state === TreeState.PHOTO_FOCUS) {
      if (isFocused) {
        // Bring to front center (Camera is at 60, so 45 is close)
        // Center: 0, 0 (Scene offset is -5 in Y, so we need to compensate to be visually centered)
        // Since Scene group is at [0, -5, 0], putting this at [0, 5, 45] puts it at 0,0 world relative
        // Z=45 puts it 15 units from camera (Z=60)
        targetPos.current.set(0, 5, 45); 
        targetScale.current.set(10, 10, 1);
        targetRot.current.setFromEuler(new THREE.Euler(0, 0, 0));
      } else {
        // Scatter others far back and tiny
        targetPos.current.copy(data.chaosPosition).multiplyScalar(3); 
        targetScale.current.set(0, 0, 0); 
        targetRot.current.setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random()));
      }
    } else if (state === TreeState.CHAOS) {
      targetPos.current.copy(data.chaosPosition);
      targetScale.current.set(2, 2, 1);
      targetRot.current.setFromEuler(new THREE.Euler(0, 0, 0)); 
    } else {
      // FORMED
      targetPos.current.copy(data.position);
      targetScale.current.set(1.5, 1.5, 1);
      targetRot.current.setFromEuler(data.rotation);
    }

    // Lerp
    const speed = state === TreeState.PHOTO_FOCUS ? 3 : 1.5;
    ref.current.position.lerp(targetPos.current, safeDelta * speed);
    ref.current.scale.lerp(targetScale.current, safeDelta * speed);
    ref.current.quaternion.slerp(targetRot.current, safeDelta * speed);
  });

  return (
    <group ref={ref}>
       {/* Visual Frame Border */}
       <mesh position={[0, 0, -0.05]}>
         <boxGeometry args={[1.1, 1.1, 0.05]} />
         <primitive object={frameMaterial} />
       </mesh>
       
       {/* Black backing for empty frames */}
       <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#050505" />
       </mesh>

       {/* The Image (only if URL is valid blob, otherwise transparent) */}
       {data.url && (
         <Image 
           url={data.url} 
           transparent 
           scale={[1, 1]}
         />
       )}
    </group>
  );
};