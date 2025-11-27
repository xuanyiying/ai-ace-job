import { create } from 'zustand';

interface Job {
  id: string;
  userId: string;
  title: string;
  company: string;
  location?: string;
  jobDescription: string;
  requirements: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobState {
  jobs: Job[];
  currentJob: Job | null;
  setJobs: (jobs: Job[]) => void;
  setCurrentJob: (job: Job | null) => void;
  addJob: (job: Job) => void;
  updateJob: (id: string, data: Partial<Job>) => void;
  removeJob: (id: string) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  currentJob: null,
  setJobs: (jobs) => set({ jobs }),
  setCurrentJob: (job) => set({ currentJob: job }),
  addJob: (job) => set((state) => ({ jobs: [...state.jobs, job] })),
  updateJob: (id, data) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)),
      currentJob:
        state.currentJob?.id === id
          ? { ...state.currentJob, ...data }
          : state.currentJob,
    })),
  removeJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
      currentJob: state.currentJob?.id === id ? null : state.currentJob,
    })),
}));
