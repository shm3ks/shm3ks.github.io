import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';
import { AtwoodState, HistoryPoint, SimulationType, SandboxState, Theme } from '../types';
import { Activity, Zap } from 'lucide-react';
import { GRAVITY, THEME_COLORS } from '../constants';

interface Props {
  type: SimulationType;
  history: HistoryPoint[];
  atwoodState: AtwoodState;
  sandboxState: SandboxState;
  theme: Theme;
}

export const DataPanel: React.FC<Props> = ({ type, history, atwoodState, sandboxState, theme }) => {
  
  // --- Energy Calculation Helpers ---
  const calculateEnergy = () => {
      let pe = 0;
      let ke = 0;
      let rotKe = 0;

      if (type === SimulationType.ATWOOD) {
          const FLOOR_H = 5.0;
          const h1 = Math.max(0, FLOOR_H - atwoodState.y1);
          const h2 = Math.max(0, FLOOR_H - atwoodState.y2);
          pe = (atwoodState.mass1 * GRAVITY * h1) + (atwoodState.mass2 * GRAVITY * h2);
          const v = atwoodState.velocity;
          ke = 0.5 * (atwoodState.mass1 + atwoodState.mass2) * (v * v);
          rotKe = 0.25 * atwoodState.pulleyMass * (v * v);
      } else {
          const FLOOR_Y = 550;
          sandboxState.loads.forEach(load => {
              const h = Math.max(0, (FLOOR_Y - load.y) / 100);
              pe += load.mass * GRAVITY * h;
              ke += 0.5 * load.mass * (sandboxState.loadVelocity * sandboxState.loadVelocity);
          });
          sandboxState.movablePulleys.forEach(p => {
              const h = Math.max(0, (FLOOR_Y - p.y) / 100);
              pe += 1.0 * GRAVITY * h; 
              ke += 0.5 * 1.0 * (sandboxState.loadVelocity * sandboxState.loadVelocity);
          });
      }
      const totalKe = ke + rotKe;
      const total = pe + totalKe;
      return { pe, ke: totalKe, total };
  };

  const energy = calculateEnergy();
  const maxEnergyBar = Math.max(1, energy.total);
  const gridColor = THEME_COLORS[theme].grid;
  const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-72 h-full flex flex-col shadow-lg z-10 transition-colors duration-300">
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
           <Activity size={18} className="text-slate-500" />
           Live Analysis
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
        {/* Large Stats Grid */}
        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-1.5 shrink-0">
           {type === SimulationType.ATWOOD ? (
             <>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-0.5">Velocity</div>
                  <div className="text-3xl font-mono text-purple-600 dark:text-purple-400 font-black leading-none">
                    {Math.abs(atwoodState.velocity).toFixed(2)} <span className="text-sm text-slate-400 font-medium">m/s</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-0.5">Acceleration</div>
                  <div className="text-2xl font-mono text-emerald-600 dark:text-emerald-400 font-bold leading-none">
                    {Math.abs(atwoodState.acceleration).toFixed(2)} <span className="text-sm text-slate-400 font-medium">m/s²</span>
                  </div>
                </div>
             </>
           ) : (
             <>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-0.5">Load Velocity</div>
                  <div className="text-3xl font-mono text-purple-600 dark:text-purple-400 font-black leading-none">
                    {sandboxState.loadVelocity.toFixed(2)} <span className="text-sm text-slate-400 font-medium">m/s</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-0.5">Acceleration</div>
                  <div className="text-2xl font-mono text-emerald-600 dark:text-emerald-400 font-bold leading-none">
                    {Math.abs(sandboxState.loadAcceleration).toFixed(2)} <span className="text-sm text-slate-400 font-medium">m/s²</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-1 px-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">Advantage</div>
                    <div className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {sandboxState.fixedPulleys.length + sandboxState.movablePulleys.length}:1
                    </div>
                </div>
             </>
           )}
        </div>

        {/* Energy Analysis Section - SMALLER FONT */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
             <div className="flex items-center gap-1.5 mb-1.5">
                <Zap size={13} className="text-amber-500" fill="currentColor" />
                <h3 className="text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Energy Balance</h3>
             </div>
             
             <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                   <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tight">Potential</span>
                      <span className="font-mono text-slate-800 dark:text-slate-100 font-bold text-[10px]">{energy.pe.toFixed(1)} J</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-blue-500 transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, (energy.pe / maxEnergyBar) * 100)}%` }} />
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tight">Kinetic</span>
                      <span className="font-mono text-slate-800 dark:text-slate-100 font-bold text-[10px]">{energy.ke.toFixed(1)} J</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-amber-500 transition-all duration-300 rounded-full" style={{ width: `${Math.min(100, (energy.ke / maxEnergyBar) * 100)}%` }} />
                   </div>
                </div>

                <div className="pt-1 border-t border-slate-200 dark:border-slate-700 mt-0.5 flex justify-between items-center">
                   <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase">Total System</span>
                   <span className="font-mono text-lg font-black text-slate-900 dark:text-white leading-none tracking-tighter">{energy.total.toFixed(1)} J</span>
                </div>
             </div>
        </div>

        {/* Charts Container - Maintained size for dynamics but slightly adjusted padding */}
        <div className="flex-1 p-2 flex flex-col gap-2 bg-white dark:bg-slate-900 min-h-0 overflow-hidden">
            {/* Chart 1: Velocity */}
            <div className="flex-1 relative border border-slate-100 dark:border-slate-800 rounded-xl p-1 max-h-[125px] min-h-[105px]">
                <h3 className="absolute top-1 left-2 text-[8px] font-bold text-slate-400 dark:text-slate-500 z-10 uppercase tracking-tighter">Velocity Profile</h3>
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 15, right: 0, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis tick={{fontSize: 7, fill: textColor}} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{fontSize: '8px', padding: '2px', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff'}} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeOpacity={0.3} />
                    <Area type="monotone" dataKey="velocity" stroke="#3b82f6" fill={theme === 'dark' ? '#1d4ed8' : '#eff6ff'} fillOpacity={0.1} strokeWidth={1.5} isAnimationActive={false} dot={false} />
                </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2: Position */}
            <div className="flex-1 relative border border-slate-100 dark:border-slate-800 rounded-xl p-1 max-h-[125px] min-h-[105px]">
                <h3 className="absolute top-1 left-2 text-[8px] font-bold text-slate-400 dark:text-slate-500 z-10 uppercase tracking-tighter">Position (Y)</h3>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 15, right: 0, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis tick={{fontSize: 7, fill: textColor}} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{fontSize: '8px', padding: '2px', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff'}} />
                    <Line type="monotone" dataKey="position" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};