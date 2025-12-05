import React, { useEffect, useRef, useState } from 'react';
import { createHandLandmarker } from '../services/vision';
import { HandLandmarker } from "@mediapipe/tasks-vision";

// Hysteresis Thresholds: 
// Must pinch tighter (0.05) to start, but can relax to (0.09) before stopping.
// This prevents the line from breaking when the hand jitters slightly.
const PINCH_START_THRESHOLD = 0.05; 
const PINCH_STOP_THRESHOLD = 0.09;

// Lower factor = More smoothing (less jitter, slightly more latency)
// Reduced from 0.3 to 0.12 to make lines straighter
const SMOOTHING_FACTOR = 0.12; 

const GestureControl: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cursor state for rendering the visual feedback
  const [cursor, setCursor] = useState({ x: 0, y: 0, isPinching: false, visible: false });

  // Refs for logic loop to avoid re-renders
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastCursorPos = useRef({ x: 0, y: 0 });
  const wasPinching = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        const landmarker = await createHandLandmarker();
        handLandmarkerRef.current = landmarker;
        startCamera();
      } catch (e) {
        console.error("Failed to init hand tracking:", e);
        setError("Gesture unavailable");
      }
    };
    init();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predict);
      setIsLoaded(true);
    } catch (e) {
      console.error("Camera access denied:", e);
      setError("Camera blocked");
    }
  };

  const predict = async () => {
    if (!videoRef.current || !handLandmarkerRef.current) return;

    let startTimeMs = performance.now();
    const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      // Index finger tip (8)
      const indexTip = landmarks[8];
      // Thumb tip (4)
      const thumbTip = landmarks[4];

      // 1. Calculate Cursor Position (Mirror X)
      const rawX = (1 - indexTip.x) * window.innerWidth;
      const rawY = indexTip.y * window.innerHeight;

      // Heavy Smoothing for straight lines
      const smoothX = lastCursorPos.current.x + (rawX - lastCursorPos.current.x) * SMOOTHING_FACTOR;
      const smoothY = lastCursorPos.current.y + (rawY - lastCursorPos.current.y) * SMOOTHING_FACTOR;
      
      // Deadzone Check: If movement is extremely small, assume it's noise and keep old pos
      // This helps steady the hand when holding position
      const deltaMovement = Math.hypot(smoothX - lastCursorPos.current.x, smoothY - lastCursorPos.current.y);
      const finalX = deltaMovement < 1.0 ? lastCursorPos.current.x : smoothX;
      const finalY = deltaMovement < 1.0 ? lastCursorPos.current.y : smoothY;
      
      lastCursorPos.current = { x: finalX, y: finalY };

      // 2. Detect Pinch with Hysteresis
      const dx = indexTip.x - thumbTip.x;
      const dy = indexTip.y - thumbTip.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let isPinching = wasPinching.current;
      
      if (isPinching) {
        // If currently pinching, we need to open wide to stop (upper threshold)
        if (distance > PINCH_STOP_THRESHOLD) {
            isPinching = false;
        }
      } else {
        // If not pinching, we need to close tight to start (lower threshold)
        if (distance < PINCH_START_THRESHOLD) {
            isPinching = true;
        }
      }

      // 3. Update Visual State
      setCursor({ x: finalX, y: finalY, isPinching, visible: true });

      // 4. Dispatch Synthetic Events
      dispatchPointerEvent(finalX, finalY, isPinching);

    } else {
      setCursor(prev => ({ ...prev, visible: false }));
    }

    animationFrameRef.current = requestAnimationFrame(predict);
  };

  const dispatchPointerEvent = (x: number, y: number, isPinching: boolean) => {
    // Find the element under the virtual cursor
    const element = document.elementFromPoint(x, y);
    if (!element) return;

    const eventOptions = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 999, // Custom ID for virtual pointer
      pointerType: 'mouse', // Simulate mouse for better compatibility
      isPrimary: true,
      pressure: isPinching ? 1 : 0
    };

    // State Machine for Down/Move/Up
    if (isPinching && !wasPinching.current) {
      // Just Started Pinching -> DOWN
      const downEvent = new PointerEvent('pointerdown', { ...eventOptions, buttons: 1 });
      element.dispatchEvent(downEvent);
    } else if (isPinching && wasPinching.current) {
      // Continuing Pinch -> MOVE (Drag)
      const moveEvent = new PointerEvent('pointermove', { ...eventOptions, buttons: 1 });
      element.dispatchEvent(moveEvent);
    } else if (!isPinching && wasPinching.current) {
      // Stopped Pinching -> UP
      const upEvent = new PointerEvent('pointerup', { ...eventOptions, buttons: 0 });
      element.dispatchEvent(upEvent);
    } else {
      // Just moving (Hover)
      const moveEvent = new PointerEvent('pointermove', { ...eventOptions, buttons: 0 });
      element.dispatchEvent(moveEvent);
    }

    wasPinching.current = isPinching;
  };

  return (
    <>
      {/* Hidden processing video */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted
        className="fixed bottom-4 left-4 w-32 h-24 object-cover rounded-lg border-2 border-white opacity-50 z-50 pointer-events-none -scale-x-100 hidden md:block" 
      />
      
      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 left-4 text-red-500 bg-white px-2 py-1 rounded text-xs z-50">
          {error}
        </div>
      )}

      {/* Visual Cursor */}
      {cursor.visible && (
        <div 
          className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out flex flex-col items-center"
          style={{ 
            left: 0, 
            top: 0, 
            transform: `translate(${cursor.x}px, ${cursor.y}px)` 
          }}
        >
          {/* Cursor Circle */}
          <div className={`w-8 h-8 rounded-full border-4 shadow-lg transition-colors duration-150 -translate-x-1/2 -translate-y-1/2 ${cursor.isPinching ? 'bg-leaf-green border-white scale-90' : 'bg-transparent border-carrot-orange'}`}></div>
          
          {/* Label */}
          <span className="mt-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
            {cursor.isPinching ? "Drawing" : "Pinch to Draw"}
          </span>
        </div>
      )}
    </>
  );
};

export default GestureControl;