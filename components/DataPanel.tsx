
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
  
  // Helper to calculate total masses for display
  const calculateSandboxMasses = () => {
    const totalMass = sandboxState.loads.reduce((acc, l) => acc + l.mass, 0);
    return { totalMass };
  };

  const { totalMass } = calculateSandboxMasses();

  // --- Energy Calculation Helpers ---
  const calculateEnergy = () => {
      let pe = 0;
      let ke = 0;
      let rotKe = 0;

      if (type === SimulationType.ATWOOD) {
          // Reference height: Let's say y=5m is the floor (h=0), y=0 is h=5m.
          const FLOOR_H = 5.0;
          const h1 = Math.max(0, FLOOR_H - atwoodState.y1);
          const h2 = Math.max(0, FLOOR_H - atwoodState.y2);

          // PE = mgh
          pe = (atwoodState.mass1 * GRAVITY * h1) + (atwoodState.mass2 * GRAVITY * h2);

          // Linear KE = 0.5 * m * v^2
          const v = atwoodState.velocity;
          ke = 0.5 * (atwoodState.mass1 + atwoodState.mass2) * (v * v);

          // Rotational KE = 0.5 * I * w^2
          // I = 0.5 * M * R^2
          // w = v / R
          // KE_rot = 0.5 * (0.5 * M * R^2) * (v/R)^2 = 0.25 * M * v^2
          rotKe = 0.25 * atwoodState.pulleyMass * (v * v);

      } else {
          // Sandbox Mode
          // 1 meter = 100 pixels. Canvas height = 600px.
          // Let's define floor at y=550px as h=0.
          const FLOOR_Y = 550;
          
          sandboxState.loads.forEach(load => {
              // Convert pixel Y to meters height
              const h = Math.max(0, (FLOOR_Y - load.y) / 100);
              pe += load.mass * GRAVITY * h;
              
              // KE
              // Using loadVelocity for all connected loads (approximation for complex systems)
              // Ideally each load has its own velocity vector, but system velocity is close enough for linear parts
              ke += 0.5 * load.mass * (sandboxState.loadVelocity * sandboxState.loadVelocity);
          });
          
          // Add PE of movable pulleys (assuming approx 1kg mass for visualization)
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
  const maxEnergyBar = Math.max(1, energy.total); // Avoid division by zero
  const gridColor = THEME_COLORS[theme].grid;
  const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-80 h-full flex flex-col shadow-lg z-10 transition-colors duration-300">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
           <Activity size={20} className="text-slate-500" />
           Live Data
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Real-time Stats Grid */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-3 shrink-0">
           {type === SimulationType.ATWOOD ? (
             <>
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Acceleration</div>
                  <div className="text-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {Math.abs(atwoodState.acceleration).toFixed(2)} <span className="text-xs text-slate-400">m/s²</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Tension 1</div>
                  <div className="text-base font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {atwoodState.tension1.toFixed(1)} <span className="text-xs text-slate-400">N</span>
                  </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Velocity</div>
                  <div className="text-base font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {Math.abs(atwoodState.velocity).toFixed(2)} <span className="text-xs text-slate-400">m/s</span>
                  </div>
                </div>
             </>
           ) : (
             <>
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Load Velocity</div>
                  <div className="text-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {sandboxState.loadVelocity.toFixed(2)} <span className="text-xs text-slate-400">m/s</span>
                  </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Mass</div>
                  <div className="text-base font-mono text-slate-700 dark:text-slate-200 font-bold">
                    {totalMass.toFixed(1)} <span className="text-xs text-slate-400">kg</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">System Efficiency</div>
                  <div className="text-base font-mono text-orange-600 dark:text-orange-400 font-bold">
                    {(Math.pow(1 - sandboxState.friction, sandboxState.fixedPulleys.length + sandboxState.movablePulleys.length) * 100).toFixed(0)} <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Mech. Advantage</div>
                  <div className="text-base font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {sandboxState.fixedPulleys.length + sandboxState.movablePulleys.length}:1
                  </div>
                </div>
             </>
           )}
        </div>

        {/* Energy Analysis Section */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
             <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-amber-500" fill="currentColor" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Energy Analysis (Joules)</h3>
             </div>
             
             <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                {/* Potential Energy */}
                <div>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">Potential (PE)</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{energy.pe.toFixed(1)} J</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (energy.pe / maxEnergyBar) * 100)}%` }} />
                   </div>
                </div>

                {/* Kinetic Energy */}
                <div>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">Kinetic (KE)</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{energy.ke.toFixed(1)} J</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.min(100, (energy.ke / maxEnergyBar) * 100)}%` }} />
                   </div>
                </div>

                {/* Total Energy */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                   <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Total Energy</span>
                      <span className="font-mono text-slate-800 dark:text-slate-100">{energy.total.toFixed(1)} J</span>
                   </div>
                </div>
             </div>
        </div>

        {/* Charts Container */}
        <div className="flex-1 p-3 flex flex-col gap-4 bg-white dark:bg-slate-900 min-h-0">
            {/* Chart 1: Velocity */}
            <div className="flex-1 relative border border-slate-100 dark:border-slate-800 rounded-lg p-2 min-h-[150px]">
                <h3 className="absolute top-2 left-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 z-10 uppercase">Velocity vs Time</h3>
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" tick={{fontSize: 9, fill: textColor}} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tick={{fontSize: 9, fill: textColor}} tickLine={false} axisLine={false} width={30} allowDecimals={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{fontSize: '11px', borderRadius: '4px', padding: '4px', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#ccc', color: theme === 'dark' ? '#f1f5f9' : '#000'}} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeOpacity={0.5} />
                    <Area type="monotone" dataKey="velocity" stroke="#3b82f6" fill={theme === 'dark' ? '#1d4ed8' : '#eff6ff'} fillOpacity={theme === 'dark' ? 0.2 : 1} strokeWidth={2} isAnimationActive={false} dot={false} />
                </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2: Position */}
            <div className="flex-1 relative border border-slate-100 dark:border-slate-800 rounded-lg p-2 min-h-[150px]">
                <h3 className="absolute top-2 left-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 z-10 uppercase">Position (Y) vs Time</h3>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" tick={{fontSize: 9, fill: textColor}} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis tick={{fontSize: 9, fill: textColor}} tickLine={false} axisLine={false} width={30} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{fontSize: '11px', borderRadius: '4px', padding: '4px', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#ccc', color: theme === 'dark' ? '#f1f5f9' : '#000'}} />
                    <Line type="monotone" dataKey="position" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};
