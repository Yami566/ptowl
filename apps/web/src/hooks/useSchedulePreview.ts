import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client.js';
import type { Schedule, Appointment } from '@ptowl/shared';

export function useSchedulePreview() {
  const [previewScheduleId, setPreviewScheduleId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['schedule-preview', previewScheduleId],
    queryFn: async () => {
      const r = await apiRequest<{ schedule: Schedule; appointments: Appointment[] }>(
        `/schedules/${previewScheduleId}`,
      );
      if (r.ok && r.data) return r.data;
      throw new Error(r.error?.message || 'Failed to load schedule');
    },
    enabled: !!previewScheduleId,
  });

  const openPreview = useCallback((id: string) => setPreviewScheduleId(id), []);
  const closePreview = useCallback(() => setPreviewScheduleId(null), []);

  const updateAppointment = useCallback((apptId: string, updates: Partial<Appointment>) => {
    queryClient.setQueryData(
      ['schedule-preview', previewScheduleId],
      (old: { schedule: Schedule; appointments: Appointment[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          appointments: old.appointments.map((a) => (a.id === apptId ? { ...a, ...updates } : a)),
        };
      },
    );
  }, [queryClient, previewScheduleId]);

  const appointments = data?.appointments ?? [];

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]!;
    const completed = appointments.filter((a) => a.appointment_date < today).length;
    const todayCount = appointments.filter((a) => a.appointment_date === today).length;
    const upcoming = appointments.filter((a) => a.appointment_date > today).length;
    const nextAppt = appointments.find((a) => a.appointment_date >= today);
    return { completed, todayCount, upcoming, nextAppt, total: appointments.length };
  }, [appointments]);

  return {
    previewScheduleId,
    schedule: data?.schedule ?? null,
    appointments,
    loading: isLoading,
    error: error instanceof Error ? error.message : '',
    stats,
    openPreview,
    closePreview,
    updateAppointment,
  };
}
