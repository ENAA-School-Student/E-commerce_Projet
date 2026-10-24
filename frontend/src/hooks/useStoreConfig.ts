import { useEffect, useState } from 'react';
import { store as storeApi } from '@/lib/api';
import { StoreConfig } from '@/types';

export const DEFAULT_CONFIG: StoreConfig = {
  freeShippingThreshold: 150,
  shippingCost: 9.9,
  taxRate: 0.2,
  lowStockThreshold: 5,
  currency: 'USD',
};

let cached: StoreConfig | null = null;

export function useStoreConfig(): StoreConfig {
  const [config, setConfig] = useState<StoreConfig>(cached ?? DEFAULT_CONFIG);

  useEffect(() => {
    if (cached) return;
    storeApi
      .config()
      .then((res) => {
        cached = res.data;
        setConfig(res.data);
      })
      .catch(() => undefined);
  }, []);

  return config;
}
