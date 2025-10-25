/**
 * Competition Results API Hooks
 * ALL competition result-related React hooks in one file
 */

import { useState, useEffect } from 'react';
import { competitionResultsApi, CompetitionResultData } from '../api-client/competition-results.api-client';

export function useResultsByEvent(eventId: string) {
  const [results, setResults] = useState<CompetitionResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) return;

    competitionResultsApi.getResultsByEvent(eventId)
      .then(setResults)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [eventId]);

  return { results, loading, error };
}

export function useLeaderboard(eventId: string) {
  const [results, setResults] = useState<CompetitionResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) return;

    competitionResultsApi.getLeaderboard(eventId)
      .then(setResults)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [eventId]);

  return { results, loading, error };
}

export function useResultsByCategory(eventId: string, category: string) {
  const [results, setResults] = useState<CompetitionResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId || !category) return;

    competitionResultsApi.getResultsByCategory(eventId, category)
      .then(setResults)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [eventId, category]);

  return { results, loading, error };
}

export function useResultsByCompetitor(competitorId: string) {
  const [results, setResults] = useState<CompetitionResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!competitorId) return;

    competitionResultsApi.getResultsByCompetitor(competitorId)
      .then(setResults)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [competitorId]);

  return { results, loading, error };
}

export function useResult(id: string) {
  const [result, setResult] = useState<CompetitionResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    competitionResultsApi.getResult(id)
      .then(setResult)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { result, loading, error };
}

export function useCreateResult() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createResult = async (data: Partial<CompetitionResultData>) => {
    setLoading(true);
    setError(null);
    try {
      const newResult = await competitionResultsApi.createResult(data);
      return newResult;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createResult, loading, error };
}

export function useUpdateResult() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateResult = async (id: string, data: Partial<CompetitionResultData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedResult = await competitionResultsApi.updateResult(id, data);
      return updatedResult;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateResult, loading, error };
}

export function useDeleteResult() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteResult = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await competitionResultsApi.deleteResult(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteResult, loading, error };
}
