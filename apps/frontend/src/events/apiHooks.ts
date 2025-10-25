/**
 * Events API Hooks
 * ALL event-related React hooks in one file
 */

import { useState, useEffect } from 'react';
import { eventsApi, EventData } from '../api-client/events.api-client';

export function useEvents(page: number = 1, limit: number = 10) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    eventsApi.getEvents(page, limit)
      .then(setEvents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [page, limit]);

  return { events, loading, error };
}

export function useEvent(id: string) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    eventsApi.getEvent(id)
      .then(setEvent)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { event, loading, error };
}

export function useUpcomingEvents() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    eventsApi.getUpcomingEvents()
      .then(setEvents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}

export function useEventsByStatus(status: string) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!status) return;

    eventsApi.getEventsByStatus(status)
      .then(setEvents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [status]);

  return { events, loading, error };
}

export function useEventsByDirector(directorId: string) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!directorId) return;

    eventsApi.getEventsByDirector(directorId)
      .then(setEvents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [directorId]);

  return { events, loading, error };
}

export function useCreateEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createEvent = async (data: Partial<EventData>) => {
    setLoading(true);
    setError(null);
    try {
      const newEvent = await eventsApi.createEvent(data);
      return newEvent;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createEvent, loading, error };
}

export function useUpdateEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateEvent = async (id: string, data: Partial<EventData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedEvent = await eventsApi.updateEvent(id, data);
      return updatedEvent;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateEvent, loading, error };
}

export function useDeleteEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteEvent = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await eventsApi.deleteEvent(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteEvent, loading, error };
}
