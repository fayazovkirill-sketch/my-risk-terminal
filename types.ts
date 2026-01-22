
export enum Direction {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export interface Instrument {
  id: string;
  name: string;
  ticker: string;
  priceStep: number;
  stepPrice: number;
  icon: string;
}

export interface EntryLevel {
  label: string;
  price: number;
  share: number; // 0.0 to 1.0
}

export interface LevelResult {
  label: string;
  price: number;
  contracts: number;
  riskPerContract: number;
  allocatedRisk: number;
}

export interface CalculationResult {
  totalRiskRub: number;
  levels: LevelResult[];
  totalContracts: number;
  averagePrice: number;
  // Analysis fields for AI advice
  maxContracts?: number;
  distanceToStop?: number;
  distanceInTicks?: number;
  riskPerContract?: number;
}
