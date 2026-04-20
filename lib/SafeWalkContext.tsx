import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';

export type WalkState = 'IDLE' | 'TRACKING' | 'WARNING' | 'ALERT';

interface SafeWalkContextType {
  location: { latitude: number; longitude: number } | null;
  walkState: WalkState;
  isInactive: boolean;
  setLocation: (loc: { latitude: number; longitude: number } | null) => void;
  setWalkState: (state: WalkState) => void;
}

const SafeWalkContext = createContext<SafeWalkContextType | undefined>(undefined);

export function SafeWalkProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [walkState, setWalkState] = useState<WalkState>('IDLE');

  const isInactive = walkState === 'WARNING' || walkState === 'ALERT';

  return (
    <SafeWalkContext.Provider value={{ location, walkState, isInactive, setLocation, setWalkState }}>
      {children}
    </SafeWalkContext.Provider>
  );
}

export function useSafeWalk() {
  const context = useContext(SafeWalkContext);
  if (context === undefined) {
    throw new Error('useSafeWalk must be used within a SafeWalkProvider');
  }
  return context;
}
