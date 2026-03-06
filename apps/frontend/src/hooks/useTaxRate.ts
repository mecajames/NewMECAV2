import { useState, useEffect } from 'react';
import axios from '@/lib/axios';

let cachedRate: { taxRate: number; taxName: string } | null = null;

export function useTaxRate() {
  const [taxRate, setTaxRate] = useState(cachedRate?.taxRate ?? 0);
  const [taxName, setTaxName] = useState(cachedRate?.taxName ?? '');

  useEffect(() => {
    if (cachedRate) return;
    axios.get('/api/tax/rate').then(({ data }) => {
      cachedRate = data;
      setTaxRate(data.taxRate);
      setTaxName(data.taxName);
    }).catch(() => {
      // Default to 0 if endpoint fails
    });
  }, []);

  const calculateTax = (subtotal: number) => {
    if (taxRate === 0 || subtotal <= 0) return 0;
    return Math.round(subtotal * 100 * taxRate) / 100;
  };

  return { taxRate, taxName, calculateTax };
}
