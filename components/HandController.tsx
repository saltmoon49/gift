import React, { useEffect, useRef, useState } from 'react';
import { GestureType, TreeState } from '../types';

// Declare globals for MediaPipe since we loaded via script tags
declare const Hands: any;
declare const Camera: any;

interface HandControllerProps {
  onGestureDetect: (gesture: GestureType, handCenter?: {x: number, y: number}) => void;
  currentState: TreeState;
}

export const HandController: React.FC<HandControllerProps> = ({ onGestureDetect, currentState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [detectedGesture, setDetectedGesture] = useState<string>("NONE");
  
  // Ref to track last gesture to avoid stale closures / render loops in useEffect
  const lastGestureRef = useRef<string>("NONE");

  useEffect(() => {
    // Safety check: ensure MediaPipe libraries are loaded from index.html
    if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
      console.warn("MediaPipe globals (Hands/Camera) not found. Scripts may still be loading.");
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;

    const videoElement = videoRef.current;
    let isMounted = true;
    let handsInstance: any = null;
    let cameraInstance: any = null;
    
    // MediaPipe Hands setup
    const onResults = (results: any) => {
      if (!isMounted) return; // Prevent updates if unmounted

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setLoading(false);
        const landmarks = results.multiHandLandmarks[0];

        // --- Gesture Recognition Logic ---
        
        // 1. Calculate finger states
        // Tip vs PIP (Proximal Interphalangeal Joint)
        // Indices: Index(8,6), Middle(12,10), Ring(16,14), Pinky(20,18)
        const isFingerOpen = (tipIdx: number, pipIdx: number) => {
          return landmarks[tipIdx].y < landmarks[pipIdx].y; 
        };

        const indexOpen = isFingerOpen(8, 6);
        const middleOpen = isFingerOpen(12, 10);
        const ringOpen = isFingerOpen(16, 14);
        const pinkyOpen = isFingerOpen(20, 18);
        
        // 2. Detect Gestures
        let gesture = GestureType.NONE;

        // FIST: All fingers closed
        if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
          gesture = GestureType.FIST;
        }
        // OPEN PALM: All fingers open
        else if (indexOpen && middleOpen && ringOpen && pinkyOpen) {
          gesture = GestureType.OPEN_PALM;
        }
        
        // PINCH: Thumb tip close to Index tip
        const dx = landmarks[4].x - landmarks[8].x;
        const dy = landmarks[4].y - landmarks[8].y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < 0.05) {
          gesture = GestureType.PINCH;
        }

        // 3. Calculate Hand Center (for rotation)
        const centerX = (landmarks[0].x + landmarks[9].x) / 2;
        const centerY = (landmarks[0].y + landmarks[9].y) / 2;

        // Update UI State if changed
        if (lastGestureRef.current !== gesture) {
            lastGestureRef.current = gesture;
            setDetectedGesture(gesture);
        }

        onGestureDetect(gesture, { x: centerX, y: centerY });

      } else {
         if (lastGestureRef.current !== GestureType.NONE) {
            lastGestureRef.current = GestureType.NONE;
            setDetectedGesture(GestureType.NONE);
            onGestureDetect(GestureType.NONE);
         }
      }
    };

    try {
      handsInstance = new Hands({locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }});

      handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handsInstance.onResults(onResults);

      cameraInstance = new Camera(videoElement, {
        onFrame: async () => {
          if (isMounted && videoElement && handsInstance) {
             await handsInstance.send({image: videoElement});
          }
        },
        width: 320,
        height: 240
      });

      cameraInstance.start()
        .catch((err: any) => {
          console.error("Camera start failed:", err);
          if (isMounted) setLoading(false);
        });

    } catch (error) {
      console.error("Failed to initialize HandController:", error);
    }

    return () => {
      isMounted = false;
      if (handsInstance) {
        handsInstance.close();
      }
      // Force stop video tracks to release camera light
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onGestureDetect]);

  return (
    <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Hidden Video and Canvas Elements */}
      <video ref={videoRef} className="hidden" playsInline />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Status Panel - Only visible element */}
      <div className="bg-luxury-dark/60 backdrop-blur-md border border-luxury-gold/30 p-4 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] text-right transition-all duration-300">
        {loading ? (
           <div className="text-luxury-gold text-xs font-serif tracking-widest animate-pulse">
             INITIALIZING SENSORS...
           </div>
        ) : (
           <>
             <div className="text-luxury-gold/60 text-[10px] font-serif tracking-[0.2em] mb-1">
               GESTURE CONTROL
             </div>
             <div className={`text-2xl font-bold tracking-widest mb-3 transition-colors duration-300 ${detectedGesture !== 'NONE' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/30'}`}>
               {detectedGesture === 'NONE' ? 'WAITING...' : detectedGesture}
             </div>
             
             <div className="h-px w-full bg-gradient-to-r from-transparent via-luxury-gold/30 to-transparent mb-3"></div>
             
             <div className="text-[10px] text-luxury-accent/80 font-sans tracking-wider space-y-1.5">
               <div className={`flex justify-end gap-2 transition-opacity ${detectedGesture === GestureType.FIST ? 'opacity-100 text-luxury-gold' : 'opacity-50'}`}>
                 <span>FORM TREE</span> <span className="font-bold">FIST</span>
               </div>
               <div className={`flex justify-end gap-2 transition-opacity ${detectedGesture === GestureType.OPEN_PALM ? 'opacity-100 text-luxury-gold' : 'opacity-50'}`}>
                 <span>CHAOS / ROTATE</span> <span className="font-bold">OPEN</span>
               </div>
               <div className={`flex justify-end gap-2 transition-opacity ${detectedGesture === GestureType.PINCH ? 'opacity-100 text-luxury-gold' : 'opacity-50'}`}>
                 <span>FOCUS PHOTO</span> <span className="font-bold">PINCH</span>
               </div>
             </div>
           </>
        )}
      </div>
    </div>
  );
};