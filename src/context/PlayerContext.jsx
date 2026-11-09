/**
 * PlayerContext.jsx
 * ==================
 * Global React context for player state.
 * Handles loading/saving to localStorage for persistence with versioned migration.
 * All game state mutations go through this context.
 */

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { DEFAULT_PLAYER } from '../data/playerDefaults.js';
import {
  applyLevelCompletion,
  applySanityCheckCompletion,
} from '../logic/progressionEngine.js';
import {
  loadAndMigrateStorage,
  STORAGE_KEY_V2,
} from '../logic/storageMigration.js';

// ─── Context ────────────────────────────────────────────────────────────────
const PlayerContext = createContext(null);

// ─── Reducer ────────────────────────────────────────────────────────────────
function playerReducer(state, action) {
  switch (action.type) {
    case 'LOAD_PLAYER':
      return {
        ...DEFAULT_PLAYER,
        ...action.payload,
        levelProgress: action.payload.levelProgress || {},
        sanityCheckProgress: action.payload.sanityCheckProgress || {},
      };

    case 'SET_NAME':
      return { ...state, name: action.payload };

    case 'COMPLETE_LEVEL': {
      const { kingdomId, level, score, artifacts } = action.payload;
      return applyLevelCompletion(state, kingdomId, level, score, artifacts);
    }

    case 'PASS_SANITY_CHECK': {
      const { kingdomId, check, score } = action.payload;
      return applySanityCheckCompletion(state, kingdomId, check, score);
    }

    case 'RESET_PROGRESS':
      return {
        ...DEFAULT_PLAYER,
        name: state.name,
        avatarEmoji: state.avatarEmoji,
        createdAt: new Date().toISOString(),
      };

    case 'SET_AVATAR':
      return { ...state, avatarEmoji: action.payload };

    default:
      return state;
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function PlayerProvider({ children }) {
  const [player, dispatch] = useReducer(playerReducer, {
    ...DEFAULT_PLAYER,
    createdAt: new Date().toISOString(),
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Load and migrate from localStorage on mount
  useEffect(() => {
    try {
      const initial = loadAndMigrateStorage();
      dispatch({ type: 'LOAD_PLAYER', payload: initial });
    } catch (e) {
      console.warn('Failed to load player progress:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage ONLY AFTER initial hydration completes (prevents overwriting saved data)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(player));
    } catch (e) {
      console.warn('Failed to save player progress:', e);
    }
  }, [player, isHydrated]);

  const completeLevel = useCallback((kingdomId, level, score, artifacts = {}) => {
    dispatch({ type: 'COMPLETE_LEVEL', payload: { kingdomId, level, score, artifacts } });
  }, []);

  const passSanityCheck = useCallback((kingdomId, check, score = 25) => {
    dispatch({ type: 'PASS_SANITY_CHECK', payload: { kingdomId, check, score } });
  }, []);

  const resetProgress = useCallback(() => {
    dispatch({ type: 'RESET_PROGRESS' });
  }, []);

  const setPlayerName = useCallback((name) => {
    dispatch({ type: 'SET_NAME', payload: name });
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        player,
        completeLevel,
        passSanityCheck,
        resetProgress,
        setPlayerName,
        isHydrated,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
