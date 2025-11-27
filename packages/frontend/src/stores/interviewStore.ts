import { create } from 'zustand';
import type { InterviewQuestion } from '../types';

interface InterviewState {
  questions: InterviewQuestion[];
  loading: boolean;
  error: string | null;
  setQuestions: (questions: InterviewQuestion[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearQuestions: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  questions: [],
  loading: false,
  error: null,
  setQuestions: (questions) => set({ questions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearQuestions: () => set({ questions: [], error: null }),
}));
