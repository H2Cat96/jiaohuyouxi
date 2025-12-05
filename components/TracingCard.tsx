import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { LevelData } from '../types';
import { TRACING_SUCCESS_SFX, LETTER_PATHS } from '../constants';

interface TracingCardProps {
  levelData: LevelData;
  onSuccess: (scorePenalty: boolean) => void;
  isActive: boolean;
}

const TracingCard: React.FC<TracingCardProps> = ({ levelData, onSuccess, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);
  
  // Game State
  const [activeStrokeIdx, setActiveStrokeIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [successTriggered, setSuccessTriggered] = useState(false);

  // Store user's completed strokes to persist them when redrawing
  // We use a secondary canvas in memory to store "ink"
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const letterConfig = useMemo(() => LETTER_PATHS[levelData.letter], [levelData.letter]);

  // --- Helper: Coordinate Conversion ---
  // Converts normalized 0-100 coordinates to actual canvas pixels
  const toPx = useCallback((val: number, size: number) => {
    return (val / 100) * size;
  }, []);

  const getPoint = useCallback((p: {x: number, y: number}, w: number, h: number) => {
    return { x: toPx(p.x, w), y: toPx(p.y, h) };
  }, [toPx]);


  // --- Initialization ---
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !letterConfig) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width || 450;
    const height = rect.height || 600;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Initialize Ink Canvas if size changed
    if (!inkCanvasRef.current) {
        inkCanvasRef.current = document.createElement('canvas');
    }
    // Ink canvas also needs high DPI
    // CRITICAL: Only reset width/height if they actually changed to avoid clearing ink
    if (inkCanvasRef.current.width !== width * dpr || inkCanvasRef.current.height !== height * dpr) {
        inkCanvasRef.current.width = width * dpr;
        inkCanvasRef.current.height = height * dpr;
        const inkCtx = inkCanvasRef.current.getContext('2d');
        if (inkCtx) {
            inkCtx.scale(dpr, dpr);
            inkCtx.lineCap = 'round';
            inkCtx.lineJoin = 'round';
        }
    }

    renderFrame();
  }, [letterConfig, activeStrokeIdx]); // Re-render if stroke index changes

  // --- Rendering Loop ---
  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !letterConfig) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get Dpr
    const dpr = window.devicePixelRatio || 1;
    // Use logical width/height for calculations
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear Screen (use actual width/height for clear)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set Base Transform for Drawing Visual Elements
    // We want to draw in logic pixels (CSS pixels), so we scale by DPR initially
    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Draw Base Tracks (Gray Background for ALL strokes)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    letterConfig.strokes.forEach(stroke => {
        const p = new Path2D(stroke.path);
        
        // Scale path to canvas size
        ctx.save();
        ctx.scale(w / 100, h / 100);
        
        ctx.lineWidth = 16; // Track width
        ctx.strokeStyle = '#e5e7eb'; // Gray-200 (lighter track)
        ctx.stroke(p);
        
        ctx.restore();
    });

    // 2. Draw Active Stroke Guides (if game not over)
    if (activeStrokeIdx < letterConfig.strokes.length) {
        const stroke = letterConfig.strokes[activeStrokeIdx];
        
        ctx.save();
        ctx.scale(w / 100, h / 100);
        
        const p = new Path2D(stroke.path);

        // Dashed Yellow Line
        ctx.setLineDash([5, 5]); 
        ctx.lineWidth = 2;       
        ctx.strokeStyle = '#FCD34D'; // Amber-300
        ctx.stroke(p);
        
        ctx.restore();

        // Start Point (Circle with Number)
        const startPt = getPoint(stroke.start, w, h);
        
        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, w * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B'; // Amber-500
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#FFF';
        ctx.font = `bold ${w * 0.05}px "Fredoka One"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((activeStrokeIdx + 1).toString(), startPt.x, startPt.y + 1); // +1 visual adjust

        // End Point (Arrow)
        const endPt = getPoint(stroke.end, w, h);
        const arrowSize = w * 0.05;
        
        ctx.save();
        ctx.translate(endPt.x, endPt.y);
        ctx.rotate((stroke.arrowRotation - 90) * Math.PI / 180); 
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize / 2, -arrowSize);
        ctx.lineTo(arrowSize / 2, -arrowSize);
        ctx.closePath();
        ctx.fillStyle = '#FCD34D';
        ctx.fill();
        ctx.restore();
    }
    
    ctx.restore(); // End visual elements drawing

    // 3. Draw Ink (On TOP of guides so we "fill" them)
    // InkCanvas is physically sized, so we copy it directly to the physical canvas
    if (inkCanvasRef.current) {
        ctx.save();
        ctx.resetTransform(); // Reset to identity to draw physical pixels 1:1
        
        // CRITICAL FIX: Clip ink to the existing shapes (tracks) using source-atop
        // This ensures the orange ink only appears where the gray track (or guides) have been drawn.
        ctx.globalCompositeOperation = 'source-atop';
        
        ctx.drawImage(inkCanvasRef.current, 0, 0, canvas.width, canvas.height);
        
        // Reset composite operation to default
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.restore();
    }
  };

  // --- EFFECT 1: RESET STATE WHEN LEVEL CHANGES ---
  useEffect(() => {
    setActiveStrokeIdx(0);
    setSuccessTriggered(false);
    setMistakes(0);
    
    // Clear the ink canvas
    if (inkCanvasRef.current) {
        const ctx = inkCanvasRef.current.getContext('2d');
        ctx?.save();
        ctx?.resetTransform();
        ctx?.clearRect(0, 0, inkCanvasRef.current.width, inkCanvasRef.current.height);
        ctx?.restore();
    }
    // Note: We don't call initCanvas/renderFrame here directly.
    // Changing activeStrokeIdx to 0 will trigger the next Effect via dependency update if needed,
    // or initCanvas will be called by the next effect on mount/update.
  }, [levelData.letter]); 

  // --- EFFECT 2: INITIALIZE CANVAS / HANDLE RESIZE ---
  useEffect(() => {
    const timer = setTimeout(initCanvas, 50);
    window.addEventListener('resize', initCanvas);
    
    return () => {
        window.removeEventListener('resize', initCanvas);
        clearTimeout(timer);
    };
  }, [initCanvas]);


  // --- User Interaction ---

  const startDrawing = (e: React.PointerEvent) => {
    if (!isActive || successTriggered || activeStrokeIdx >= letterConfig.strokes.length) return;
    
    const target = e.target as HTMLElement;
    
    // Safety check for synthetic events from GestureControl
    try {
        if (e.isTrusted) {
            target.setPointerCapture(e.pointerId);
        }
    } catch (err) {
        // Ignore setPointerCapture errors for synthetic events
    }
    
    isDrawingRef.current = true;
    
    const rect = target.getBoundingClientRect();
    lastPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    draw(e);
  };

  // Helper for linear interpolation
  const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || !isActive || successTriggered) return;
    
    const canvas = canvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!canvas || !inkCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    
    // Mouse coordinates in CSS pixels
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const w = rect.width;
    const h = rect.height;

    // Prepare Contexts for Checks
    const ctx = canvas.getContext('2d');
    const inkCtx = inkCanvas.getContext('2d');
    if (!ctx || !inkCtx) return;

    const currentStroke = letterConfig.strokes[activeStrokeIdx];
    const path2d = new Path2D(currentStroke.path);

    // Interpolation Logic
    const lastX = lastPosRef.current ? lastPosRef.current.x : currentX;
    const lastY = lastPosRef.current ? lastPosRef.current.y : currentY;

    const dist = Math.hypot(currentX - lastX, currentY - lastY);
    const steps = Math.ceil(dist / 2); // Sample every 2 pixels

    inkCtx.fillStyle = '#FF8C42'; // Orange

    for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 1 : i / steps;
        const x = lerp(lastX, currentX, t);
        const y = lerp(lastY, currentY, t);

        // HIT TESTING LOGIC
        ctx.save();
        ctx.resetTransform(); 
        
        // Scale 0-100 to Physical Dimensions
        ctx.scale((w * dpr) / 100, (h * dpr) / 100); 
        
        ctx.lineWidth = 24; 
        
        // Check point using Physical Coordinates
        const isInside = ctx.isPointInStroke(path2d, x * dpr, y * dpr);
        ctx.restore();

        if (isInside) {
            // Draw on Ink Canvas
            inkCtx.beginPath();
            inkCtx.arc(x, y, w * 0.065, 0, Math.PI * 2); // Brush size
            inkCtx.fill();
        }
    }

    // Update Last Pos
    lastPosRef.current = { x: currentX, y: currentY };

    // Check Progress (Proximity to End Point)
    const endPt = getPoint(currentStroke.end, w, h);
    const distToEnd = Math.hypot(currentX - endPt.x, currentY - endPt.y);
    
    // Render visual update
    renderFrame();

    // Completion Threshold (tolerant)
    if (distToEnd < w * 0.08) {
        completeStroke();
    }
  };

  const completeStroke = () => {
    if (activeStrokeIdx >= letterConfig.strokes.length) return;
    
    // Stop drawing immediately
    isDrawingRef.current = false;
    lastPosRef.current = null;

    // Play small pop
    if (TRACING_SUCCESS_SFX) {
        const audio = new Audio(TRACING_SUCCESS_SFX);
        audio.volume = 0.4;
        audio.play().catch(() => {});
    }

    // Force fill the current stroke perfectly
    const inkCanvas = inkCanvasRef.current;
    if (inkCanvas) {
        const ctx = inkCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current?.getBoundingClientRect();
        const w = rect?.width || 100;
        const h = rect?.height || 100;
        
        const stroke = letterConfig.strokes[activeStrokeIdx];
        
        if (ctx) {
            ctx.save();
            ctx.resetTransform();
            // Scale to fill physical canvas from 0-100 path
            ctx.scale((w * dpr) / 100, (h * dpr) / 100);

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 16; // Match track width exactly
            ctx.strokeStyle = '#FF8C42';
            ctx.stroke(new Path2D(stroke.path));
            ctx.restore();
        }
    }

    // Advance
    const nextIdx = activeStrokeIdx + 1;
    setActiveStrokeIdx(nextIdx);
    
    // Check Full Completion
    if (nextIdx >= letterConfig.strokes.length) {
        handleFullSuccess();
    }
  };

  const stopDrawing = (e: React.PointerEvent) => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const handleFullSuccess = () => {
      setSuccessTriggered(true);
      onSuccess(mistakes > 0);
  };

  const handleReset = () => {
      setMistakes(prev => prev + 1);
      setActiveStrokeIdx(0);
      setSuccessTriggered(false);
      if (inkCanvasRef.current) {
          const ctx = inkCanvasRef.current.getContext('2d');
          ctx?.save();
          ctx?.resetTransform();
          ctx?.clearRect(0, 0, inkCanvasRef.current.width, inkCanvasRef.current.height);
          ctx?.restore();
      }
      renderFrame();
  };

  // --- Hand Animation Styles ---
  const getHandStyle = () => {
      if (activeStrokeIdx >= letterConfig.strokes.length || successTriggered) return { display: 'none' };
      
      const stroke = letterConfig.strokes[activeStrokeIdx];
      return {
          '--start-x': `${stroke.start.x}%`,
          '--start-y': `${stroke.start.y}%`,
          '--end-x': `${stroke.end.x}%`,
          '--end-y': `${stroke.end.y}%`,
      } as React.CSSProperties;
  };

  return (
    <div className="flex flex-col items-center w-full">
        <style>{`
            @keyframes floatHand {
                0% { left: var(--start-x); top: var(--start-y); opacity: 0; transform: translate(5px, 5px) scale(0.9); }
                10% { opacity: 1; transform: translate(0, 0) scale(1); }
                25% { opacity: 1; transform: translate(0, 0) scale(1); } 
                80% { opacity: 1; transform: translate(0, 0) scale(1); }
                100% { left: var(--end-x); top: var(--end-y); opacity: 0; transform: translate(0, 0) scale(0.9); }
            }
            .hand-guide {
                position: absolute;
                width: 60px;
                height: 60px;
                pointer-events: none;
                z-index: 20;
                /* Updated to use custom hand image */
                background-image: url('https://drive.google.com/thumbnail?id=1UNgjvHCHP_ReHdzYx-Y2puSISnXFwhAv&sz=w200');
                background-repeat: no-repeat;
                background-size: contain;
                animation: floatHand 2.5s infinite ease-in-out;
                margin-left: 10px; 
                margin-top: 10px;
            }
        `}</style>

        <div 
            ref={containerRef}
            className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px] touch-none select-none bg-transparent"
        >
            <canvas
                ref={canvasRef}
                className={`w-full h-full pencil-cursor ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
            />

            {/* Hand Guide Overlay */}
            {!successTriggered && isActive && activeStrokeIdx < letterConfig.strokes.length && (
                <div 
                    key={activeStrokeIdx} /* Key change forces animation reset on new stroke */
                    className="hand-guide"
                    style={getHandStyle()}
                />
            )}

            {successTriggered && (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse z-10 pointer-events-none">
                    <span className="text-[10rem] drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">⭐</span>
                </div>
            )}
        </div>

        <div className="mt-8 flex gap-4">
            <button
                onClick={handleReset}
                disabled={!isActive || successTriggered}
                className="bg-white hover:bg-gray-50 text-sky-500 text-xl rounded-full px-8 py-3 font-fredoka shadow-lg active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-sky-100 flex items-center gap-2"
            >
                <span>Reset</span> 🔄
            </button>
        </div>
    </div>
  );
};

export default TracingCard;