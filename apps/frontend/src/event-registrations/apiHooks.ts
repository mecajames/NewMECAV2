/**
 * Event Registrations API Hooks
 * ALL event registration-related React hooks in one file
 */

import { useState, useEffect } from 'react';
import { eventRegistrationsApi, EventRegistrationData } from '../api-client/event-registrations.api-client';

export function useRegistrations(page: number = 1, limit: number = 10) {
  const [registrations, setRegistrations] = useState<EventRegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    eventRegistrationsApi.getRegistrations(page, limit)
      .then(setRegistrations)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [page, limit]);

  return { registrations, loading, error };
}

export function useRegistration(id: string) {
  const [registration, setRegistration] = useState<EventRegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    eventRegistrationsApi.getRegistration(id)
      .then(setRegistration)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { registration, loading, error };
}

export function useRegistrationsByEvent(eventId: string) {
  const [registrations, setRegistrations] = useState<EventRegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) return;

    eventRegistrationsApi.getRegistrationsByEvent(eventId)
      .then(setRegistrations)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [eventId]);

  return { registrations, loading, error };
}

export function useRegistrationCount(eventId: string) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) return;

    eventRegistrationsApi.countRegistrationsByEvent(eventId)
      .then(data => setCount(data.count))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [eventId]);

  return { count, loading, error };
}

export function useRegistrationsByUser(userId: string) {
  const [registrations, setRegistrations] = useState<EventRegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;

    eventRegistrationsApi.getRegistrationsByUser(userId)
      .then(setRegistrations)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { registrations, loading, error };
}

export function useCreateRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createRegistration = async (data: Partial<EventRegistrationData>) => {
    setLoading(true);
    setError(null);
    try {
      const newRegistration = await eventRegistrationsApi.createRegistration(data);
      return newRegistration;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createRegistration, loading, error };
}

export function useUpdateRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateRegistration = async (id: string, data: Partial<EventRegistrationData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedRegistration = await eventRegistrationsApi.updateRegistration(id, data);
      return updatedRegistration;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateRegistration, loading, error };
}

export function useDeleteRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteRegistration = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await eventRegistrationsApi.deleteRegistration(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteRegistration, loading, error };
}
