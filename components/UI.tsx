import React from 'react';
import { TreeState } from '../types';
import { Sparkles, Box, Maximize2, ArrowLeft } from 'lucide-react';

interface UIProps {
  state: TreeState;
  onToggle: () => void;
}

export const UI: React.FC<UIProps> = ({ state, onToggle }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      
      {/* Header */}
      <div className="flex flex-col items-center mt-4 opacity-90">
        <h1 className="font-serif text-5xl md:text-7xl text-luxury-gold tracking-wider text-center drop-shadow-lg" style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}>
          Merry Christmas
        </h1>
        <div className="h-0.5 w-32 bg-luxury-gold mt-4 mb-2 shadow-[0_0_10px_#D4AF37]"></div>
        <p className="font-sans text-luxury-accent text-sm tracking-[0.3em] uppercase">a gift for LEIMING</p>
      </div>

      {/* Controls */}
      <div className="flex justify-center mb-12 pointer-events-auto">
        <button
          onClick={onToggle}
          className={`
            relative group px-12 py-4 border-2 border-luxury-gold 
            transition-all duration-700 ease-out
            ${state === TreeState.FORMED || state === TreeState.PHOTO_FOCUS ? 'bg-luxury-gold/10' : 'bg-transparent'}
          `}
        >
          {/* Button Background & Hover Effects */}
          <div className="absolute inset-0 bg-luxury-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left opacity-20"></div>
          
          <div className="flex items-center gap-4">
            {state === TreeState.CHAOS ? (
              <Maximize2 className="text-luxury-gold w-6 h-6 animate-pulse" />
            ) : state === TreeState.PHOTO_FOCUS ? (
              <ArrowLeft className="text-luxury-gold w-6 h-6" />
            ) : (
              <Box className="text-luxury-gold w-6 h-6" />
            )}
            
            <span className="font-serif text-xl text-luxury-gold font-bold tracking-widest">
              {state === TreeState.CHAOS ? 'ASSEMBLE' : state === TreeState.PHOTO_FOCUS ? 'RETURN' : 'RELEASE'}
            </span>
            
            <Sparkles className={`text-luxury-accent w-5 h-5 ${state === TreeState.FORMED ? 'animate-spin' : ''}`} />
          </div>
        </button>
      </div>

      {/* Footer / Credits */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
         <p className="text-luxury-gold/40 text-xs font-sans tracking-widest">DESIGNED FOR EXCELLENCE</p>
      </div>
    </div>
  );
};