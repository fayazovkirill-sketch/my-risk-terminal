import React, { useState, useMemo, useEffect } from 'react';
import { Direction, Instrument, CalculationResult, EntryLevel, LevelResult } from './types';
import { INSTRUMENTS } from './constants';

// Тип для хранения памяти конкретного инструмента
interface InstrumentMemory {
  stopPrice: number | null;
  levels: EntryLevel[];
}

const App: React.FC = () => {
  const [deposit, setDeposit] = useState<number | null>(100000);
  const [riskPercent, setRiskPercent] = useState<number | null>(3);
  const [direction, setDirection] = useState<Direction>(Direction.LONG);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(INSTRUMENTS[0]);
  
  // Объект-память, где ключ — ID инструмента
  const [memory, setMemory] = useState<Record<string, InstrumentMemory>>({});

  // Инициализируем память для нового инструмента, если её ещё нет
  useEffect(() => {
    if (!memory[selectedInstrument.id]) {
      setMemory(prev => ({
        ...prev,
        [selectedInstrument.id]: {
          stopPrice: null,
          levels: [
            { label: 'Уровень 1', price: 0, share: 0.2 },
            { label: 'Уровень 2', price: 0, share: 0.3 },
            { label: 'Уровень 3', price: 0, share: 0.5 },
          ]
        }
      }));
    }
  }, [selectedInstrument]);

  // Текущие данные из памяти
  const currentData = memory[selectedInstrument.id] || {
    stopPrice: null,
    levels: [{ label: 'Уровень 1', price: 0, share: 0.2 }, { label: 'Уровень 2', price: 0, share: 0.3 }, { label: 'Уровень 3', price: 0, share: 0.5 }]
  };

  const handleInput = (val: string, setter: (v: number | null) => void) => {
    const clean = val.replace(',', '.');
    setter(clean === '' ? null : Number(clean));
  };

  // Функции для обновления памяти инструмента
  const setStoredStop = (val: string) => {
    const clean = val.replace(',', '.');
    const price = clean === '' ? null : Number(clean);
    setMemory(prev => ({
      ...prev,
      [selectedInstrument.id]: { ...prev[selectedInstrument.id], stopPrice: price }
    }));
  };

  const setStoredLevelPrice = (idx: number, val: string) => {
    const clean = val.replace(',', '.');
    const price = clean === '' ? 0 : Number(clean);
    const newLevels = [...currentData.levels];
    newLevels[idx].price = price;
    setMemory(prev => ({
      ...prev,
      [selectedInstrument.id]: { ...prev[selectedInstrument.id], levels: newLevels }
    }));
  };

  const setStoredLevelShare = (idx: number, share: number) => {
    const newLevels = [...currentData.levels];
    newLevels[idx].share = share;
    setMemory(prev => ({
      ...prev,
      [selectedInstrument.id]: { ...prev[selectedInstrument.id], levels: newLevels }
    }));
  };

  const results = useMemo(() => {
    const dep = deposit || 0;
    const risk = riskPercent || 0;
    const stop = currentData.stopPrice || 0;
    
    const targetRiskRub = (dep * risk) / 100;
    const activeLevels = currentData.levels.filter(l => l.price > 0 && l.share > 0);
    const totalShare = activeLevels.reduce((acc, l) => acc + l.share, 0);
    
    const margin = direction === Direction.LONG 
      ? (selectedInstrument.initialMarginLong || 0) 
      : (selectedInstrument.initialMarginShort || 0);
    
    const maxLots = margin > 0 ? Math.floor(dep / margin) : 0;

    let theoreticalTotal = 0;
    const levelResults = activeLevels.map(level => {
      const isValid = direction === Direction.LONG ? level.price > stop : level.price < stop;
      if (!isValid || stop === 0) return { ...level, contracts: 0, isValid: false, riskPerContract: 0, allocatedRisk: 0 };

      const factor = totalShare > 0 ? (level.share / totalShare) : 0;
      const ticks = Math.abs(level.price - stop) / (selectedInstrument.priceStep || 0.001);
      const riskPerLot = ticks * (selectedInstrument.stepPrice || 1);
      const contracts = riskPerLot > 0 ? Math.floor((targetRiskRub * factor) / riskPerLot) : 0;
      theoreticalTotal += contracts;

      return { ...level, contracts, riskPerContract: riskPerLot, allocatedRisk: contracts * riskPerLot, isValid: true };
    });

    const isLimited = theoreticalTotal > maxLots;
    const finalTotal = isLimited ? maxLots : theoreticalTotal;

    if (isLimited && theoreticalTotal > 0) {
      const scale = maxLots / theoreticalTotal;
      levelResults.forEach(l => {
        l.contracts = Math.floor(l.contracts * scale);
        l.allocatedRisk = l.contracts * l.riskPerContract;
      });
    }

    return {
      totalContracts: finalTotal,
      totalRisk: levelResults.reduce((acc, l) => acc + l.allocatedRisk, 0),
      avgPrice: finalTotal > 0 ? levelResults.reduce((acc, l) => acc + (l.price * l.contracts), 0) / finalTotal : 0,
      maxLots,
      isLimited,
      levelResults
    };
  }, [deposit, riskPercent, currentData, direction, selectedInstrument]);

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto bg-[#0e161e] text-slate-100 antialiased">
      <header className="p-4 border-b border-slate-700/40 bg-[#242f3d] font-black text-xs uppercase tracking-widest">
        ММВБ 2.0 • {selectedInstrument.ticker}
      </header>

      <main className="p-3 space-y-3">
        {/* Инструменты */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {INSTRUMENTS.map(inst => (
            <button key={inst.id} onClick={() => setSelectedInstrument(inst)} className={`px-4 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${selectedInstrument.id === inst.id ? 'border-[#3390ec] bg-[#3390ec]/10 text-[#3390ec]' : 'border-slate-800 text-slate-500'}`}>
              {inst.icon} {inst.ticker}
            </button>
          ))}
        </div>

        {/* Настройки депо */}
        <div className="bg-[#17212b] p-3 rounded-2xl border border-slate-700/30 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[7px] font-bold text-slate-500 uppercase">Депозит</label>
            <input type="text" inputMode="decimal" value={deposit ?? ''} onChange={e => handleInput(e.target.value, setDeposit)} className="w-full bg-[#0e161e] rounded-lg p-2 mono font-bold border border-slate-700/40" />
          </div>
          <div className="space-y-1">
            <label className="text-[7px] font-bold text-slate-500 uppercase">Риск %</label>
            <input type="text" inputMode="decimal" value={riskPercent ?? ''} onChange={e => handleInput(e.target.value, setRiskPercent)} className="w-full bg-[#0e161e] rounded-lg p-2 mono font-bold border border-slate-700/40 text-[#3390ec]" />
          </div>
          <div className="col-span-2 flex p-1 bg-[#0e161e] rounded-xl border border-slate-700/40">
            <button onClick={() => setDirection(Direction.LONG)} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${direction === Direction.LONG ? 'bg-green-600 text-white' : 'text-slate-600'}`}>LONG</button>
            <button onClick={() => setDirection(Direction.SHORT)} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${direction === Direction.SHORT ? 'bg-red-600 text-white' : 'text-slate-600'}`}>SHORT</button>
          </div>
        </div>

        {/* Стоп-лосс */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-center">
          <label className="text-[8px] font-black text-red-500 uppercase block mb-1">STOP LOSS</label>
          <input type="text" inputMode="decimal" value={currentData.stopPrice ?? ''} placeholder="0.000" onChange={e => setStoredStop(e.target.value)} className="bg-transparent text-3xl font-black mono text-red-500 text-center w-full focus:outline-none placeholder:opacity-10" />
        </div>

        {/* Уровни */}
        <div className="space-y-2">
          {currentData.levels.map((level, idx) => {
            const res = results.levelResults[idx];
            const isError = res && !res.isValid && level.price > 0;
            return (
              <div key={idx} className={`p-3 rounded-2xl border ${isError ? 'border-red-500 bg-red-500/5' : 'border-slate-800 bg-[#17212b]'}`}>
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-black text-[#3390ec] uppercase">{level.label}</span>
                  <span className="text-[10px] font-bold">{res?.contracts || 0} лот.</span>
                </div>
                <input type="text" inputMode="decimal" value={level.price === 0 ? '' : level.price} placeholder="Цена входа" onChange={e => setStoredLevelPrice(idx, e.target.value)} className={`w-full bg-[#0e161e] rounded-lg p-2 text-sm mono font-bold border ${isError ? 'border-red-500 text-red-500' : 'border-slate-700 text-green-400'}`} />
                <div className="flex gap-1 mt-2">
                  {[0, 0.2, 0.3, 0.5, 1].map(v => (
                    <button key={v} onClick={() => setStoredLevelShare(idx, v)} className={`flex-1 py-1.5 rounded-lg text-[8px] font-bold border ${level.share === v ? 'bg-[#3390ec] border-[#3390ec] text-white' : 'border-slate-800 text-slate-500'}`}>{v === 0 ? 'OFF' : `${v*100}%`}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Итог */}
        <div className={`p-5 rounded-3xl text-white transition-all ${results.isLimited ? 'bg-orange-600' : 'bg-[#3390ec]'}`}>
          <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-3">
            <div>
              <p className="text-[8px] font-black opacity-60 uppercase">Всего контрактов</p>
              <p className="text-5xl font-black mono tracking-tighter">{results.totalContracts}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black opacity-60 uppercase">Средняя цена</p>
              <p className="text-xl font-black mono">{results.avgPrice.toFixed(4)}</p>
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-80">
            <span>Риск: ₽{Math.round(results.totalRisk)}</span>
            <span>Макс ГО: {results.maxLots}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
