import * as THREE from 'three';
import React from 'react';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

// A shimmering gold/green shader for the pine needles
export const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorBase: new THREE.Color('#004225'), // Deep Emerald
    uColorTip: new THREE.Color('#D4AF37'),  // Gold
    uPixelRatio: 1,
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uPixelRatio;
    attribute float aSize;
    attribute float aPhase;
    
    varying vec3 vPosition;
    varying float vPhase;
    varying float vSize;

    void main() {
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      vPhase = aPhase;
      vSize = aSize;
      
      vec4 mvPosition = vec4(vPosition, 1.0);
      
      // Breathing scale effect
      float breath = 1.0 + 0.1 * sin(uTime * 2.0 + aPhase);
      
      // Size calculation
      gl_PointSize = (aSize * 0.15) * uPixelRatio * breath * (100.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColorBase;
    uniform vec3 uColorTip;
    uniform float uTime;
    
    varying vec3 vPosition;
    varying float vPhase;
    varying float vSize;

    void main() {
      // Circular particle shape
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if(dist > 0.5) discard;
      
      // Calculate pseudo-normal for 3D sphere look
      vec3 normal = vec3(coord * 2.0, sqrt(1.0 - dot(coord * 2.0, coord * 2.0)));
      normal = normalize(normal);

      // View Direction (Approximation in View Space, camera is at 0,0,0 so viewDir is -vPosition)
      vec3 viewDir = normalize(-vPosition);
      
      // Metallic Luster Logic
      // 1. Specular highlight moving with view
      float specular = pow(max(dot(normal, viewDir), 0.0), 3.0);
      
      // 2. View-dependent shimmer (Glitter effect when rotating camera)
      // Dot product of viewDir and a fixed vector creates a "glint" angle
      float shimmer = sin(dot(viewDir, vec3(0.0, 1.0, 0.0)) * 20.0 + vPhase);
      
      // Base Mix (Green bottom, Gold top)
      float heightFactor = smoothstep(0.0, 10.0, vPosition.y + 5.0);
      vec3 baseColor = mix(uColorBase, uColorTip, heightFactor * 0.3);
      
      // Breathing Golden Glow
      float breath = 0.5 + 0.5 * sin(uTime * 3.0 + vPhase);
      
      // Combine effects
      // If it's a "tip" particle (simulated by random phase or size), make it more golden
      float isGoldTip = step(0.6, sin(vPhase * 10.0));
      
      vec3 finalColor = baseColor;
      
      if (isGoldTip > 0.5) {
        // Metallic Gold Effect
        vec3 goldColor = uColorTip * 1.5;
        // Specular shine + Breathing pulse + Camera movement shimmer
        finalColor = mix(baseColor, goldColor, 0.8) + (vec3(1.0, 0.9, 0.5) * specular * (1.0 + shimmer * 0.5) * breath);
      } else {
        // Subtle shine for green parts
        finalColor += vec3(0.1) * specular;
      }

      // Soft edge
      float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ FoliageMaterial });
