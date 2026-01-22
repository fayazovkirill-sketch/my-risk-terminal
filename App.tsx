
import React, { useState, useMemo, useEffect } from 'react';
import { Direction, Instrument, CalculationResult, EntryLevel, LevelResult } from './types';
import { INSTRUMENTS } from './constants';
import { getRiskAdvice } from './services/geminiService';

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
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>;

const Accordion: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#17212b] rounded-xl border border-slate-700/30 overflow-hidden shadow-sm mb-2">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        }}
        className="w-full p-3 flex justify-between items-center hover:bg-slate-800/10 transition-colors"
      >
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
  const tg = window.Telegram?.WebApp;
  const isTelegram = !!tg && tg.platform !== 'unknown';

  const getStored = (key: string, defaultValue: any) => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    try {
      return JSON.parse(saved);
    } catch {
      return defaultValue;
    }
  };

  const [deposit, setDeposit] = useState<number>(() => getStored('mmvb_deposit', 100000));
  const [riskPercent, setRiskPercent] = useState<number>(() => getStored('mmvb_risk', 3));
  const [direction, setDirection] = useState<Direction>(Direction.LONG);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(() => {
    const id = getStored('mmvb_selected_id', INSTRUMENTS[0].id);
    return INSTRUMENTS.find(i => i.id === id) || INSTRUMENTS[0];
  });
  
  const [priceStep, setPriceStep] = useState<number>(selectedInstrument.priceStep);
  const [stepPrice, setStepPrice] = useState<number>(selectedInstrument.stepPrice);

  const [instrumentStops, setInstrumentStops] = useState<Record<string, number>>(() => getStored('mmvb_stops', {
    'ng': 2.939,
    'br': 80.0,
    'silver': 30.0
  }));

  const stopPrice = instrumentStops[selectedInstrument.id] || 0;

  const [levels, setLevels] = useState<EntryLevel[]>(() => getStored('mmvb_levels', [
    { label: 'Уровень 1', price: 0, share: 0.2 },
    { label: 'Уровень 2', price: 0, share: 0.3 },
    { label: 'Уровень 3', price: 0, share: 0.5 },
  ]));

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isTelegram) {
      tg.ready();
      tg.expand();
      const theme = tg.themeParams;
      if (theme.bg_color) document.body.style.backgroundColor = theme.bg_color;
      tg.setHeaderColor(theme.secondary_bg_color || '#242f3d');
      tg.setBackgroundColor(theme.bg_color || '#0e161e');
      tg.MainButton.setParams({
        text: 'ПОЛУЧИТЬ АНАЛИЗ AI',
        color: '#3390ec',
        text_color: '#ffffff'
      });
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
      if (totalContracts > 0 && !isAiLoading) {
        tg.MainButton.show();
      } else {
        tg.MainButton.hide();
      }
    }

    return { totalRiskRub: actualTotalRiskRub, levels: levelResults, totalContracts, averagePrice };
  }, [deposit, riskPercent, levels, stopPrice, priceStep, stepPrice, isAiLoading, isTelegram]);

  const updateLevel = (index: number, field: keyof EntryLevel, value: string | number) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: typeof value === 'string' ? Number(value) : value };
    setLevels(newLevels);
    tg?.HapticFeedback?.impactOccurred('light');
  };

  async function handleGetAiAdvice() {
    if (isAiLoading) return;
    tg?.HapticFeedback?.notificationOccurred('success');
    setIsAiLoading(true);
    if (isTelegram) tg.MainButton.showProgress(false);
    
    try {
      const advice = await getRiskAdvice(selectedInstrument, direction, results.averagePrice, stopPrice, deposit, riskPercent, results);
      setAiAdvice(advice || "Ошибка получения совета.");
    } catch (e) {
      setAiAdvice("⚠️ Не удалось связаться с аналитиком. Проверьте API_KEY.");
    } finally {
      setIsAiLoading(false);
      if (isTelegram) tg.MainButton.hideProgress();
    }
  };

  const shareOptions = [
    { label: 'Off', value: 0 },
    { label: '20%', value: 0.2 },
    { label: '30%', value: 0.3 },
    { label: '50%', value: 0.5 },
    { label: '100%', value: 1.0 }
  ];

  const resetSpecs = () => {
    setPriceStep(selectedInstrument.priceStep);
    setStepPrice(selectedInstrument.stepPrice);
    tg?.HapticFeedback?.impactOccurred('medium');
  };

  const sendPlanToBot = () => {
    const report = `📊 ПЛАН ММВБ 2.0: ${selectedInstrument.ticker}\n` +
      `Направление: ${direction}\n` +
      `Ср. цена: ${results.averagePrice.toFixed(4)}\n` +
      `Объем: ${results.totalContracts} лот.\n` +
      `Риск: ₽${Math.round(results.totalRiskRub)}`;
    
    if (isTelegram) {
      tg.sendData(report);
      tg.HapticFeedback.notificationOccurred('success');
    } else {
      // В браузере просто копируем в буфер
      navigator.clipboard.writeText(report);
      alert('План скопирован в буфер обмена!');
    }
  };

  return (
    <div className="min-h-screen pb-32 max-w-lg mx-auto bg-[#0e161e] text-slate-100 flex flex-col border-x border-slate-800 shadow-2xl overflow-x-hidden antialiased">
      <header className="sticky top-0 z-50 bg-[#242f3d]/98 backdrop-blur-md border-b border-slate-700/40 p-3 flex justify-between items-center h-12">
        <div className="flex items-center gap-2">
          <div className="bg-[#3390ec] p-1 rounded-lg text-white shadow-lg"><BotIcon /></div>
          <div>
            <h1 className="font-black text-[13px] tracking-tight leading-none mb-0.5 uppercase">ММВБ 2.0</h1>
            <p className="text-[7px] font-bold text-[#61b8f5] uppercase tracking-[0.2em] leading-none">Risk Terminal</p>
          </div>
        </div>
        {!isTelegram && (
           <button 
             onClick={handleGetAiAdvice}
             disabled={isAiLoading || results.totalContracts === 0}
             className="px-3 py-1 rounded-full bg-[#3390ec]/20 border border-[#3390ec]/40 text-[#3390ec] text-[9px] font-black uppercase tracking-tighter disabled:opacity-30"
           >
             {isAiLoading ? 'AI Анализ...' : 'AI Анализ'}
           </button>
        )}
      </header>

      <main className="p-2.5 space-y-2 flex-1">
        <section className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {INSTRUMENTS.map((inst) => (
            <button
              key={inst.id}
              onClick={() => { setSelectedInstrument(inst); tg?.HapticFeedback?.impactOccurred('medium'); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-xl border-2 transition-all flex items-center gap-2 ${
                selectedInstrument.id === inst.id 
                ? 'border-[#3390ec] bg-[#3390ec]/15 text-[#3390ec] shadow-[0_0_15px_rgba(51,144,236,0.15)] scale-105 z-10' 
                : 'border-slate-800 bg-[#17212b] text-slate-600'
              }`}
            >
              <span className="text-base">{inst.icon}</span>
              <span className="font-black text-[10px] uppercase tracking-tighter">{inst.ticker}</span>
            </button>
          ))}
        </section>

        <Accordion title="Капитал и Направление" defaultOpen={true}>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Депозит (₽)</label>
                <input type="number" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono text-white text-base font-black focus:outline-none focus:border-[#3390ec]/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Риск (%)</label>
                <input type="number" inputMode="decimal" value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono text-[#3390ec] text-base font-black focus:outline-none focus:border-[#3390ec]/50" />
              </div>
            </div>
            <div className="flex p-1 bg-[#0e161e] rounded-xl border border-slate-700/40">
              <button onClick={() => { setDirection(Direction.LONG); tg?.HapticFeedback?.impactOccurred('light'); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${direction === Direction.LONG ? 'bg-green-600 text-white shadow-lg' : 'text-slate-600'}`}><TrendingUp /> <span className="font-black text-[10px] uppercase">LONG</span></button>
              <button onClick={() => { setDirection(Direction.SHORT); tg?.HapticFeedback?.impactOccurred('light'); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${direction === Direction.SHORT ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600'}`}><TrendingDown /> <span className="font-black text-[10px] uppercase">SHORT</span></button>
            </div>
          </div>
        </Accordion>

        <Accordion title="Спецификация" icon={<SettingsIcon />} defaultOpen={false}>
          <div className="space-y-2 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Шаг цены</label>
                <input type="number" step="0.00001" inputMode="decimal" value={priceStep} onChange={(e) => setPriceStep(Number(e.target.value))} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono text-slate-300 text-xs font-bold focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-slate-500 uppercase px-1">Цена шага</label>
                <input type="number" step="0.00001" inputMode="decimal" value={stepPrice} onChange={(e) => setStepPrice(Number(e.target.value))} className="w-full bg-[#0e161e] border border-slate-700/40 rounded-lg p-2.5 mono text-slate-300 text-xs font-bold focus:outline-none" />
              </div>
            </div>
            <button onClick={resetSpecs} className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-slate-700/20 text-[7px] font-bold text-slate-600 uppercase hover:text-slate-400 transition-colors"><RefreshIcon /> Сбросить настройки инструмента</button>
          </div>
        </Accordion>

        <Accordion title="Входы и Стоп-лосс" defaultOpen={true}>
          <div className="space-y-3 py-1">
            <div className="bg-[#0e161e] p-3 rounded-xl border-2 border-red-500/10 shadow-inner">
              <label className="text-[8px] font-black text-red-500/60 uppercase block text-center mb-1.5 tracking-[0.2em]">Stop Loss Price</label>
              <input type="number" step={priceStep} inputMode="decimal" value={stopPrice} onChange={(e) => { setInstrumentStops(prev => ({ ...prev, [selectedInstrument.id]: Number(e.target.value) })); tg?.HapticFeedback?.impactOccurred('light'); }} className="w-full bg-transparent text-center text-xl font-black mono text-red-500 focus:outline-none" />
            </div>
            <div className="space-y-2.5">
              {levels.map((level, idx) => (
                <div key={idx} className={`bg-[#0e161e] rounded-xl border p-2.5 transition-all ${level.price > 0 ? 'border-[#3390ec]/30 bg-[#17212b]/30' : 'border-slate-800/40 opacity-70'}`}>
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[9px] text-[#3390ec] font-black uppercase tracking-widest">{level.label}</span>
                    <div className="flex items-center gap-1.5 bg-[#0e161e] px-2 py-0.5 rounded-md border border-slate-800">
                       <span className="text-[8px] text-slate-500 font-bold uppercase">Объем:</span>
                       <span className="text-[10px] font-black mono text-white">{results.levels.find(r => r.label === level.label)?.contracts || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input type="number" step={priceStep} inputMode="decimal" placeholder="Установите цену..." value={level.price || ''} onChange={(e) => updateLevel(idx, 'price', e.target.value)} className="w-full bg-[#17212b] border border-slate-700/40 rounded-lg p-2 text-sm mono text-green-400 font-black focus:outline-none" />
                    <div className="flex gap-1 overflow-x-auto no-scrollbar">
                      {shareOptions.map(opt => (
                        <button key={opt.value} onClick={() => updateLevel(idx, 'share', opt.value)} className={`flex-1 min-w-[42px] py-1.5 rounded-lg text-[9px] font-black transition-all border ${level.share === opt.value ? 'bg-[#3390ec] border-[#3390ec] text-white shadow-[0_2px_10px_rgba(51,144,236,0.3)]' : 'bg-[#17212b] border-slate-800 text-slate-500 hover:text-slate-300'}`}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Accordion>

        <section className="space-y-3 mt-2">
          <div className="bg-gradient-to-br from-[#3390ec] via-[#2a76c4] to-[#1c5ea1] rounded-2xl p-5 shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 p-3 opacity-10"><BotIcon /></div>
            <div className="relative z-10 flex justify-between items-start border-b border-white/10 pb-4 mb-3">
              <div>
                <p className="text-[8px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">КОНТРАКТОВ (ИТОГО)</p>
                <p className="text-4xl font-black mono text-white leading-none tracking-tighter">{results.totalContracts}</p>
                <div className="flex gap-1.5 mt-2">
                   <p className="text-[8px] text-red-100 font-black uppercase bg-red-500/30 px-2 py-0.5 rounded-md border border-red-500/20">РИСК: ₽{Math.round(results.totalRiskRub).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">СРЕДНИЙ ВХОД</p>
                <p className="text-2xl font-black mono text-white leading-tight">{results.averagePrice.toFixed(3)}</p>
              </div>
            </div>
            <div className="relative z-10 flex justify-between text-[9px] font-black text-white/70 uppercase tracking-widest">
               <span className="bg-black/20 px-2 py-0.5 rounded">ДЕПО: ₽{deposit.toLocaleString()}</span>
               <span className="bg-black/20 px-2 py-0.5 rounded">РИСК: {riskPercent}%</span>
            </div>
          </div>
          <button onClick={sendPlanToBot} disabled={results.totalContracts === 0} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all bg-[#3390ec]/20 border border-[#3390ec]/30 text-[#3390ec] shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100">
            <ShareIcon /> {isTelegram ? 'ОТПРАВИТЬ ПЛАН В БОТ' : 'КОПИРОВАТЬ ПЛАН'}
          </button>
          {aiAdvice && (
            <div className="bg-[#1c242d] p-4 rounded-2xl border border-slate-700/30 text-[11px] leading-relaxed text-slate-300 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-700/30 pb-2">
                <div className="text-[#3390ec] p-1 bg-[#3390ec]/10 rounded"><BotIcon /></div>
                <span className="font-black text-[9px] uppercase tracking-widest text-slate-500">Аналитика ММВБ 2.0 (Gemini 3 Pro)</span>
              </div>
              <div className="whitespace-pre-line italic font-medium">{aiAdvice}</div>
            </div>
          )}
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1c242d]/98 backdrop-blur-xl border-t border-slate-800/80 p-3 px-8 flex items-center justify-between h-20 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-500 font-black uppercase mb-1">ПОЗИЦИЯ</span>
          <span className="text-2xl font-black text-[#3390ec] mono leading-none">{results.totalContracts} <span className="text-[10px] text-slate-600">LOT</span></span>
        </div>
        <div className="h-8 w-px bg-slate-700/30 mx-2"></div>
        <div className="text-right flex-1">
           <span className="text-[8px] text-slate-500 font-black uppercase mb-1 block">СРЕДНЯЯ ЦЕНА</span>
           <span className="text-xl font-black text-green-400 mono leading-none">{results.averagePrice.toFixed(4)}</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
