import { useState, useCallback, useMemo } from 'react';
import { apiRequest } from '../api/client.js';
import type { Schedule, Appointment } from '@ptowl/shared';

interface PreviewState {
  schedule: Schedule | null;
  appointments: Appointment[];
  loading: boolean;
  error: string;
}

export function useSchedulePreview() {
  const [previewScheduleId, setPreviewScheduleId] = useState<string | null>(null);
  const [state, setState] = useState<PreviewState>({
    schedule: null,
    appointments: [],
    loading: false,
    error: '',
  });

  const openPreview = useCallback(async (scheduleId: string) => {
    setPreviewScheduleId(scheduleId);
    setState({ schedule: null, appointments: [], loading: true, error: '' });

    const result = await apiRequest<{ schedule: Schedule; appointments: Appointment[] }>(
      `/schedules/${scheduleId}`,
    );

    if (result.ok && result.data) {
      setState({
        schedule: result.data.schedule,
        appointments: result.data.appointments,
        loading: false,
        error: '',
      });
    } else {
      setState({
        schedule: null,
        appointments: [],
        loading: false,
        error: result.error?.message || 'Failed to load schedule',
      });
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewScheduleId(null);
    setState({ schedule: null, appointments: [], loading: false, error: '' });
  }, []);

  const updateAppointment = useCallback((apptId: string, updates: Partial<Appointment>) => {
    setState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) => (a.id === apptId ? { ...a, ...updates } : a)),
    }));
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const appts = state.appointments;
    const today = new Date().toISOString().split('T')[0]!;
    const completed = appts.filter((a) => a.appointment_date < today).length;
    const todayCount = appts.filter((a) => a.appointment_date === today).length;
    const upcoming = appts.filter((a) => a.appointment_date > today).length;
    const nextAppt = appts.find((a) => a.appointment_date >= today);
    return { completed, todayCount, upcoming, nextAppt, total: appts.length };
  }, [state.appointments]);

  return {
    previewScheduleId,
    schedule: state.schedule,
    appointments: state.appointments,
    loading: state.loading,
    error: state.error,
    stats,
    openPreview,
    closePreview,
    updateAppointment,
  };
}
