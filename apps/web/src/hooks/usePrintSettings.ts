import useLocalStorageState from 'use-local-storage-state';
import { useCallback } from 'react';

export interface PrintSettings {
  defaultView: 'table' | 'calendar';
  showClinicHeader: boolean;
  showNotesSection: boolean;
  showReminderColumn: boolean;
  showQRCode: boolean;
  language: 'en' | 'es';
}

const DEFAULT_SETTINGS: PrintSettings = {
  defaultView: 'table',
  showClinicHeader: true,
  showNotesSection: true,
  showReminderColumn: true,
  showQRCode: true,
  language: 'en',
};

export function usePrintSettings() {
  const [settings, setSettings, { removeItem }] = useLocalStorageState<PrintSettings>(
    'ptowl-print-settings',
    { defaultValue: DEFAULT_SETTINGS },
  );

  const updateSettings = useCallback(
    (updates: Partial<PrintSettings>) => setSettings((prev) => ({ ...prev, ...updates })),
    [setSettings],
  );

  return { settings, updateSettings, resetSettings: removeItem };
}
