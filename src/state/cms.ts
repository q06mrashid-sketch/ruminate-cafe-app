import { useEffect, useState } from 'react';
import * as cms from '../services/cmsClient';

export function useCMS() {
  const [data, setData] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string>('');

  async function refresh() {
    setLoading(true);
    setErr('');
    try {
      const map = await cms.getAll();
      const keys = Object.keys(map);
      console.log('[CMS] first keys', keys.slice(0,5));
      console.log('[CMS] sample', map['special 1'], map['rumi quote']);
      setData(map);
      return map;
    } catch (e:any) {
      setErr(e?.message || 'Failed to load CMS');
      throw e;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return { data, loading, error, refresh };
}
