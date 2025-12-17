import { useState, useEffect } from 'react';
import { mediaFilesApi, MediaFile, MediaType } from '@/media-files';

export function useMediaFiles(fileType?: MediaType) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const data = await mediaFilesApi.getAllMediaFiles(fileType);
      setMediaFiles(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaFiles();
  }, [fileType]);

  return { mediaFiles, loading, error, refetch: fetchMediaFiles };
}

export function useMediaSearch(searchTerm: string, fileType?: MediaType) {
  const [results, setResults] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      return;
    }

    const search = async () => {
      try {
        setLoading(true);
        const data = await mediaFilesApi.searchMediaFiles(searchTerm, fileType);
        setResults(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [searchTerm, fileType]);

  return { results, loading, error };
}

export function useCreateMediaFile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMediaFile = async (data: Partial<MediaFile>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mediaFilesApi.createMediaFile(data);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createMediaFile, loading, error };
}

export function useUpdateMediaFile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMediaFile = async (id: string, data: Partial<MediaFile>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mediaFilesApi.updateMediaFile(id, data);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateMediaFile, loading, error };
}

export function useDeleteMediaFile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMediaFile = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await mediaFilesApi.deleteMediaFile(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteMediaFile, loading, error };
}
