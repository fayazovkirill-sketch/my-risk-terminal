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
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

const Accordion: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#17212b] rounded-xl border border-slate-700/30 overflow-hidden shadow-sm mb-2">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-3 flex justify-between items-center hover:bg-slate-800/10 transition-colors">
        <div className="flex items-center gap-2">
          {icon && <div className="text-[#3390ec]">{icon}</div>}
          <span className="font-bold text-[10px] tracking-wider text-slate-400 uppercase">{title}</span>
        </div>
        <div className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown />
        </div>
      </button>
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[1200px] opacity-100 p-3 pt-0' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [deposit, setDeposit] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(3);
  const [direction, setDirection] = useState<Direction>(Direction.LONG);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(INSTRUMENTS[0]);
  
  const [priceStep, setPriceStep] = useState<number>(selectedInstrument.priceStep);
  const [stepPrice, setStepPrice] = useState<number>(selectedInstrument.stepPrice);
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
    setPriceStep(selectedInstrument.priceStep);
    setStepPrice(selectedInstrument.stepPrice);
    setMarginLong(selectedInstrument.initialMarginLong || 0);
    setMarginShort(selectedInstrument.initialMarginShort || 0);
  }, [selectedInstrument]);

  // Функция для обработки ввода (замена запятой на точку)
  const handleNumericInput = (value: string, setter: (val: number) => void) => {
    const normalized = value.replace(',', '.');
    if (!isNaN(Number(normalized))) {
      setter(Number(normalized));
    }
  };

  const results = useMemo(() => {
    const totalTargetRiskRub = (deposit * riskPercent) / 100;
    const activeLevels = levels.filter(l => l.price > 0 && l.share > 0);
    const totalActiveShare = activeLevels.reduce((acc, l) => acc + l.share, 0);

    const currentMargin = direction === Direction.LONG ? marginLong : marginShort;
    const maxByMargin = currentMargin > 0 ? Math.floor(deposit / currentMargin) : 0;

    let theoreticalTotalContracts = 0;

    const levelResults = activeLevels.map(level => {
      const effectiveShare = totalActiveShare > 0 ? (level.share / totalActiveShare) : 0;
      const allocatedRiskTarget = totalTargetRiskRub * effectiveShare;
      const distance = Math.abs(level.price - stopPrice);
      const ticks = distance / (priceStep || 0.001);
      const riskPerContract = ticks * (stepPrice || 1);
      
      const contractsByRisk = riskPerContract > 0 ? Math.floor(allocatedRiskTarget / riskPerContract) : 0;
      theoreticalTotalContracts += contractsByRisk;

      return {
        label: level.label,
        price: level.price,
        contracts: contractsByRisk, // Пока считаем по риску
        riskPerContract,
        allocatedRisk: contractsByRisk * riskPerContract
      };
    });

    const isLimitedByMargin = theoreticalTotalContracts > maxByMargin;
    const finalTotalContracts = isLimitedByMargin ? maxByMargin : theoreticalTotalContracts;

    // Если уперлись в ГО, пересчитываем лоты уровней пропорционально
    if (isLimitedByMargin && theoreticalTotalContracts > 0) {
      const factor = maxByMargin / theoreticalTotalContracts;
      levelResults.forEach(l => {
        l.contracts = Math.floor(l.contracts * factor);
        l.allocatedRisk = l.contracts * l.riskPerContract;
      });
    }

    const totalRisk = levelResults.reduce((acc, l) => acc + l.allocatedRisk, 0);
    const avgPrice = finalTotalContracts > 0 
      ? levelResults.reduce((acc, l) => acc + (l.price * l.contracts), 0) / finalTotalContracts 
      : 0;

    return { 
      totalRiskRub: totalRisk, 
      levels: levelResults, 
      totalContracts: finalTotalContracts, 
      averagePrice: avgPrice,
      theoreticalTotalContracts,
      maxByMargin,
      isLimitedByMargin
    };
  }, [deposit, riskPercent, levels, stopPrice, priceStep, stepPrice, marginLong, marginShort, direction]);

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto bg-[#0e161e] text-slate-100 flex flex-col antialiased">
      <header className="sticky top-0 z-50 bg-[#242f3d]/98 backdrop-blur-md border-b border-slate-700/40 p-3 flex justify-between items-center h-12">
        <div className="flex items-center gap-2">
          <div className="bg-[#3390ec] p-1 rounded-lg text-white"><BotIcon /></div>
          <div>
            <h1 className="font-black text-[13px] tracking-tight uppercase">ММВБ 2.0</h1>
          </div>
        </div>
      </header>

      <main className="p-2.5 space-y-2">
        {/* Инструменты */}
        <section className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {INSTRUMENTS.map((inst) => (
            <button key={inst.id} onClick={() => setSelectedInstrument(inst)} className={`flex-shrink-0 px-4 py-1.5 rounded-xl border-2 transition-all flex items-center gap-2 ${selectedInstrument.id === inst.id ? 'border-[#3390ec] bg-[#3390ec]/15 text-[#3390ec]' : 'border-slate-800 bg-[#17212b] text-slate-600'}`}>
              <span className="text-base">{inst.icon}</span>
              <span className="font-black text-[10px] uppercase">{inst.ticker}</span>
            </button>
          ))}
        </section>

        {/* Капитал */}
        <Accordion title="Депозит и Риск" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Депозит (₽)</label>
              <input type="text" inputMode="decimal" placeholder="100000" onChange={(e) => handleNumericInput(e.target.value, setDeposit)} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono text-white font-black" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Риск (%)</label>
              <input type="text" inputMode="decimal" placeholder="3" onChange={(e) => handleNumericInput(e.target.value, setRiskPercent)} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono text-[#3390ec] font-black" />
            </div>
          </div>
          <div className="flex mt-2 p-1 bg-[#0e161e] rounded-xl border border-slate-700/40">
            <button onClick={() => setDirection(Direction.LONG)} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${direction === Direction.LONG ? 'bg-green-600 text-white' : 'text-slate-600'}`}><TrendingUp /> LONG</button>
            <button onClick={() => setDirection(Direction.SHORT)} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${direction === Direction.SHORT ? 'bg-red-600 text-white' : 'text-slate-600'}`}><TrendingDown /> SHORT</button>
          </div>
        </Accordion>

        {/* Стоп Лосс */}
        <section className="bg-red-500/10 rounded-xl border border-red-500/20 p-3 text-center">
          <label className="text-[8px] font-black text-red-500 uppercase tracking-widest block mb-1">STOP LOSS PRICE</label>
          <input type="text" inputMode="decimal" placeholder="0.000" onChange={(e) => {
            const val = e.target.value.replace(',', '.');
            setInstrumentStops(prev => ({ ...prev, [selectedInstrument.id]: Number(val) }));
          }} className="bg-transparent text-xl font-black mono text-red-500 text-center w-full focus:outline-none" />
        </section>

        {/* Уровни */}
        <Accordion title="Входы и Распределение" defaultOpen={true}>
          <div className="space-y-3">
            {levels.map((level, idx) => (
              <div key={idx} className="bg-[#0e161e] p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-[#3390ec] font-black uppercase">{level.label}</span>
                  <span className="text-[10px] font-black text-white">{results.levels[idx]?.contracts || 0} лот.</span>
                </div>
                <input type="text" inputMode="decimal" placeholder="Цена входа" onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  const newLevels = [...levels];
                  newLevels[idx].price = Number(val);
                  setLevels(newLevels);
                }} className="w-full bg-[#17212b] border border-slate-700/40 rounded-lg p-2 text-sm mono text-green-400 font-bold mb-2" />
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {shareOptions.map(opt => (
                    <button key={opt.value} onClick={() => {
                      const newLevels = [...levels];
                      newLevels[idx].share = opt.value;
                      setLevels(newLevels);
                    }} className={`flex-1 min-w-[45px] py-1.5 rounded-lg text-[9px] font-black border ${level.share === opt.value ? 'bg-[#3390ec] text-white' : 'bg-[#17212b] text-slate-500 border-slate-800'}`}>{opt.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        {/* Итоговая карточка */}
        <section className="mt-4 space-y-3">
          <div className={`rounded-2xl p-5 shadow-2xl text-white transition-colors ${results.isLimitedByMargin ? 'bg-gradient-to-br from-orange-600 to-red-700' : 'bg-gradient-to-br from-[#3390ec] to-[#1c5ea1]'}`}>
            <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-3">
              <div>
                <p className="text-[8px] font-black uppercase opacity-60">КОНТРАКТОВ (ИТОГО)</p>
                <p className="text-4xl font-black mono leading-none">{results.totalContracts}</p>
                {results.isLimitedByMargin && (
                  <p className="text-[7px] mt-1 font-bold bg-black/20 px-1 rounded inline-block">ЛИМИТ ПО ДЕПОЗИТУ!</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black uppercase opacity-60">ПО РИСКУ МОЖНО БЫЛО</p>
                <p className="text-xl font-black mono opacity-80">{results.theoreticalTotalContracts}</p>
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase">
              <span className="bg-black/20 px-2 py-1 rounded">РИСК: ₽{Math.round(results.totalRiskRub)}</span>
              <span className="bg-black/20 px-2 py-1 rounded">МАКС ЛОТОВ ПО ГО: {results.maxByMargin}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const shareOptions = [
  { label: 'Off', value: 0 },
  { label: '20%', value: 0.2 },
  { label: '30%', value: 0.3 },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1.0 }
];

export default App;
