import { useState, useCallback, useEffect } from 'react';

interface AppSettings {
  sidebarAutoCollapseOnSchedule: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  sidebarAutoCollapseOnSchedule: true,
};

const SETTINGS_KEY = 'app-settings';
const SETTINGS_EVENT = 'app-settings-changed';

function readStoredSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => readStoredSettings());

  // Keep multiple hook instances in sync (Settings page, DashboardLayout, etc.)
  useEffect(() => {
    const sync = () => setSettingsState(readStoredSettings());

    window.addEventListener('storage', sync);
    window.addEventListener(SETTINGS_EVENT, sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(SETTINGS_EVENT, sync);
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        // Notify other hook instances in the same tab
        window.dispatchEvent(new Event(SETTINGS_EVENT));
      } catch (e) {
        console.error('Error saving settings to localStorage:', e);
      }
      return updated;
    });
  }, []);

  return { settings, updateSettings };
}

