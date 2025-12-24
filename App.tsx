import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { HandController } from './components/HandController';
import { TreeState, GestureType, PhotoData } from './types';
import { Upload } from 'lucide-react';

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

// Refined Spiral Distribution for a cleaner, organized look
const getSpiralPoint = (index: number, total: number) => {
  // Compressed height range for better visibility and density
  const h = 10; 
  const yStart = -1.5; 
  
  const radiusBottom = 5.2;
  const radiusTop = 2.5;

  // Normalized height position (0 to 1)
  const t = index / Math.max(total - 1, 1);
  
  const y = yStart + (t * h);

  const radius = THREE.MathUtils.lerp(radiusBottom, radiusTop, t);

  // Balanced spiral step (~126 degrees) to create a pleasing distribution
  // ensuring frames don't clump together.
  const angle = index * 2.2 + 0.5; 

  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  
  // Rotation: Face Outwards from Center
  const angleY = Math.atan2(x, z);
  
  const rot = new THREE.Euler(
      -0.1, // Minimal tilt for cleaner vertical alignment
      angleY, 
      0
  );

  return { pos: new THREE.Vector3(x, y, z), rot };
};

function App() {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.FORMED);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | null>(null);
  const [cameraRotation, setCameraRotation] = useState({ x: 0.5, y: 0.5 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize 6 Empty Frames
  useEffect(() => {
    const initialPhotos: PhotoData[] = [];
    const TOTAL_FRAMES = 6;
    
    for (let i = 0; i < TOTAL_FRAMES; i++) {
        const { pos, rot } = getSpiralPoint(i, TOTAL_FRAMES);
        initialPhotos.push({
            id: `frame-${i}`,
            url: '', // Empty initially
            position: pos,
            rotation: rot,
            chaosPosition: randomSpherePoint(20)
        });
    }
    setPhotos(initialPhotos);
  }, []);

  // --- Hand Logic ---
  const handleGesture = useCallback((gesture: GestureType, handCenter?: { x: number, y: number }) => {
    
    // State Transitions based on Gesture
    if (gesture === GestureType.FIST) {
      // STRICT LOGIC: Only allow forming the tree if we are currently in CHAOS.
      // This prevents accidental triggering when holding/viewing a photo (PHOTO_FOCUS).
      if (treeState === TreeState.CHAOS) {
        setTreeState(TreeState.FORMED);
        setFocusedPhotoId(null);
      }
    } 
    else if (gesture === GestureType.OPEN_PALM) {
      // Open Palm acts as "Back" or "Explode"
      if (treeState !== TreeState.CHAOS) {
        setTreeState(TreeState.CHAOS);
        setFocusedPhotoId(null);
      }
      
      // Update Camera Rotation only when in Chaos (Navigation Mode)
      if (treeState === TreeState.CHAOS && handCenter) {
        setCameraRotation(prev => ({
          x: prev.x * 0.9 + handCenter.x * 0.1,
          y: prev.y * 0.9 + handCenter.y * 0.1
        }));
      }
    } 
    else if (gesture === GestureType.PINCH) {
        // Find first non-empty photo to focus or random
        const validPhotos = photos.filter(p => p.url !== '');
        
        // Allow entering focus from Chaos
        if (treeState === TreeState.CHAOS && validPhotos.length > 0) {
            setTreeState(TreeState.PHOTO_FOCUS);
            const randomPhoto = validPhotos[Math.floor(Math.random() * validPhotos.length)];
            setFocusedPhotoId(randomPhoto.id);
        }
    }
  }, [treeState, photos]);


  // --- Photo Upload Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      
      setPhotos(prev => {
        // Find first empty frame
        const emptyIndex = prev.findIndex(p => p.url === '');
        
        if (emptyIndex !== -1) {
            // Fill existing empty frame
            const newPhotos = [...prev];
            newPhotos[emptyIndex] = { ...newPhotos[emptyIndex], url };
            return newPhotos;
        } else {
            // All full? Replace random
            const randomIndex = Math.floor(Math.random() * prev.length);
            const newPhotos = [...prev];
            newPhotos[randomIndex] = { ...newPhotos[randomIndex], url };
            return newPhotos;
        }
      });
    }
  };

  const manualToggle = useCallback(() => {
    // Manual toggle logic follows the same rule: Focus -> Chaos -> Formed
    setTreeState(prev => {
        // Return to FORMED if currently viewing a photo
        if (prev === TreeState.PHOTO_FOCUS) return TreeState.FORMED;
        
        if (prev === TreeState.FORMED) return TreeState.CHAOS;
        if (prev === TreeState.CHAOS) return TreeState.FORMED;
        
        return TreeState.CHAOS;
    });
  }, []);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-luxury-green to-luxury-dark overflow-hidden">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Scene 
          treeState={treeState} 
          photos={photos} 
          focusedPhotoId={focusedPhotoId} 
          cameraRotation={cameraRotation}
        />
      </div>

      {/* UI Overlay */}
      <UI state={treeState} onToggle={manualToggle} />
      
      {/* Hand Controller (Invisible Logic + Debug Canvas) */}
      <HandController onGestureDetect={handleGesture} currentState={treeState} />

      {/* Upload Button */}
      <div className="absolute top-6 left-6 z-50">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileUpload} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-luxury-gold/20 hover:bg-luxury-gold/40 border border-luxury-gold text-luxury-gold px-4 py-2 rounded-full transition-all backdrop-blur-sm"
        >
          <Upload size={16} />
          <span className="text-xs font-serif tracking-widest">ADD PHOTO MEMORY</span>
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
    </div>
  );
}

export default App;