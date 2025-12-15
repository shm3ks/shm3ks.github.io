
import React from 'react';
import { AtwoodState, SandboxState, SimulationType } from '../types';
import { GRAVITY, FRICTION_SCALE } from '../constants';
import { Sigma } from 'lucide-react';

interface Props {
  type: SimulationType;
  atwoodState: AtwoodState;
  sandboxState: SandboxState;
  isComplexAtwood: boolean;
}

export const NewtonsAnalysis: React.FC<Props> = ({ type, atwoodState, sandboxState, isComplexAtwood }) => {
  
  let drivingForce = 0;
  let frictionForce = 0;
  let netForce = 0;
  let totalInertia = 0;
  let acceleration = 0;
  let pulleyEffectiveMass = 0;
  
  const isAtwood = type === SimulationType.ATWOOD && !isComplexAtwood;

  // Logic to populate variables based on mode
  if (isAtwood) {
    const { mass1, mass2, pulleyMass, frictionCoeff, velocity } = atwoodState;
    
    // Atwood: Driving Force is the difference in weight
    // We define "Positive" direction as Mass 2 moving DOWN (standard Atwood convention in this app)
    const f1 = mass1 * GRAVITY;
    const f2 = mass2 * GRAVITY;
    
    drivingForce = f2 - f1; // Can be negative if m1 > m2
    
    const totalWeight = f1 + f2;
    // Explicit 0 check
    frictionForce = frictionCoeff > 0 
        ? frictionCoeff * totalWeight * FRICTION_SCALE
        : 0;
    
    // Friction opposes motion. If not moving, it opposes potential motion (driving force).
    const direction = Math.abs(velocity) > 0.001 ? Math.sign(velocity) : Math.sign(drivingForce);
    
    // Net Force calculation
    if (Math.abs(velocity) > 0.001) {
       // Kinetic
       netForce = drivingForce - (direction * frictionForce);
    } else {
       // Static
       if (Math.abs(drivingForce) <= frictionForce) {
           netForce = 0;
       } else {
           netForce = drivingForce - (direction * frictionForce);
       }
    }

    // Inertia: mass1 + mass2 + (I / R^2)
    // For a solid disk, I/R^2 = 0.5 * pulleyMass
    pulleyEffectiveMass = 0.5 * pulleyMass;
    totalInertia = mass1 + mass2 + pulleyEffectiveMass;
    acceleration = netForce / totalInertia;

  } else {
    // Sandbox / Complex Mode
    const { effortForce, friction, fixedPulleys, movablePulleys, loads, loadVelocity } = sandboxState;
    const numPulleys = fixedPulleys.length + movablePulleys.length;

    // 1. Calculate Mass & Gravity loads
    const pulleyMassProxy = 2; 
    const loadMassTotal = loads.reduce((s, l) => s + l.mass, 0) + (movablePulleys.length * pulleyMassProxy);
    const loadWeight = loadMassTotal * GRAVITY;

    // 2. Mechanical Advantage (MA)
    const ma = movablePulleys.length > 0 ? movablePulleys.length * 2 : 1;

    // 3. Forces
    const fInput = effortForce;
    const fLoadScaled = loadWeight / ma;
    
    drivingForce = fInput - fLoadScaled; // This is the "Potential Drive" before friction

    // Friction
    const totalSystemWeight = loadWeight + effortForce;
    // Explicit 0 check
    frictionForce = friction > 0 
        ? friction * totalSystemWeight * FRICTION_SCALE * (numPulleys || 1)
        : 0;

    const direction = Math.abs(loadVelocity) > 0.01 ? Math.sign(loadVelocity) : Math.sign(drivingForce);

    // Net Force Logic
    if (Math.abs(loadVelocity) > 0.01) {
        netForce = drivingForce - (direction * frictionForce);
    } else {
        if (Math.abs(drivingForce) <= frictionForce) {
            netForce = 0;
        } else {
            netForce = drivingForce - (direction * frictionForce);
        }
    }

    // 4. Effective Inertia (The "Mass" in F=ma)
    const effectiveLoadMass = loadMassTotal / (ma * ma);
    totalInertia = effectiveLoadMass + 1.0; // +1.0 matches physicsEngine "EffectiveMass" constant offset

    acceleration = netForce / totalInertia;
  }

  // Formatting helper
  const fmt = (n: number) => n.toFixed(2);
  const fmtAbs = (n: number) => Math.abs(n).toFixed(2);

  // Color helpers based on values
  const netForceColor = Math.abs(netForce) < 0.01 ? "text-slate-400 dark:text-slate-500" : (netForce > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400");
  const accelColor = Math.abs(acceleration) < 0.01 ? "text-slate-400 dark:text-slate-500" : (acceleration > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400");

  return (
    <div className="absolute bottom-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-tl-2xl border-t border-l border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] w-72 z-10 transition-all">
      <div className="flex items-center gap-2 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1 rounded-md text-indigo-600 dark:text-indigo-300">
              <Sigma size={14} />
          </div>
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-xs">Newton's Second Law</h3>
      </div>

      <div className="space-y-2 font-mono text-[10px] text-slate-600 dark:text-slate-300">
          {/* Equation Row */}
          <div className="flex justify-center items-center bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 mb-2">
              {isAtwood ? (
                 <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 italic text-[11px]">
                    <span>a =</span>
                    <div className="flex flex-col items-center">
                        <span className="border-b border-indigo-300 dark:border-indigo-600 px-1 mb-0.5 leading-none">(m₂ - m₁)g</span>
                        <span className="leading-none">m₁ + m₂ + I/R²</span>
                    </div>
                 </div>
              ) : (
                 <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 italic text-sm">
                    <span>a =</span>
                    <div className="flex flex-col items-center">
                        <span className="border-b border-indigo-300 dark:border-indigo-600 px-1 mb-0.5 leading-none">ΣF</span>
                        <span className="leading-none">m</span>
                    </div>
                 </div>
              )}
          </div>

          {/* Forces Breakdown */}
          <div>
              <div className="flex justify-between mb-0.5">
                  <span title="Driving Force minus Load Resistance">Driving Force (ΔF):</span>
                  <span className={drivingForce >= 0 ? "text-slate-600 dark:text-slate-300" : "text-red-500 dark:text-red-400"}>{fmt(drivingForce)} N</span>
              </div>
              <div className="flex justify-between mb-0.5">
                  <span>Friction Force (f):</span>
                  <span className="text-amber-600 dark:text-amber-400">-{fmtAbs(frictionForce)} N</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 border-t border-slate-100 dark:border-slate-700 pt-0.5 mt-0.5">
                  <span>Net Force (ΣF):</span>
                  <span className={netForceColor}>
                      {fmt(netForce)} N
                  </span>
              </div>
          </div>

          {/* Mass Breakdown */}
          <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
              {isAtwood && (
                <div className="flex justify-between text-[9px] text-slate-500 dark:text-slate-400 pl-2 border-l-2 border-slate-200 dark:border-slate-700 ml-1 mb-1">
                    <span>+ Pulley Inertia (I/R²):</span>
                    <span>{fmt(pulleyEffectiveMass)} kg</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 pt-0.5 mt-0.5">
                  <span title="Effective Inertial Mass of the System">Total Inertia (m):</span>
                  <span>{fmt(totalInertia)} kg</span>
              </div>
          </div>

          {/* Final Calculation */}
          <div className={`mt-2 p-1.5 rounded flex justify-between items-center border ${Math.abs(acceleration) > 0.01 ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-[9px] uppercase">Result (a):</span>
              <div className="flex items-center gap-1.5">
                   <span className="text-slate-500 dark:text-slate-400">{fmt(netForce)} / {fmt(totalInertia)} = </span>
                   <span className={`text-sm font-bold ${accelColor}`}>{fmt(acceleration)}</span>
                   <span className="text-[9px] text-slate-500 dark:text-slate-400">m/s²</span>
              </div>
          </div>
      </div>
    </div>
  );
};
