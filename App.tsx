import React, { useState, useEffect, useRef } from 'react';
import { LEVELS, SUCCESS_SFX, GUITAR_SFX, ACCORDION_SFX, BACKGROUND_ASSET, GAME_WIN_SFX, BGM_URL } from './constants';
import { GameState, DeerState } from './types';
import Character from './components/Character';
import TracingCard from './components/TracingCard';
import ResultModal from './components/ResultModal';
import GestureControl from './components/GestureControl';
import { generatePronunciation } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [deerState, setDeerState] = useState<DeerState>(DeerState.IDLE);
  const [stars, setStars] = useState(3);
  const [penalties, setPenalties] = useState(0); // Track failed attempts across game
  
  // State for gesture control mode
  const [isGestureMode, setIsGestureMode] = useState(false);
  
  // Audio Context for SFX
  const [audioCtx] = useState(() => {
    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    return CtxClass ? new CtxClass() : null;
  });

  const currentLevel = LEVELS[currentLevelIdx];

  const playSound = (url: string) => {
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 1.0;
    // Add error handling to debug playback issues (like 403 Forbidden from Drive)
    audio.play().catch(e => console.error(`Audio playback failed for ${url}:`, e));
  };

  const playBuffer = (buffer: AudioBuffer) => {
    if (!audioCtx) return;
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(e => console.warn("Failed to resume audio context", e));
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  };

  const handleStartGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(e => console.warn("Failed to resume audio context", e));
    }
    playSound(BGM_URL);
    setGameState(GameState.PLAYING);
  };

  const handleLevelSuccess = async (hadPenalty: boolean) => {
    // 1. Update Score Logic
    if (hadPenalty) {
        setPenalties(prev => prev + 1);
    }

    // 2. Transition State
    setGameState(GameState.SUCCESS_ANIMATION);
    
    // 3. Trigger Animations & Sound Logic based on Level
    // Level 0 ("A") -> Guitar
    // Level 1 ("a") -> Accordion (now uses Guitar sound as requested)
    let nextDeerAnim = DeerState.IDLE;
    
    if (currentLevelIdx === 0) {
        nextDeerAnim = DeerState.GUITAR;
        playSound(GUITAR_SFX);
    } else if (currentLevelIdx === 1) {
        nextDeerAnim = DeerState.ACCORDION;
        playSound(GUITAR_SFX); // Uses Guitar SFX as requested for consistency
    } else {
        // Fallback for any future levels
        nextDeerAnim = Math.random() > 0.5 ? DeerState.GUITAR : DeerState.ACCORDION;
        playSound(GUITAR_SFX);
    }
    
    setDeerState(nextDeerAnim);

    // 4. Call Gemini for TTS
    const speechBuffer = await generatePronunciation(currentLevel.letter, currentLevel.word);
    
    // 5. Play Pronunciation if available
    // Delay slightly to let the SFX start first
    if (speechBuffer) {
        setTimeout(() => {
            playBuffer(speechBuffer);
        }, 800);
    }

    // 6. Wait and Advance
    // Reduced timeout to 3000ms (was 4500ms) to speed up the flow
    setTimeout(() => {
        setDeerState(DeerState.IDLE);
        
        if (currentLevelIdx < LEVELS.length - 1) {
            setCurrentLevelIdx(prev => prev + 1);
            setGameState(GameState.PLAYING);
        } else {
            finishGame();
        }
    }, 3000); 
  };

  const finishGame = () => {
    let finalStars = 3;
    if (penalties >= 1) finalStars = 2;
    if (penalties >= 3) finalStars = 1;
    if (penalties > 5) finalStars = 0;
    
    setStars(finalStars);
    setGameState(GameState.FINISHED);
    
    // Play Victory Sound
    playSound(GAME_WIN_SFX);
  };

  const restartGame = () => {
      setCurrentLevelIdx(0);
      setStars(3);
      setPenalties(0);
      setDeerState(DeerState.IDLE);
      setGameState(GameState.PLAYING);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col bg-slate-200">
      {/* Gesture Controller Layer - Only Active in Gesture Mode */}
      {isGestureMode && <GestureControl />}

      {/* Background Image: No Z-Index (0), rendered first */}
      <img 
        src={BACKGROUND_ASSET} 
        alt="Game Background" 
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => console.warn("Background failed to load")}
      />
      
      {/* Main Game Area: Using Grid for stable layout */}
      <main className="relative z-10 w-full h-full flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-items-center max-w-[1600px] mx-auto p-4">
        
        {/* Left Column (Desktop) / Bottom (Mobile) - Character */}
        <div className="w-full h-full flex items-end justify-center md:justify-end order-2 md:order-1 relative pointer-events-none">
            <Character state={deerState} />
        </div>

        {/* Right Column (Desktop) / Top (Mobile) - Game UI */}
        {/* Added md:pl-32 to shift content right on desktop */}
        <div className="w-full h-full flex flex-col items-center justify-center md:items-start md:pl-32 order-1 md:order-2">
            
            {gameState === GameState.INTRO ? (
                 <div className="w-[300px] h-[400px] md:w-[450px] md:h-[600px] flex items-center justify-center">
                    <div className="bg-white p-12 rounded-[3rem] shadow-xl border-8 border-carrot-orange text-center w-full">
                        <p className="text-3xl text-wood-brown font-fredoka mb-8">
                            Ready to play?
                        </p>
                        <button 
                            onClick={handleStartGame}
                            className="bg-leaf-green hover:bg-green-500 text-white text-3xl font-fredoka px-12 py-4 rounded-full shadow-[0_8px_0_#4a7c2a] active:shadow-none active:translate-y-[8px] transition-all"
                        >
                            Start Game ▶
                        </button>
                    </div>
                 </div>
            ) : (
                <div className="relative flex flex-col items-center">
                    {/* Word Display (revealed on success) */}
                    <div className={`absolute top-1/2 left-0 right-0 text-center transition-all duration-700 z-20 ${gameState === GameState.SUCCESS_ANIMATION ? 'opacity-100 -translate-y-[200%] scale-100' : 'opacity-0 scale-50'}`}>
                         <span className="text-6xl font-fredoka text-carrot-orange bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-orange-100 whitespace-nowrap">
                             {currentLevel.word}
                         </span>
                    </div>

                    <TracingCard 
                        key={currentLevel.letter} // Re-mount on level change to reset state
                        levelData={currentLevel}
                        onSuccess={handleLevelSuccess}
                        isActive={gameState === GameState.PLAYING}
                    />
                </div>
            )}
        </div>
      </main>

      {/* Result Modal: Highest Z-Index */}
      {gameState === GameState.FINISHED && (
          <ResultModal stars={stars} onRestart={restartGame} />
      )}
      
      {/* Gesture Mode Toggle (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-50">
          <button 
              onClick={() => setIsGestureMode(!isGestureMode)}
              className={`text-sm font-bold py-2 px-4 rounded-full shadow-md backdrop-blur-sm border-2 transition-all flex items-center gap-2 ${
                  isGestureMode 
                  ? 'bg-leaf-green text-white border-green-700' 
                  : 'bg-white/80 hover:bg-white text-wood-brown border-wood-brown/20'
              }`}
          >
              <span>🖐️</span>
              {isGestureMode ? "Gesture Mode: ON" : "Enable Gesture Mode"}
          </button>
      </div>

    </div>
  );
};

export default App;