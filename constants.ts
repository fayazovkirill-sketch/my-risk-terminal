
import { Instrument } from './types';

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'ng',
    name: 'Natural Gas',
    ticker: 'NG',
    priceStep: 0.001,
    stepPrice: 7.88527,
    icon: '🔥'
  },
  {
    id: 'br',
    name: 'Brent Oil',
    ticker: 'Br',
    priceStep: 0.01,
    stepPrice: 7.82267,
    icon: '🛢️'
  },
  {
    id: 'silver',
    name: 'Silver',
    ticker: 'SILV',
    priceStep: 0.01,
    stepPrice: 0.78226,
    icon: '⚪'
  }
];
