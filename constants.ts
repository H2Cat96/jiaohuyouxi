import { LevelData, LetterPathConfig } from "./types";

// Using thumbnail endpoint with sz=w1000 is often more reliable for direct embedding 
// than the export=view endpoint which frequently hits quota limits or CORS blocks.
export const DEER_ASSETS = {
  IDLE: 'https://drive.google.com/thumbnail?id=19FQ3v_Hg-OXO8Rx10kM4MFt8rOUmzre2&sz=w1000',
  GUITAR: 'https://drive.google.com/thumbnail?id=105M8SbnbFQIGXCCkbKRg5y4w7d7w60RF&sz=w1000',
  ACCORDION: 'https://drive.google.com/thumbnail?id=1DVssPZVN-dH0BoCQ2Byqn3ELFkB9ZaHS&sz=w1000'
};

export const PROP_ASSETS = {
  GUITAR: 'https://drive.google.com/thumbnail?id=12P1mC5Bn8DkGj-lcHJIv7QzFJWYPMV34&sz=w500',
  ACCORDION: 'https://drive.google.com/thumbnail?id=1ocH1xJvtOWMvA7YFtAfPGByRuimbxeaH&sz=w500'
};

// Switched to thumbnail endpoint (sz=w1920) which is much more reliable for embedding than uc?export=view
export const BACKGROUND_ASSET = 'https://drive.google.com/thumbnail?id=1M6QYA2QqEOXQl_j_0KPzbqP8wnZnU_Q2&sz=w1920';

export const LEVELS: LevelData[] = [
  { letter: 'A', word: 'Apple', hint: 'Yummy red fruit' },
  { letter: 'a', word: 'Ant', hint: 'Small insect' },
];

// Vector definitions for strict tracing
export const LETTER_PATHS: Record<string, LetterPathConfig> = {
  'A': {
    viewBox: { width: 100, height: 100 },
    strokes: [
      // Stroke 1: Left diagonal (\) - Top to Bottom-Left
      { 
        path: "M 50 15 L 20 85", 
        start: { x: 50, y: 15 }, 
        end: { x: 20, y: 85 },
        arrowRotation: 115 
      },
      // Stroke 2: Right diagonal (/) - Top to Bottom-Right
      { 
        path: "M 50 15 L 80 85", 
        start: { x: 50, y: 15 }, 
        end: { x: 80, y: 85 },
        arrowRotation: 65 
      },
      // Stroke 3: Horizontal (-) - Left to Right
      { 
        path: "M 30 60 L 70 60", 
        start: { x: 30, y: 60 }, 
        end: { x: 70, y: 60 },
        arrowRotation: 0 
      }
    ]
  },
  'a': {
    viewBox: { width: 100, height: 100 },
    strokes: [
      // Stroke 1: The circle/c part
      { 
        path: "M 70 45 A 20 20 0 1 0 70 75", // Draws a C shape loop
        start: { x: 70, y: 45 }, 
        end: { x: 70, y: 75 },
        arrowRotation: -45 
      },
      // Stroke 2: The vertical line
      { 
        path: "M 70 40 L 70 85", 
        start: { x: 70, y: 40 }, 
        end: { x: 70, y: 85 },
        arrowRotation: 90 
      }
    ]
  }
};

// Start Game BGM
export const BGM_URL = 'https://raw.githubusercontent.com/H2Cat96/game/339974de33892c1838e14616c62c0cf4a1431c02/bgm_%E5%85%A5%E5%9C%BA%E6%92%AD%E6%94%BE%E4%B8%80%E6%AC%A1.mp3';

// Specific SFX for Level 1 (Guitar) - Converted to raw GitHub user content URL
export const GUITAR_SFX = 'https://raw.githubusercontent.com/H2Cat96/game/339974de33892c1838e14616c62c0cf4a1431c02/%E5%90%89%E4%BB%96%E6%AD%A3%E7%A1%AE.mp3';

// Specific SFX for Level 2 (Accordion) - Converted to raw GitHub user content URL
export const ACCORDION_SFX = 'https://raw.githubusercontent.com/H2Cat96/game/339974de33892c1838e14616c62c0cf4a1431c02/%E6%89%8B%E9%A3%8E%E7%90%B4%E6%AD%A3%E7%A1%AE.mp3';

// Victory sound for the final result screen
export const GAME_WIN_SFX = '';

// Placeholder sound effect for success - kept empty to avoid errors if not used
export const SUCCESS_SFX = '';

// Short pleasant sound for immediate tracing success
export const TRACING_SUCCESS_SFX = 'https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3';