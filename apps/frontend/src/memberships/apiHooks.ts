/**
 * Memberships API Hooks
 * ALL membership-related React hooks in one file
 */

import { useState, useEffect } from 'react';
import { membershipsApi, MembershipData } from '../api-client/memberships.api-client';

export function useMemberships(page: number = 1, limit: number = 10) {
  const [memberships, setMemberships] = useState<MembershipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    membershipsApi.getMemberships(page, limit)
      .then(setMemberships)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [page, limit]);

  return { memberships, loading, error };
}

export function useMembership(id: string) {
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    membershipsApi.getMembership(id)
      .then(setMembership)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { membership, loading, error };
}

export function useMembershipsByUser(userId: string) {
  const [memberships, setMemberships] = useState<MembershipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;

    membershipsApi.getMembershipsByUser(userId)
      .then(setMemberships)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { memberships, loading, error };
}

export function useActiveMembership(userId: string) {
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;

    membershipsApi.getActiveMembership(userId)
      .then(setMembership)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { membership, loading, error };
}

export function useRenewMembership() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const renewMembership = async (userId: string, membershipType: string) => {
    setLoading(true);
    setError(null);
    try {
      const newMembership = await membershipsApi.renewMembership(userId, membershipType);
      return newMembership;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { renewMembership, loading, error };
}

export function useCreateMembership() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMembership = async (data: Partial<MembershipData>) => {
    setLoading(true);
    setError(null);
    try {
      const newMembership = await membershipsApi.createMembership(data);
      return newMembership;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createMembership, loading, error };
}

export function useUpdateMembership() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateMembership = async (id: string, data: Partial<MembershipData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedMembership = await membershipsApi.updateMembership(id, data);
      return updatedMembership;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateMembership, loading, error };
}

export function useDeleteMembership() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteMembership = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await membershipsApi.deleteMembership(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteMembership, loading, error };
}
