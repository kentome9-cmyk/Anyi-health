'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export interface CreatorIdentity {
  id: string;
  storeId: string;
  contentTrack: string;
  personaStyle: string;
  targetAudience: string;
  videoTone: string;
  videoDuration: string;
  createdAt: string;
  updatedAt: string;
}

export function useCreatorIdentity() {
  const { storeId } = useAuthStore();
  const [identity, setIdentity] = useState<CreatorIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadIdentity = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/store/creator-identity?storeId=${storeId}`);
      const data = await res.json();
      if (data.identity) {
        setIdentity(data.identity);
      }
    } catch (error) {
      console.error('Failed to load creator identity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdentity();
  }, [storeId]);

  return { identity, loading, loadIdentity };
}