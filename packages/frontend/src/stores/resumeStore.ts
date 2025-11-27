import { create } from 'zustand';

interface Resume {
  id: string;
  userId: string;
  title: string;
  version: number;
  isPrimary: boolean;
  parseStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

interface ResumeState {
  resumes: Resume[];
  currentResume: Resume | null;
  setResumes: (resumes: Resume[]) => void;
  setCurrentResume: (resume: Resume | null) => void;
  addResume: (resume: Resume) => void;
  updateResume: (id: string, data: Partial<Resume>) => void;
  removeResume: (id: string) => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  resumes: [],
  currentResume: null,
  setResumes: (resumes) => set({ resumes }),
  setCurrentResume: (resume) => set({ currentResume: resume }),
  addResume: (resume) =>
    set((state) => ({ resumes: [...state.resumes, resume] })),
  updateResume: (id, data) =>
    set((state) => ({
      resumes: state.resumes.map((r) => (r.id === id ? { ...r, ...data } : r)),
      currentResume:
        state.currentResume?.id === id
          ? { ...state.currentResume, ...data }
          : state.currentResume,
    })),
  removeResume: (id) =>
    set((state) => ({
      resumes: state.resumes.filter((r) => r.id !== id),
      currentResume:
        state.currentResume?.id === id ? null : state.currentResume,
    })),
}));
