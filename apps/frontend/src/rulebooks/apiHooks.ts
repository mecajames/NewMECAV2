/**
 * Rulebooks API Hooks
 * ALL rulebook-related React hooks in one file
 */

import { useState, useEffect } from 'react';
import { rulebooksApi, RulebookData } from '../api-client/rulebooks.api-client';

export function useRulebooks(page: number = 1, limit: number = 10) {
  const [rulebooks, setRulebooks] = useState<RulebookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    rulebooksApi.getRulebooks(page, limit)
      .then(setRulebooks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [page, limit]);

  return { rulebooks, loading, error };
}

export function useRulebook(id: string) {
  const [rulebook, setRulebook] = useState<RulebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    rulebooksApi.getRulebook(id)
      .then(setRulebook)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { rulebook, loading, error };
}

export function useActiveRulebooks() {
  const [rulebooks, setRulebooks] = useState<RulebookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    rulebooksApi.getActiveRulebooks()
      .then(setRulebooks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { rulebooks, loading, error };
}

export function useRulebooksByYear(year: number) {
  const [rulebooks, setRulebooks] = useState<RulebookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!year) return;

    rulebooksApi.getRulebooksByYear(year)
      .then(setRulebooks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [year]);

  return { rulebooks, loading, error };
}

export function useRulebooksByCategory(category: string) {
  const [rulebooks, setRulebooks] = useState<RulebookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!category) return;

    rulebooksApi.getRulebooksByCategory(category)
      .then(setRulebooks)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [category]);

  return { rulebooks, loading, error };
}

export function useCreateRulebook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createRulebook = async (data: Partial<RulebookData>) => {
    setLoading(true);
    setError(null);
    try {
      const newRulebook = await rulebooksApi.createRulebook(data);
      return newRulebook;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createRulebook, loading, error };
}

export function useUpdateRulebook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateRulebook = async (id: string, data: Partial<RulebookData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedRulebook = await rulebooksApi.updateRulebook(id, data);
      return updatedRulebook;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateRulebook, loading, error };
}

export function useSetDisplayOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setDisplayOrder = async (id: string, displayOrder: number) => {
    setLoading(true);
    setError(null);
    try {
      const updatedRulebook = await rulebooksApi.setDisplayOrder(id, displayOrder);
      return updatedRulebook;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { setDisplayOrder, loading, error };
}

export function useDeleteRulebook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteRulebook = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await rulebooksApi.deleteRulebook(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteRulebook, loading, error };
}
