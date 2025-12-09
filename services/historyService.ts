import { HistoryRecord } from '../types';

const STORAGE_KEY = 'ky_english_history_v1';

export const getHistory = (): HistoryRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
};

export const saveHistory = (record: HistoryRecord): HistoryRecord[] => {
  try {
    const history = getHistory();
    // Keep the last 20 records to avoid quota issues
    const updated = [record, ...history].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to save history:", error);
    return getHistory(); // Return current state if save fails
  }
};

export const deleteHistoryItem = (id: string): HistoryRecord[] => {
  try {
    const history = getHistory();
    const updated = history.filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to delete history item:", error);
    return getHistory();
  }
};