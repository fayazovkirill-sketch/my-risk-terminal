import React, { useState, useMemo, useEffect } from 'react';
import { Direction, Instrument, CalculationResult, EntryLevel, LevelResult } from './types';
import { INSTRUMENTS } from './constants';

declare global {
  interface Window {
    Telegram: any;
  }
}

// Icons
const TrendingUp = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const TrendingDown = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>;

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#17212b] rounded-xl border border-slate-700/30 overflow-hidden mb-2">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-3 flex justify-between items-center hover:bg-slate-800/10 transition-colors">
        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}><ChevronDown /></div>
      </button>
      <div className={`p-3 pt-0 ${isOpen ? 'block' : 'hidden'}`}>{children}</div>
    </div>
  );
};

const App: React.FC = () => {
  const [deposit, setDeposit] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(3);
  const [direction, setDirection] = useState<Direction>(Direction.LONG);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(INSTRUMENTS[0]);
  
  const [marginLong, setMarginLong] = useState<number>(selectedInstrument.initialMarginLong || 0);
  const [marginShort, setMarginShort] = useState<number>(selectedInstrument.initialMarginShort || 0);

  const [instrumentStops, setInstrumentStops] = useState<Record<string, number>>({});
  const stopPrice = instrumentStops[selectedInstrument.id] || 0;

  const [levels, setLevels] = useState<EntryLevel[]>([
    { label: 'Уровень 1', price: 0, share: 0.2 },
    { label: 'Уровень 2', price: 0, share: 0.3 },
    { label: 'Уровень 3', price: 0, share: 0.5 },
  ]);

  useEffect(() => {
    setMarginLong(selectedInstrument.initialMarginLong || 0);
    setMarginShort(selectedInstrument.initialMarginShort || 0);
  }, [selectedInstrument]);

  const handleNumericInput = (value: string, setter: (val: number) => void) => {
    const normalized = value.replace(',', '.');
    if (normalized === '' || !isNaN(Number(normalized))) setter(Number(normalized));
  };

  const results = useMemo(() => {
    const totalTargetRiskRub = (deposit * riskPercent) / 100;
    const activeLevels = levels.filter(l => l.price > 0 && l.share > 0);
    const totalActiveShare = activeLevels.reduce((acc, l) => acc + l.share, 0);
    const currentMargin = direction === Direction.LONG ? marginLong : marginShort;
    const maxByMargin = currentMargin > 0 ? Math.floor(deposit / currentMargin) : 0;

    let theoreticalTotalContracts = 0;

    const levelResults = activeLevels.map(level => {
      // ПРОВЕРКА ЛОГИКИ НАПРАВЛЕНИЯ
      const isPriceValid = direction === Direction.LONG ? level.price > stopPrice : level.price < stopPrice;

      if (!isPriceValid || stopPrice === 0) {
        return { label: level.label, price: level.price, contracts: 0, riskPerContract: 0, allocatedRisk: 0, isValid: false };
      }

      const effectiveShare = totalActiveShare > 0 ? (level.share / totalActiveShare) : 0;
      const allocatedRiskTarget = totalTargetRiskRub * effectiveShare;
      const distance = Math.abs(level.price - stopPrice);
      const ticks = distance / (selectedInstrument.priceStep || 0.001);
      const riskPerContract = ticks * (selectedInstrument.stepPrice || 1);
      
      const contracts = riskPerContract > 0 ? Math.floor(allocatedRiskTarget / riskPerContract) : 0;
      theoreticalTotalContracts += contracts;

      return {
        label: level.label, price: level.price, contracts, riskPerContract, allocatedRisk: contracts * riskPerContract, isValid: true
      };
    });

    const isLimitedByMargin = theoreticalTotalContracts > maxByMargin;
    const finalTotalContracts = isLimitedByMargin ? maxByMargin : theoreticalTotalContracts;

    if (isLimitedByMargin && theoreticalTotalContracts > 0) {
      const factor = maxByMargin / theoreticalTotalContracts;
      levelResults.forEach(l => {
        l.contracts = Math.floor(l.contracts * factor);
        l.allocatedRisk = l.contracts * l.riskPerContract;
      });
    }

    return { 
      totalRiskRub: levelResults.reduce((acc, l) => acc + l.allocatedRisk, 0), 
      levels: levelResults, 
      totalContracts: finalTotalContracts, 
      averagePrice: finalTotalContracts > 0 ? levelResults.reduce((acc, l) => acc + (l.price * l.contracts), 0) / finalTotalContracts : 0,
      theoreticalTotalContracts,
      maxByMargin,
      isLimitedByMargin
    };
  }, [deposit, riskPercent, levels, stopPrice, selectedInstrument, marginLong, marginShort, direction]);

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto bg-[#0e161e] text-slate-100 flex flex-col antialiased">
      <header className="p-3 border-b border-slate-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[#3390ec] p-1 rounded-lg"><BotIcon /></div>
          <h1 className="font-black text-[13px] uppercase tracking-tight">ММВБ 2.0 RISK</h1>
        </div>
      </header>

      <main className="p-2.5 space-y-2">
        <section className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {INSTRUMENTS.map((inst) => (
            <button key={inst.id} onClick={() => setSelectedInstrument(inst)} className={`flex-shrink-0 px-4 py-1.5 rounded-xl border-2 transition-all ${selectedInstrument.id === inst.id ? 'border-[#3390ec] bg-[#3390ec]/15 text-[#3390ec]' : 'border-slate-800 text-slate-600'}`}>
              <span className="font-black text-[10px] uppercase">{inst.icon} {inst.ticker}</span>
            </button>
          ))}
        </section>

        <Accordion title="Капитал и Направление" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
               <label className="text-[7px] font-bold text-slate-500 uppercase px-1">Депозит ₽</label>
               <input type="text" inputMode="decimal" placeholder="100000" onChange={(e) => handleNumericInput(e.target.value, setDeposit)} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono font-bold" />
            </div>
            <div className="space-y-1">
               <label className="text-[7px] font-bold text-slate-500 uppercase px-1">Риск %</label>
               <input type="text" inputMode="decimal" placeholder="3" onChange={(e) => handleNumericInput(e.target.value, setRiskPercent)} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono text-[#3390ec] font-bold" />
            </div>
          </div>
          <div className="flex mt-3 p-1 bg-[#0e161e] rounded-xl border border-slate-700/40">
            <button onClick={() => setDirection(Direction.LONG)} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-[10px] ${direction === Direction.LONG ? 'bg-green-600 text-white' : 'text-slate-600'}`}><TrendingUp /> LONG</button>
            <button onClick={() => setDirection(Direction.SHORT)} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 font-bold text-[10px] ${direction === Direction.SHORT ? 'bg-red-600 text-white' : 'text-slate-600'}`}><TrendingDown /> SHORT</button>
          </div>
        </Accordion>

        <section className="bg-red-500/10 rounded-xl border border-red-500/20 p-3 text-center">
          <label className="text-[8px] font-black text-red-500 uppercase block mb-1 tracking-widest">STOP LOSS PRICE</label>
          <input type="text" inputMode="decimal" placeholder="0.000" onChange={(e) => {
            const val = e.target.value.replace(',', '.');
            setInstrumentStops(prev => ({ ...prev, [selectedInstrument.id]: Number(val) }));
          }} className="bg-transparent text-xl font-black mono text-red-500 text-center w-full focus:outline-none placeholder:opacity-20" />
        </section>

        <Accordion title="Точки входа" defaultOpen={true}>
          <div className="space-y-3">
            {levels.map((level, idx) => {
              const res = results.levels[idx];
              const isError = res && !res.isValid && level.price > 0;
              return (
                <div key={idx} className={`p-3 rounded-xl border transition-all ${isError ? 'border-red-500 bg-red-500/10' : 'border-slate-800 bg-[#0e161e]'}`}>
                  <div className="flex justify-between items-center mb-2 text-[9px] font-black uppercase">
                    <span className="text-[#3390ec]">{level.label}</span>
                    <span className="text-white">{res?.contracts || 0} лот.</span>
                  </div>
                  <input type="text" inputMode="decimal" placeholder="Цена входа" onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    const newLevels = [...levels];
                    newLevels[idx].price = Number(val);
                    setLevels(newLevels);
                  }} className={`w-full bg-[#17212b] border rounded-lg p-2 text-sm mono font-bold ${isError ? 'border-red-500 text-red-500' : 'border-slate-700 text-green-400'}`} />
                  <div className="flex gap-1 mt-2">
                    {[0, 0.2, 0.3, 0.5, 1].map(v => (
                      <button key={v} onClick={() => {
                        const newLevels = [...levels];
                        newLevels[idx].share = v;
                        setLevels(newLevels);
                      }} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border transition-all ${level.share === v ? 'bg-[#3390ec] border-[#3390ec] text-white' : 'border-slate-800 text-slate-500'}`}>{v === 0 ? 'OFF' : `${v*100}%`}</button>
                    ))}
                  </div>
                  {isError && <p className="text-[7px] text-red-500 font-black mt-2 uppercase animate-pulse">⚠️ Ошибка: цена {direction === Direction.LONG ? 'ниже' : 'выше'} стопа!</p>}
                </div>
              );
            })}
          </div>
        </Accordion>

        <section className="mt-4">
          <div className={`rounded-2xl p-5 shadow-2xl text-white transition-all duration-500 ${results.isLimitedByMargin ? 'bg-gradient-to-br from-orange-600 to-red-600' : 'bg-gradient-to-br from-[#3390ec] to-[#1c5ea1]'}`}>
            <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-3">
              <div>
                <p className="text-[8px] font-black uppercase opacity-60">ЛОТОВ (ИТОГО)</p>
                <p className="text-4xl font-black mono tracking-tighter">{results.totalContracts}</p>
                {results.isLimitedByMargin && <p className="text-[7px] mt-1 font-black bg-black/30 px-1.5 py-0.5 rounded inline-block uppercase tracking-tighter">Лимит по депозиту!</p>}
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase opacity-60">СРЕДНИЙ ВХОД</p>
                <p className="text-xl font-black mono">{results.averagePrice.toFixed(4)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase">
              <div className="bg-black/20 p-2 rounded-lg">
                <p className="opacity-60 mb-1">Фактич. Риск</p>
                <p className="text-xs">₽{Math.round(results.totalRiskRub)}</p>
              </div>
              <div className="bg-black/20 p-2 rounded-lg">
                <p className="opacity-60 mb-1">По риску можно было</p>
                <p className="text-xs opacity-80">{results.theoreticalTotalContracts} лот.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
