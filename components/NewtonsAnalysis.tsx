import React from 'react';
import { AtwoodState, SandboxState, SimulationType } from '../types';
import { GRAVITY, FRICTION_SCALE } from '../constants';
import { Sigma, Equal, Info, Undo2, Redo2 } from 'lucide-react';

interface Props {
  type: SimulationType;
  atwoodState: AtwoodState;
  sandboxState: SandboxState;
  isComplexAtwood: boolean;
}

export const NewtonsAnalysis: React.FC<Props> = ({ type, atwoodState, sandboxState, isComplexAtwood }) => {
  
  let drivingForces: { label: string, sub: string, value: number, note?: string }[] = [];
  let opposingForces: { label: string, sub: string, value: number, note?: string }[] = [];
  let frictionVal = 0;
  let netForce = 0;
  
  let massTerms: { label: string, value: number }[] = [];
  let totalInertia = 0;
  let acceleration = 0;

  const isAtwood = type === SimulationType.ATWOOD && !isComplexAtwood;
  const isSandbox = type === SimulationType.SANDBOX || isComplexAtwood;
  const fmt = (n: number) => n.toFixed(2);

  // Определение "Положительного" направления
  const atwoodDirection = atwoodState.mass2 >= atwoodState.mass1 ? 'clockwise' : 'counter-clockwise';

  if (isAtwood) {
    const { mass1, mass2, pulleyMass, frictionCoeff, velocity } = atwoodState;
    const w1 = mass1 * GRAVITY;
    const w2 = mass2 * GRAVITY;
    
    if (atwoodDirection === 'clockwise') {
        drivingForces.push({ label: 'Weight 2', sub: 'pull', value: w2, note: '(m₂g)' });
        opposingForces.push({ label: 'Weight 1', sub: 'resist', value: w1, note: '(m₁g)' });
    } else {
        drivingForces.push({ label: 'Weight 1', sub: 'pull', value: w1, note: '(m₁g)' });
        opposingForces.push({ label: 'Weight 2', sub: 'resist', value: w2, note: '(m₂g)' });
    }

    const totalNormalForce = (w1 + w2);
    const maxFriction = frictionCoeff * totalNormalForce * FRICTION_SCALE;
    
    frictionVal = maxFriction;
    if (Math.abs(velocity) < 0.001) {
        const staticDrive = Math.abs(w2 - w1);
        frictionVal = Math.min(staticDrive, maxFriction);
    }

    netForce = Math.abs(w2 - w1) - frictionVal;
    
    const pulleyInertia = 0.5 * pulleyMass;
    massTerms.push({ label: 'Load 1', value: mass1 });
    massTerms.push({ label: 'Load 2', value: mass2 });
    massTerms.push({ label: 'Pulley Inertia', value: pulleyInertia });
    
    totalInertia = mass1 + mass2 + pulleyInertia;
    acceleration = netForce / totalInertia;

  } else {
    const { effortForce, loads, movablePulleys, friction } = sandboxState;
    
    // Check if empty
    const isEmpty = loads.length === 0 && movablePulleys.length === 0;

    if (!isEmpty) {
        const totalLoadMass = loads.reduce((s, l) => s + l.mass, 0) + (movablePulleys.length * 2.0);
        const totalLoadWeight = totalLoadMass * GRAVITY;
        const ma = movablePulleys.length > 0 ? movablePulleys.length * 2 : 1;
        
        const scaledLoad = totalLoadWeight / ma;

        drivingForces.push({ label: 'Effort', sub: 'input', value: effortForce });
        opposingForces.push({ label: 'Load', sub: 'scaled', value: scaledLoad, note: `(m·g / ${ma})` });

        frictionVal = friction * (totalLoadWeight + effortForce) * FRICTION_SCALE;
        netForce = effortForce - scaledLoad;
        if (Math.abs(netForce) < frictionVal) {
            frictionVal = Math.abs(netForce);
            netForce = 0;
        } else {
            netForce -= Math.sign(netForce) * frictionVal;
        }

        const effInertia = totalLoadMass / (ma * ma);
        massTerms.push({ label: 'System Inertia', value: effInertia + 1.0 });
        totalInertia = effInertia + 1.0;
        acceleration = netForce / totalInertia;
    } else {
        drivingForces = [];
        opposingForces = [];
        massTerms = [];
        totalInertia = 0;
        acceleration = 0;
    }
  }

  const isSystemEmpty = isSandbox && sandboxState.loads.length === 0 && sandboxState.movablePulleys.length === 0;

  return (
    <div className={`absolute bottom-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-tl-2xl border-l border-t border-slate-200 dark:border-slate-700 shadow-2xl z-10 transition-all h-fit max-h-[85%] overflow-y-auto custom-scrollbar ${isSystemEmpty ? 'w-80 p-5' : 'w-64 p-3.5'}`}>
      
      {/* Header with Context */}
      <div className={`border-b border-slate-100 dark:border-slate-800 ${isSystemEmpty ? 'mb-4 pb-3' : 'mb-3 pb-2'}`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 ${isSystemEmpty ? 'text-sm' : 'text-xs'}`}>
                <Sigma size={isSystemEmpty ? 18 : 16} className="text-indigo-500" />
                DYNAMICS
            </h3>
            {!isSystemEmpty && (
                <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter ${atwoodDirection === 'clockwise' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {isSandbox ? 'Linear' : atwoodDirection} (+)
                </div>
            )}
          </div>
          {isSystemEmpty && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-tight">
              Force sign (+/-) depends on the reference direction along the rope.
            </p>
          )}
      </div>

      {isSystemEmpty ? (
        <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl mb-4">
            <Info size={24} className="text-slate-200 dark:text-slate-700 mb-2" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Idle</span>
            <span className="text-[9px] text-slate-400 mt-1">Add loads or pulleys to analyze</span>
        </div>
      ) : (
        <>
            {/* 1. Sum of Forces Breakdown */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">1. Forces (ΣF)</h4>
                </div>

                <div className="space-y-1.5">
                    {/* Driving Forces Group */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-1.5 border border-emerald-100/50 dark:border-emerald-800/30">
                        <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">
                            <Redo2 size={10} /> Drive (+)
                        </div>
                        {drivingForces.length > 0 ? drivingForces.map((f, i) => (
                            <div key={`drv-${i}`} className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-600 dark:text-slate-300 font-medium">{f.label}<sub className="opacity-70">{f.sub}</sub></span>
                                <span className="font-mono font-bold text-emerald-600">+{fmt(f.value)}</span>
                            </div>
                        )) : <div className="text-[9px] text-slate-400 italic">No driving</div>}
                    </div>

                    {/* Opposing Forces Group */}
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-1.5 border border-amber-100/50 dark:border-amber-800/30">
                        <div className="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1 flex items-center gap-1">
                            <Undo2 size={10} /> Resist (-)
                        </div>
                        {opposingForces.length > 0 ? opposingForces.map((f, i) => (
                            <div key={`opp-${i}`} className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-600 dark:text-slate-300 font-medium">{f.label}<sub className="opacity-70">{f.sub}</sub></span>
                                <span className="font-mono font-bold text-amber-600">-{fmt(f.value)}</span>
                            </div>
                        )) : <div className="text-[9px] text-slate-400 italic">No resistance</div>}
                        {frictionVal > 0 && (
                            <div className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-amber-200/30">
                                <span className="text-slate-500 italic">Friction</span>
                                <span className="font-mono text-amber-500">-{fmt(frictionVal)}</span>
                            </div>
                        )}
                    </div>

                    {/* Net Force Footer */}
                    <div className="px-1 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase">ΣF</span>
                        <div className="flex items-center gap-1">
                            <Equal size={10} className="text-slate-400" />
                            <span className={`text-sm font-mono font-black ${Math.abs(netForce) < 0.01 ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {fmt(netForce)} N
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Total Inertia */}
            <div className="mb-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">2. Mass (m)</h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 p-2">
                    <div className="border-slate-200 dark:border-slate-700 flex justify-between items-center text-[11px] font-black text-slate-800 dark:text-slate-200">
                        <span>Total Inertia</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">{fmt(totalInertia)} kg</span>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* 3. Acceleration Result */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative transition-colors duration-300 ${isSystemEmpty ? 'p-4' : 'p-3'}`}>
         <div className="absolute top-0 right-0 p-1 opacity-[0.05] dark:opacity-10 pointer-events-none">
            <Sigma size={isSystemEmpty ? 40 : 30} className="text-indigo-600 dark:text-white" />
         </div>
         <div className="relative z-10">
             <div className="text-[9px] font-bold text-indigo-600 dark:text-slate-400 uppercase mb-1.5">a = ΣF / m</div>
             <div className="flex items-end justify-between">
                <div className="font-mono">
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">{fmt(netForce)}</div>
                    <div className="h-[1px] bg-slate-200 dark:bg-white/30 my-0.5" />
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">{fmt(totalInertia || 1)}</div>
                </div>
                <div className={`font-black text-indigo-600 dark:text-white tracking-tighter leading-none ${isSystemEmpty ? 'text-3xl' : 'text-2xl'}`}>
                    {fmt(Math.abs(acceleration))} <span className="text-[9px] font-normal text-slate-400 opacity-60">m/s²</span>
                </div>
             </div>
         </div>
      </div>

    </div>
  );
};