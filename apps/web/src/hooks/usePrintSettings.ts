import { useState, useCallback } from 'react';

export interface PrintSettings {
  defaultView: 'table' | 'calendar';
  showClinicHeader: boolean;
  showNotesSection: boolean;
  showReminderColumn: boolean;
}

const STORAGE_KEY = 'ptowl-print-settings';

const DEFAULT_SETTINGS: PrintSettings = {
  defaultView: 'table',
  showClinicHeader: true,
  showNotesSection: true,
  showReminderColumn: true,
};

function loadSettings(): PrintSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Explicitly pick only known keys with type validation to prevent
      // prototype pollution or unexpected key injection from localStorage
      return {
        defaultView: parsed.defaultView === 'calendar' ? 'calendar' : DEFAULT_SETTINGS.defaultView,
        showClinicHeader: typeof parsed.showClinicHeader === 'boolean' ? parsed.showClinicHeader : DEFAULT_SETTINGS.showClinicHeader,
        showNotesSection: typeof parsed.showNotesSection === 'boolean' ? parsed.showNotesSection : DEFAULT_SETTINGS.showNotesSection,
        showReminderColumn: typeof parsed.showReminderColumn === 'boolean' ? parsed.showReminderColumn : DEFAULT_SETTINGS.showReminderColumn,
      };
    }
  } catch { /* ignore parse errors */ }
  return { ...DEFAULT_SETTINGS };
}

export function usePrintSettings() {
  const [settings, setSettings] = useState<PrintSettings>(loadSettings);

  const updateSettings = useCallback((updates: Partial<PrintSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return { settings, updateSettings, resetSettings };
}
