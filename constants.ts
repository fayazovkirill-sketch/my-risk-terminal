import { Instrument } from './types';

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'ng',
    name: 'Natural Gas',
    ticker: 'NG',
    priceStep: 0.001,
    stepPrice: 7.88527,
    initialMarginLong: 14637.96,
    initialMarginShort: 11768.17,
    icon: '🔥'
  },
  {
    id: 'br',
    name: 'Brent Oil',
    ticker: 'Br',
    priceStep: 0.01,
    stepPrice: 7.82267,
    initialMarginLong: 7017.68,
    initialMarginShort: 7017.68,
    icon: '🛢️'
  },
  {
    id: 'silver',
    name: 'Silver',
    ticker: 'SILV',
    priceStep: 0.01,
    stepPrice: 0.78226,
    initialMarginLong: 11766.57,
    initialMarginShort: 11766.57,
    icon: '⚪'
  },
  {
    id: 'gold',
    name: 'Gold',
    ticker: 'GOLD',
    priceStep: 0.1,
    stepPrice: 7.60382,
    initialMarginLong: 29763.38,
    initialMarginShort: 29763.38,
    icon: '🥇'
  },
  {
    id: 'cny',
    name: 'Yuan',
    ticker: 'CNY',
    priceStep: 0.001,
    stepPrice: 1.0,
    initialMarginLong: 1014.6,
    initialMarginShort: 1014.6,
    icon: '💴'
  }
];
