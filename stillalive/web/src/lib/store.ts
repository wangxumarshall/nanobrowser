import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';

export interface DiaryEntry {
  id: string;
  content: string;
  timestamp: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  timeDelta: number;
  reason: string;
}

export interface BucketItem {
  id: string;
  content: string;
  isCompleted: boolean;
  rewardSeconds: number;
}

interface UserState {
  name: string;
  birthDate: string | null;
  lifeExpectancy: number;
  isOnboarded: boolean;
  remainingSeconds: number; // Stored source of truth
  lastSyncTime: number; // To calculate drift
  diaryEntries: DiaryEntry[];
  bucketList: BucketItem[];
  language: 'en' | 'zh';

  // Actions
  setOnboarding: (name: string, date: string, expectancy: number) => void;
  syncTime: () => void;
  addDiaryEntry: (entry: DiaryEntry) => void;
  addBucketItem: (content: string) => void;
  toggleBucketItem: (id: string) => void;
  setLanguage: (lang: 'en' | 'zh') => void;
  reset: () => void;
}

const DEFAULT_EXPECTANCY = 78;

export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      name: '',
      birthDate: null,
      lifeExpectancy: DEFAULT_EXPECTANCY,
      isOnboarded: false,
      remainingSeconds: 0,
      lastSyncTime: Date.now(),
      diaryEntries: [],
      bucketList: [],
      language: 'zh',

      setOnboarding: (name, date, expectancy) => {
        const totalLifeSeconds = expectancy * 365.25 * 24 * 60 * 60;
        const born = dayjs(date);
        const now = dayjs();
        const usedSeconds = now.diff(born, 'second');
        const remaining = Math.max(0, totalLifeSeconds - usedSeconds);

        set({
          name,
          birthDate: date,
          lifeExpectancy: expectancy,
          remainingSeconds: remaining,
          isOnboarded: true,
          lastSyncTime: Date.now(),
        });
      },

      syncTime: () => {
        const now = Date.now();
        const elapsed = (now - get().lastSyncTime) / 1000;
        if (elapsed > 0 && get().remainingSeconds > 0) {
          set((state) => ({
            remainingSeconds: Math.max(0, state.remainingSeconds - elapsed),
            lastSyncTime: now,
          }));
        } else {
            set({ lastSyncTime: now });
        }
      },

      addDiaryEntry: (entry) => set((state) => ({
        diaryEntries: [entry, ...state.diaryEntries],
        remainingSeconds: state.remainingSeconds + entry.timeDelta,
      })),

      addBucketItem: (content) => set((state) => ({
        bucketList: [...state.bucketList, {
          id: crypto.randomUUID(),
          content,
          isCompleted: false,
          rewardSeconds: 3 * 24 * 60 * 60 // 3 days reward default
        }]
      })),

      toggleBucketItem: (id) => set((state) => {
        const itemIndex = state.bucketList.findIndex((i) => i.id === id);
        if (itemIndex === -1) return state;

        const item = state.bucketList[itemIndex];
        const isNowCompleted = !item.isCompleted;
        // Reward only when checking, punish (remove reward) when unchecking?
        // Or just one-time? Let's keep it simple: State reflects status.
        // If checking, add time. If unchecking, remove time.
        const timeMod = isNowCompleted ? item.rewardSeconds : -item.rewardSeconds;

        const newList = [...state.bucketList];
        newList[itemIndex] = { ...item, isCompleted: isNowCompleted };

        return {
          bucketList: newList,
          remainingSeconds: state.remainingSeconds + timeMod
        };
      }),

      setLanguage: (lang) => set({ language: lang }),

      reset: () => set({
        isOnboarded: false,
        birthDate: null,
        diaryEntries: [],
        bucketList: [],
        remainingSeconds: 0
      })
    }),
    {
      name: 'still-alive-storage',
    }
  )
);
