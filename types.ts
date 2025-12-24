import * as THREE from 'three';
import React from 'react';

export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED',
  PHOTO_FOCUS = 'PHOTO_FOCUS'
}

export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST',       // Formed
  OPEN_PALM = 'OPEN',  // Chaos / Rotate
  PINCH = 'PINCH'      // Focus Photo
}

export interface DualPosition {
  chaos: THREE.Vector3;
  target: THREE.Vector3;
  speed: number; 
  rotationAxis: THREE.Vector3;
  color?: THREE.Color;
}

export interface PhotoData {
  id: string;
  url: string;
  texture?: THREE.Texture;
  position: THREE.Vector3; // Target position on tree
  chaosPosition: THREE.Vector3;
  rotation: THREE.Euler;
}

// Extend JSX.IntrinsicElements to include standard R3F elements
// We augment 'react' module because React 18+ types often use React.JSX
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      // Core R3F
      primitive: any;
      group: any;
      mesh: any;
      instancedMesh: any;
      points: any;
      
      // Geometry
      bufferGeometry: any;
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      extrudeGeometry: any;
      
      // Attributes
      bufferAttribute: any;
      
      // Materials
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      shaderMaterial: any;
      
      // Custom materials
      foliageMaterial: any;

      // Lights
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      directionalLight: any;

      // Catch-all for React Three Fiber elements
      [elemName: string]: any;
    }
  }
}

// Fallback for global JSX (optional but good for safety)
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
      group: any;
      mesh: any;
      instancedMesh: any;
      points: any;
      bufferGeometry: any;
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      extrudeGeometry: any;
      bufferAttribute: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      shaderMaterial: any;
      foliageMaterial: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      directionalLight: any;
      [elemName: string]: any;
    }
  }
}