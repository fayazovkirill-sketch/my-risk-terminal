import React, { useState, useMemo, useEffect } from 'react';
import { Direction, Instrument, CalculationResult, EntryLevel, LevelResult } from './types';
import { INSTRUMENTS } from './constants';
import { getRiskAdvice } from './services/geminiService';

declare global {
  interface Window {
    Telegram: any;
  }
}

// Иконки
const TrendingUp = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const TrendingDown = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>;

const Accordion: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#17212b] rounded-xl border border-slate-700/30 overflow-hidden shadow-sm mb-1.5">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        }}
        className="w-full p-2.5 flex justify-between items-center hover:bg-slate-800/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <div className="text-[#3390ec]">{icon}</div>}
          <span className="font-bold text-[9px] tracking-widest text-slate-400 uppercase">{title}</span>
        </div>
        <div className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown />
        </div>
      </button>
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100 p-2.5 pt-0' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const tg = window.Telegram?.WebApp;
  const isTelegram = !!tg && tg.platform !== 'unknown';

  const getStored = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    try { return JSON.parse(saved); } catch { return defaultValue; }
  };

  const [deposit, setDeposit] = useState<number>(() => getStored('mmvb_deposit', 100000));
  const [riskPercent, setRiskPercent] = useState<number>(() => getStored('mmvb_risk', 1));
  const [direction, setDirection] = useState<Direction>(Direction.LONG);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(() => {
    const id = getStored('mmvb_selected_id', INSTRUMENTS[0].id);
    return INSTRUMENTS.find(i => i.id === id) || INSTRUMENTS[0];
  });
  
  const [priceStep, setPriceStep] = useState<number>(selectedInstrument.priceStep);
  const [stepPrice, setStepPrice] = useState<number>(selectedInstrument.stepPrice);

  const [instrumentStops, setInstrumentStops] = useState<Record<string, number>>(() => getStored('mmvb_stops', {}));

  const stopPrice = instrumentStops[selectedInstrument.id] || 0;

  const [levels, setLevels] = useState<EntryLevel[]>(() => getStored('mmvb_levels', [
    { label: 'УРОВЕНЬ 1', price: 0, share: 1.0 },
    { label: 'УРОВЕНЬ 2', price: 0, share: 0 },
  ]));

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isTelegram) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#242f3d');
      tg.MainButton.setParams({ text: 'АНАЛИЗ РИСКА AI', color: '#3390ec' });
      tg.MainButton.onClick(handleGetAiAdvice);
    }
  }, [isTelegram]);

  useEffect(() => localStorage.setItem('mmvb_deposit', JSON.stringify(deposit)), [deposit]);
  useEffect(() => localStorage.setItem('mmvb_risk', JSON.stringify(riskPercent)), [riskPercent]);
  useEffect(() => localStorage.setItem('mmvb_selected_id', JSON.stringify(selectedInstrument.id)), [selectedInstrument]);
  useEffect(() => localStorage.setItem('mmvb_stops', JSON.stringify(instrumentStops)), [instrumentStops]);
  useEffect(() => localStorage.setItem('mmvb_levels', JSON.stringify(levels)), [levels]);

  useEffect(() => {
    setPriceStep(selectedInstrument.priceStep);
    setStepPrice(selectedInstrument.stepPrice);
  }, [selectedInstrument]);

  const results = useMemo((): CalculationResult => {
    const totalTargetRiskRub = (deposit * riskPercent) / 100;
    const activeLevels = levels.filter(l => l.price > 0 && l.share > 0);
    const totalActiveShare = activeLevels.reduce((acc, l) => acc + l.share, 0);

    let actualTotalRiskRub = 0;
    const levelResults: LevelResult[] = activeLevels.map(level => {
      const effectiveShare = totalActiveShare > 0 ? (level.share / totalActiveShare) : 0;
      const allocatedRiskTarget = totalTargetRiskRub * effectiveShare;
      const distance = Math.abs(level.price - stopPrice);
      const ticks = distance / (priceStep || 0.001);
      const riskPerContract = ticks * (stepPrice || 1);
      const contracts = riskPerContract > 0 ? Math.floor(allocatedRiskTarget / riskPerContract) : 0;
      actualTotalRiskRub += contracts * riskPerContract;

      return {
        label: level.label,
        price: level.price,
        contracts,
        riskPerContract,
        allocatedRisk: contracts * riskPerContract
      };
    });

    const totalContracts = levelResults.reduce((acc, l) => acc + l.contracts, 0);
    const totalWeightedPrice = levelResults.reduce((acc, l) => acc + (l.price * l.contracts), 0);
    const averagePrice = totalContracts > 0 ? totalWeightedPrice / totalContracts : 0;

    if (isTelegram) {
      if (totalContracts > 0 && !isAiLoading) tg.MainButton.show();
      else tg.MainButton.hide();
    }

    return { totalRiskRub: actualTotalRiskRub, levels: levelResults, totalContracts, averagePrice };
  }, [deposit, riskPercent, levels, stopPrice, priceStep, stepPrice, isAiLoading, isTelegram]);

  const updateLevel = (index: number, field: keyof EntryLevel, value: any) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: Number(value) };
    setLevels(newLevels);
    tg?.HapticFeedback?.impactOccurred('light');
  };

  async function handleGetAiAdvice() {
    if (isAiLoading) return;
    setIsAiLoading(true);
    try {
      const advice = await getRiskAdvice(selectedInstrument, direction, results.averagePrice, stopPrice, deposit, riskPercent, results);
      setAiAdvice(advice);
    } catch (e) {
      setAiAdvice("Ошибка подключения к AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const shareOptions = [{ label: 'ВЫКЛ', value: 0 }, { label: '50%', value: 0.5 }, { label: '100%', value: 1.0 }];

  const sendPlanToBot = () => {
    const report = `📊 РИСК-ПЛАН: ${selectedInstrument.ticker}\n` +
      `Направление: ${direction === Direction.LONG ? 'ПОКУПКА 🟢' : 'ПРОДАЖА 🔴'}\n` +
      `Ср. цена: ${results.averagePrice.toFixed(4)}\n` +
      `Объем: ${results.totalContracts} лот.\n` +
      `Риск: ₽${Math.round(results.totalRiskRub)}`;
    
    if (isTelegram) tg.sendData(report);
    else {
      navigator.clipboard.writeText(report);
      alert('План скопирован!');
    }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto bg-[#0e161e] text-slate-100 flex flex-col antialiased overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[#242f3d]/95 backdrop-blur-sm p-3 flex justify-between items-center border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <div className="bg-[#3390ec] p-1 rounded-lg shadow-lg"><BotIcon /></div>
          <div>
            <h1 className="font-black text-xs tracking-tight uppercase">РИСК-ТЕРМИНАЛ</h1>
            <p className="text-[7px] font-bold text-[#61b8f5] uppercase tracking-widest">v3.0 • БЕЗ ПЛЕЧА</p>
          </div>
        </div>
        {!isTelegram && (
          <button onClick={handleGetAiAdvice} disabled={isAiLoading || results.totalContracts === 0} className="px-2 py-1 rounded-full bg-[#3390ec]/20 border border-[#3390ec]/40 text-[#3390ec] text-[8px] font-black uppercase">
            {isAiLoading ? 'АНАЛИЗ...' : 'AI АНАЛИЗ'}
          </button>
        )}
      </header>

      <main className="p-2 space-y-1.5 flex-1">
        {/* Выбор инструмента */}
        <section className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {INSTRUMENTS.map((inst) => (
            <button key={inst.id} onClick={() => setSelectedInstrument(inst)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl border-2 transition-all flex items-center gap-2 ${selectedInstrument.id === inst.id ? 'border-[#3390ec] bg-[#3390ec]/10 text-[#3390ec]' : 'border-slate-800 bg-[#17212b] text-slate-600'}`}>
              <span className="text-sm">{inst.icon}</span>
              <span className="font-black text-[9px] uppercase">{inst.ticker}</span>
            </button>
          ))}
        </section>

        {/* Капитал */}
        <Accordion title="КАПИТАЛ И РИСК" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-2 py-1">
            <div className="space-y-1">
              <label className="text-[7px] font-bold text-slate-500 uppercase px-1">Депозит (₽)</label>
              <input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2 mono text-white text-sm font-black focus:border-[#3390ec]" />
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-bold text-slate-500 uppercase px-1">Риск на сделку (%)</label>
              <input type="number" value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2 mono text-[#3390ec] text-sm font-black focus:border-[#3390ec]" />
            </div>
          </div>
          <div className="flex mt-2 p-1 bg-[#0e161e] rounded-lg border border-slate-700/40">
            <button onClick={() => setDirection(Direction.LONG)} className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${direction === Direction.LONG ? 'bg-green-600 text-white' : 'text-slate-600'}`}><TrendingUp /><span className="text-[9px] font-black uppercase">ЛОНГ</span></button>
            <button onClick={() => setDirection(Direction.SHORT)} className={`flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2 ${direction === Direction.SHORT ? 'bg-red-600 text-white' : 'text-slate-600'}`}><TrendingDown /><span className="text-[9px] font-black uppercase">ШОРТ</span></button>
          </div>
        </Accordion>

        {/* Стоп-лосс */}
        <section className="bg-red-500/5 rounded-xl border border-red-500/20 p-2 text-center">
          <label className="text-[7px] font-black text-red-500 uppercase tracking-widest block mb-1">ЦЕНА СТОП-ЛОССА</label>
          <input type="number" step={priceStep} value={stopPrice} onChange={(e) => setInstrumentStops(prev => ({ ...prev, [selectedInstrument.id]: Number(e.target.value) }))} className="bg-transparent text-xl font-black mono text-red-500 text-center focus:outline-none w-full" placeholder="0.000" />
        </section>

        {/* Входы */}
        <Accordion title="ТОЧКИ ВХОДА" defaultOpen={true}>
          <div className="space-y-2">
            {levels.map((level, idx) => (
              <div key={idx} className="bg-[#0e161e] p-2 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] text-[#3390ec] font-black uppercase">{level.label}</span>
                  <span className="text-[9px] font-black text-white">{results.levels[idx]?.contracts || 0} ЛОТ.</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" step={priceStep} placeholder="Цена входа..." value={level.price || ''} onChange={(e) => updateLevel(idx, 'price', e.target.value)} className="flex-1 bg-[#17212b] border border-slate-700/40 rounded-lg p-1.5 text-xs mono text-green-400 font-bold focus:outline-none" />
                  <div className="flex gap-1">
                    {shareOptions.map(opt => (
                      <button key={opt.value} onClick={() => updateLevel(idx, 'share', opt.value)} className={`px-2 py-1 rounded text-[7px] font-black border ${level.share === opt.value ? 'bg-[#3390ec] border-[#3390ec] text-white' : 'bg-[#17212b] border-slate-800 text-slate-500'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        {/* Итоговая панель */}
        <section className="mt-2 space-y-2">
          <div className="bg-gradient-to-br from-[#3390ec] to-[#1c5ea1] rounded-xl p-4 shadow-xl text-white">
            <div className="flex justify-between items-end border-b border-white/10 pb-3 mb-2">
              <div>
                <p className="text-[7px] font-black uppercase opacity-60">ВСЕГО КОНТРАКТОВ</p>
                <p className="text-3xl font-black mono leading-none tracking-tighter">{results.totalContracts}</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] font-black uppercase opacity-60">СРЕДНИЙ ВХОД</p>
                <p className="text-xl font-black mono leading-none">{results.averagePrice.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex justify-between text-[8px] font-black uppercase">
              <span className="bg-black/20 px-2 py-1 rounded">РИСК: ₽{Math.round(results.totalRiskRub)}</span>
              <span className="bg-black/20 px-2 py-1 rounded">{selectedInstrument.ticker}</span>
            </div>
          </div>

          <button onClick={sendPlanToBot} disabled={results.totalContracts === 0} className="w-full py-3 rounded-xl bg-[#3390ec]/20 border border-[#3390ec]/40 text-[#3390ec] font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
            <ShareIcon /> {isTelegram ? 'ОТПРАВИТЬ ПЛАН' : 'КОПИРОВАТЬ ПЛАН'}
          </button>
        </section>

        {aiAdvice && (
          <div className="bg-[#1c242d] p-3 rounded-xl border border-slate-700/30 text-[10px] text-slate-300 italic shadow-inner">
            <span className="text-[#3390ec] font-black uppercase text-[8px] block mb-1">AI СОВЕТ:</span>
            {aiAdvice}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#1c242d]/95 backdrop-blur-md border-t border-slate-800 p-2 flex justify-between items-center h-16 z-50">
        <div className="flex flex-col px-4">
          <span className="text-[7px] text-slate-500 font-black uppercase">ПОЗИЦИЯ</span>
          <span className="text-xl font-black text-[#3390ec] mono leading-none">{results.totalContracts} <small className="text-[8px] text-slate-600">ЛОТ.</small></span>
        </div>
        <div className="text-right px-4">
           <span className="text-[7px] text-slate-500 font-black uppercase">РИСК В РУБЛЯХ</span>
           <span className="text-lg font-black text-red-400 mono leading-none">₽{Math.round(results.totalRiskRub)}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
