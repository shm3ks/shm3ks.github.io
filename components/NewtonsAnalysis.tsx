
import React from 'react';
import { AtwoodState, SandboxState, SimulationType } from '../types';
import { GRAVITY, FRICTION_SCALE } from '../constants';
import { Sigma, ArrowDown, ArrowUp, Minus, Equal } from 'lucide-react';

interface Props {
  type: SimulationType;
  atwoodState: AtwoodState;
  sandboxState: SandboxState;
  isComplexAtwood: boolean;
}

export const NewtonsAnalysis: React.FC<Props> = ({ type, atwoodState, sandboxState, isComplexAtwood }) => {
  
  // Variables for display
  let positiveForces: { label: string, sub: string, value: number, note?: string }[] = [];
  let negativeForces: { label: string, sub: string, value: number, note?: string }[] = [];
  let frictionVal = 0;
  let netForce = 0;
  
  let massTerms: { label: string, value: number }[] = [];
  let totalInertia = 0;
  let acceleration = 0;

  const isAtwood = type === SimulationType.ATWOOD && !isComplexAtwood;
  const fmt = (n: number) => n.toFixed(2);

  if (isAtwood) {
    const { mass1, mass2, pulleyMass, frictionCoeff, velocity } = atwoodState;
    
    // 1. Define direction based on mass difference (standard textbook approach)
    // Let's assume M2 > M1 is the "Positive" direction (Clockwise / Right Down)
    // If M1 > M2, the "Driving" force becomes negative relative to M2, or we flip the frame.
    // To keep it simple: "Driving Force" is the heavier mass, "Resisting Force" is the lighter mass.
    
    const w1 = mass1 * GRAVITY;
    const w2 = mass2 * GRAVITY;
    
    // Determine primary direction
    // If masses are equal, no drive.
    const rawDiff = w2 - w1;
    const directionSign = Math.sign(rawDiff) || 1; // Default to 1 if 0
    
    // Force Analysis
    // Positive Force: The weight pulling in the direction of potential motion
    if (directionSign > 0) {
        positiveForces.push({ label: 'Weight', sub: '2', value: w2, note: '(m₂g)' });
        negativeForces.push({ label: 'Weight', sub: '1', value: w1, note: '(m₁g)' });
    } else {
        positiveForces.push({ label: 'Weight', sub: '1', value: w1, note: '(m₁g)' });
        negativeForces.push({ label: 'Weight', sub: '2', value: w2, note: '(m₂g)' });
    }

    // Friction Analysis
    // Friction always opposes velocity. If v=0, it opposes the Net Driving Force.
    const totalNormalForce = (w1 + w2); // Simplified proportional friction
    const maxFriction = frictionCoeff * totalNormalForce * FRICTION_SCALE;
    
    // Determine friction direction
    let currentFriction = 0;
    if (Math.abs(velocity) > 0.001) {
        // Kinetic: Opposes velocity
        // If velocity matches directionSign (moving with drive), friction is negative.
        // If velocity opposes directionSign (swinging back), friction is positive relative to drive? 
        // Let's stick to: Net Force = Drive - Resist - Friction(opposing motion)
        // Since we structured Pos/Neg forces based on Drive, friction opposes Drive unless moving backwards.
        
        const velSign = Math.sign(velocity);
        // If moving in direction of Drive (velSign == directionSign), friction subtracts.
        if (velSign === directionSign) {
            currentFriction = maxFriction;
        } else {
            // Moving against drive? Then friction actually helps the drive (opposes motion)
            // But usually we just subtract absolute friction from the magnitude of motion
             currentFriction = -maxFriction; 
        }
    } else {
        // Static
        const driveMagnitude = Math.abs(rawDiff);
        if (driveMagnitude <= maxFriction) {
            currentFriction = driveMagnitude; // Exactly cancels drive
        } else {
            currentFriction = maxFriction;
        }
    }

    // If friction is "negative" in our list (opposing drive), we add it to negative forces list
    // If we calculated it as helping (rare), we'd handle differently. 
    // Simplified: It's a loss.
    frictionVal = currentFriction;
    
    // Net Force
    const driveForce = Math.abs(rawDiff);
    netForce = driveForce - frictionVal;
    // Apply sign back to netForce for display if M1 was heavier
    if (directionSign < 0) netForce *= -1;

    // Inertia Analysis
    const pulleyInertia = 0.5 * pulleyMass; // I/R^2 for disk
    massTerms.push({ label: 'Mass 1', value: mass1 });
    massTerms.push({ label: 'Mass 2', value: mass2 });
    massTerms.push({ label: 'Pulley (I/R²)', value: pulleyInertia });
    
    totalInertia = mass1 + mass2 + pulleyInertia;
    acceleration = netForce / totalInertia; // Signed acceleration

  } else {
    // --- Sandbox Mode ---
    const { effortForce, loads, movablePulleys, friction, loadVelocity } = sandboxState;
    
    // 1. Calculate Load Resistance
    // Total mass of objects being lifted
    const pulleyMassProxy = 2.0; // Estimate
    const totalLoadMass = loads.reduce((s, l) => s + l.mass, 0) + (movablePulleys.length * pulleyMassProxy);
    const totalLoadWeight = totalLoadMass * GRAVITY;
    
    // 2. Mechanical Advantage
    const ma = movablePulleys.length > 0 ? movablePulleys.length * 2 : 1;
    
    // 3. Forces
    // Input: The user's pull (Effort)
    positiveForces.push({ label: 'Effort', sub: 'pull', value: effortForce });
    
    // Resistance: Scaled Weight
    const scaledLoad = totalLoadWeight / ma;
    negativeForces.push({ label: 'Load', sub: 'scaled', value: scaledLoad, note: `(${fmt(totalLoadWeight)}N / ${ma})` });

    // Friction
    const systemWeight = totalLoadWeight + effortForce;
    const numComponents = (sandboxState.fixedPulleys.length + movablePulleys.length) || 1;
    const maxFriction = friction * systemWeight * FRICTION_SCALE * numComponents;
    
    let currentFriction = 0;
    const rawDrive = effortForce - scaledLoad;
    
    if (Math.abs(loadVelocity) > 0.01) {
        currentFriction = maxFriction * Math.sign(loadVelocity);
        // If moving UP (positive vel), friction acts DOWN (subtracts from effort)
        // If moving DOWN (neg vel), friction acts UP (adds to effort/resists gravity)
        // Our 'NetForce' logic usually assumes Effort is positive.
        // Let's simplify: Friction is a generic loss term magnitude for the breakdown
        frictionVal = maxFriction; 
    } else {
         frictionVal = Math.abs(rawDrive) < maxFriction ? Math.abs(rawDrive) : maxFriction;
    }

    // Net
    // Usually: Net = Effort - ScaledLoad - Friction
    // But if ScaledLoad > Effort, Net = Effort - ScaledLoad + Friction (resists falling)
    // We will display Magnitude of loss for simplicity in UI
    
    const dir = Math.sign(rawDrive) || 1;
    netForce = rawDrive - (frictionVal * dir); 
    
    // Inertia
    // Effective Mass = Mass_Drive + (Mass_Load / MA^2) + I_terms
    // Simplify display
    const effectiveLoadInertia = totalLoadMass / (ma * ma);
    massTerms.push({ label: 'Eff. Load Mass', value: effectiveLoadInertia });
    massTerms.push({ label: 'Drive Inertia', value: 1.0 }); // Hardcoded "rope/hand" inertia from engine
    
    totalInertia = effectiveLoadInertia + 1.0;
    acceleration = netForce / totalInertia;
  }

  const netForceColor = Math.abs(netForce) < 0.01 ? "text-slate-400" : (netForce * Math.sign(acceleration || 1) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400");

  return (
    <div className="absolute bottom-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-tl-2xl border-t border-l border-slate-200 dark:border-slate-700 shadow-2xl w-80 z-10 transition-all max-h-[60vh] overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-md text-indigo-600 dark:text-indigo-300">
              <Sigma size={16} />
          </div>
          <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Newton's Second Law</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">F_net = m_total × a</p>
          </div>
      </div>

      {/* 1. Forces Breakdown */}
      <div className="mb-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">1. Sum of Forces (ΣF)</h4>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 p-2 space-y-1">
            
            {/* Positive Forces */}
            {positiveForces.map((f, i) => (
                <div key={`pos-${i}`} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <ArrowUp size={12} strokeWidth={3} />
                        <span className="font-medium">{f.label}<sub>{f.sub}</sub></span>
                        {f.note && <span className="text-[9px] opacity-70 ml-1 font-mono">{f.note}</span>}
                    </div>
                    <span className="font-mono font-bold">+{fmt(f.value)} N</span>
                </div>
            ))}

            {/* Negative Forces */}
            {negativeForces.map((f, i) => (
                <div key={`neg-${i}`} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <ArrowDown size={12} strokeWidth={3} />
                        <span className="font-medium">{f.label}<sub>{f.sub}</sub></span>
                        {f.note && <span className="text-[9px] opacity-70 ml-1 font-mono">{f.note}</span>}
                    </div>
                    <span className="font-mono font-bold">-{fmt(f.value)} N</span>
                </div>
            ))}

            {/* Friction */}
            <div className="flex justify-between items-center text-xs opacity-80">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Minus size={10} />
                    <span className="font-medium">Friction Loss</span>
                </div>
                <span className="font-mono">-{fmt(frictionVal)} N</span>
            </div>

            {/* Net Force Result */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Net Force (ΣF)</span>
                <div className="flex items-center gap-1">
                     <Equal size={10} className="text-slate-400" />
                     <span className={`text-sm font-mono font-black ${netForceColor}`}>{fmt(Math.abs(netForce))} N</span>
                     {netForce !== 0 && (
                         <ArrowDown size={12} className={netForce > 0 ? "rotate-180 text-emerald-500" : "text-amber-500"} />
                     )}
                </div>
            </div>
        </div>
      </div>

      {/* 2. Inertia Breakdown */}
      <div className="mb-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">2. Total Inertia (m)</h4>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800 p-2 space-y-1">
             {massTerms.map((m, i) => (
                 <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                     <span>{m.label}</span>
                     <span className="font-mono">{fmt(m.value)} kg</span>
                 </div>
             ))}
             <div className="border-t border-slate-200 dark:border-slate-700 mt-1 pt-1 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                 <span>Total Mass</span>
                 <span className="font-mono">{fmt(totalInertia)} kg</span>
             </div>
        </div>
      </div>

      {/* 3. Final Calculation */}
      <div className={`p-3 rounded-lg border ${Math.abs(acceleration) > 0.01 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
         <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Acceleration (a = ΣF / m)</span>
         </div>
         <div className="flex items-center justify-between font-mono">
             <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                 <span>{fmt(Math.abs(netForce))}</span>
                 <span className="text-slate-300">/</span>
                 <span>{fmt(totalInertia)}</span>
                 <span className="text-slate-300">=</span>
             </div>
             <div className={`text-xl font-black ${Math.abs(acceleration) > 0.01 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                 {fmt(Math.abs(acceleration))} <span className="text-xs font-normal text-slate-500">m/s²</span>
             </div>
         </div>
      </div>

    </div>
  );
};
