/**
 * Profiles API Hooks
 *
 * ALL profile-related React hooks in one file.
 * Uses the centralized API client from api-client/profiles.api-client.ts
 */

import { useState, useEffect } from 'react';
import { profilesApi, ProfileData } from '../api-client/profiles.api-client';

/**
 * Hook to fetch all profiles with pagination
 */
export function useProfiles(page: number = 1, limit: number = 10) {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    profilesApi
      .getProfiles(page, limit)
      .then(setProfiles)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [page, limit]);

  return { profiles, loading, error };
}

/**
 * Hook to fetch a single profile by ID
 */
export function useProfile(id: string) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    profilesApi
      .getProfile(id)
      .then(setProfile)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { profile, loading, error };
}

/**
 * Hook to create a new profile
 */
export function useCreateProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createProfile = async (data: Partial<ProfileData>) => {
    setLoading(true);
    setError(null);
    try {
      const newProfile = await profilesApi.createProfile(data);
      return newProfile;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createProfile, loading, error };
}

/**
 * Hook to update an existing profile
 */
export function useUpdateProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateProfile = async (id: string, data: Partial<ProfileData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedProfile = await profilesApi.updateProfile(id, data);
      return updatedProfile;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
}

/**
 * Hook to delete a profile
 */
export function useDeleteProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteProfile = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await profilesApi.deleteProfile(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteProfile, loading, error };
}
