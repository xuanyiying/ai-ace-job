import { create } from 'zustand';
import { Optimization, SuggestionStatus } from '../types';

interface OptimizationState {
  optimizations: Optimization[];
  currentOptimization: Optimization | null;
  setOptimizations: (optimizations: Optimization[]) => void;
  setCurrentOptimization: (optimization: Optimization | null) => void;
  addOptimization: (optimization: Optimization) => void;
  updateOptimization: (id: string, data: Partial<Optimization>) => void;
  updateSuggestionStatus: (
    optimizationId: string,
    suggestionId: string,
    status: SuggestionStatus
  ) => void;
}

export const useOptimizationStore = create<OptimizationState>((set) => ({
  optimizations: [],
  currentOptimization: null,
  setOptimizations: (optimizations) => set({ optimizations }),
  setCurrentOptimization: (optimization) =>
    set({ currentOptimization: optimization }),
  addOptimization: (optimization) =>
    set((state) => ({
      optimizations: [...state.optimizations, optimization],
    })),
  updateOptimization: (id, data) =>
    set((state) => ({
      optimizations: state.optimizations.map((o) =>
        o.id === id ? { ...o, ...data } : o
      ),
      currentOptimization:
        state.currentOptimization?.id === id
          ? { ...state.currentOptimization, ...data }
          : state.currentOptimization,
    })),
  updateSuggestionStatus: (optimizationId, suggestionId, status) =>
    set((state) => ({
      optimizations: state.optimizations.map((o) =>
        o.id === optimizationId
          ? {
              ...o,
              suggestions: o.suggestions.map((s) =>
                s.id === suggestionId ? { ...s, status } : s
              ),
            }
          : o
      ),
      currentOptimization:
        state.currentOptimization?.id === optimizationId
          ? {
              ...state.currentOptimization,
              suggestions: state.currentOptimization.suggestions.map((s) =>
                s.id === suggestionId ? { ...s, status } : s
              ),
            }
          : state.currentOptimization,
    })),
}));
