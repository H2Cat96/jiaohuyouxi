import React from 'react';
import { DeerState } from '../types';
import { DEER_ASSETS, PROP_ASSETS } from '../constants';

interface CharacterProps {
  state: DeerState;
}

const Character: React.FC<CharacterProps> = ({ state }) => {
  const getSrc = () => {
    switch (state) {
      case DeerState.GUITAR:
        return DEER_ASSETS.GUITAR;
      case DeerState.ACCORDION:
        return DEER_ASSETS.ACCORDION;
      case DeerState.IDLE:
      default:
        return DEER_ASSETS.IDLE;
    }
  };

  // Removed 'duration-500' and 'scale-110' to satisfy the request:
  // 1. No zoom effect on guitar/accordion.
  // 2. Faster reaction (removed slow transition).
  return (
    <div className="relative w-[90vw] h-[90vw] md:w-[1000px] md:h-[1000px] flex items-end justify-center group -translate-y-24 md:-translate-y-64 -translate-x-4 md:-translate-x-20">
      <img
        src={getSrc()}
        alt={`Deer ${state}`}
        className="relative z-10 w-full h-full object-contain object-bottom mix-blend-multiply"
        onError={(e) => {
           console.warn(`Failed to load image for state: ${state}`);
        }}
      />
      
      {/* Props rearranged to be strictly on the floor/platform directly below the deer */}
      <img 
        src={PROP_ASSETS.GUITAR} 
        alt="Guitar Prop" 
        className="absolute -bottom-24 md:-bottom-48 right-[52%] w-24 md:w-44 -rotate-[15deg] drop-shadow-xl z-20 pointer-events-none"
      />
      <img 
        src={PROP_ASSETS.ACCORDION} 
        alt="Accordion Prop" 
        className="absolute -bottom-24 md:-bottom-48 left-[52%] w-24 md:w-44 rotate-[15deg] drop-shadow-xl z-20 pointer-events-none"
      />
    </div>
  );
};

export default Character;