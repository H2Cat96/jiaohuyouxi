import React from 'react';

interface ResultModalProps {
  stars: number;
  onRestart: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ stars, onRestart }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-8 border-8 border-carrot-orange shadow-2xl flex flex-col items-center text-center animate-bounce-slow">
        <h2 className="text-4xl font-fredoka text-wood-brown mb-6">Level Complete!</h2>
        
        <div className="flex gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`text-7xl transition-all duration-1000 ${i <= stars ? 'opacity-100 scale-110 rotate-12' : 'opacity-30 grayscale'}`}>
              ⭐
            </div>
          ))}
        </div>

        <div className="text-xl font-nunito text-gray-600 mb-8 font-bold">
            {stars === 3 ? "Amazing Job!" : stars === 2 ? "Great Work!" : "Keep Practicing!"}
        </div>

        <button
          onClick={onRestart}
          className="bg-leaf-green hover:bg-green-500 text-white text-2xl font-fredoka px-12 py-4 rounded-full shadow-[0_6px_0_#4a7c2a] active:shadow-none active:translate-y-[6px] transition-all w-full"
        >
          Play Again 🎮
        </button>
      </div>
    </div>
  );
};

export default ResultModal;