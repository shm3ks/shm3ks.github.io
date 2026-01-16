import { AtwoodState, SandboxState, LoadObject, Pulley, RealityMode } from '../types';
import { GRAVITY, METERS_TO_PIXELS, FRICTION_SCALE, AIR_RESISTANCE_SCALE } from '../constants';

/**
 * Calculates the next state for an Atwood machine including rotational inertia and friction.
 */
export const updateAtwoodPhysics = (
  state: AtwoodState,
  dt: number,
  mode: RealityMode = RealityMode.IDEAL
): AtwoodState => {
  // If Broken, Free Fall Logic
  if (state.isBroken) {
      // Just gravity, no rope constraint
      let v1 = state.velocity + (GRAVITY * dt); 
      let v2 = state.velocity + (GRAVITY * dt); 
      
      // Apply drag to falling broken objects too
      if (mode === RealityMode.REAL) {
          const drag = 0.5 * state.airResistance * (v1 * v1) * AIR_RESISTANCE_SCALE;
          v1 -= (drag / state.mass1) * dt;
          v2 -= (drag / state.mass2) * dt;
      }
      
      let newY1 = state.y1 + (v1 * dt * 0.5); // Slow drift visualization
      let newY2 = state.y2 + (v2 * dt * 0.5); 
      
      if (newY1 > 4.5) newY1 = 4.5;
      if (newY2 > 4.5) newY2 = 4.5;
      
      return { 
          ...state, 
          y1: newY1, y2: newY2, 
          tension1: 0, tension2: 0, 
          velocity: 0, acceleration: 0 
      };
  }

  const { mass1, mass2, pulleyMass, velocity, y1, frictionCoeff } = state;
  const ropeLen = state.totalRopeLength || 5.0; // Use dynamic rope length

  // --- Rotational Inertia Term (I / R^2) ---
  const effectivePulleyInertiaMass = 0.5 * pulleyMass;

  const drivingForce = (mass2 - mass1) * GRAVITY;
  
  // --- Centering Logic ---
  let centeringForce = 0;
  const massDiff = Math.abs(mass2 - mass1);
  const isBalanced = massDiff < 0.001; 

  if (isBalanced) {
      const targetY = ropeLen / 2; 
      const dist = targetY - y1;
      centeringForce = -dist * (mass1 + mass2) * 5.0; 
  }

  // Friction
  const frictionForce = frictionCoeff > 0 
    ? frictionCoeff * (mass1 + mass2) * GRAVITY * FRICTION_SCALE
    : 0;
  
  let netForce = drivingForce + centeringForce;
  
  // Apply Friction
  if (Math.abs(velocity) > 0.001) {
    netForce -= Math.sign(velocity) * frictionForce;
  } else {
    if (Math.abs(netForce) <= frictionForce) {
      netForce = 0;
    } else {
      netForce -= Math.sign(netForce) * frictionForce;
    }
  }

  // --- Real Life: Air Resistance ---
  if (mode === RealityMode.REAL && Math.abs(velocity) > 0.001) {
      const dragMagnitude = (state.airResistance * AIR_RESISTANCE_SCALE) * (velocity * velocity);
      const dragForce = Math.sign(velocity) * dragMagnitude;
      netForce -= dragForce;
  }

  // Calculate Acceleration
  const totalInertialMass = mass1 + mass2 + effectivePulleyInertiaMass;
  let acceleration = netForce / totalInertialMass;
  let newVelocity = velocity + acceleration * dt;
  
  // Zero-crossing / Stiction check
  if (Math.abs(velocity) > 0.001 && Math.sign(newVelocity) !== Math.sign(velocity)) {
      if (Math.abs(netForce) <= frictionForce) {
          newVelocity = 0;
          acceleration = 0;
      }
  }

  if (isBalanced) {
      newVelocity *= 0.90; 
  }

  let newY1 = y1 - newVelocity * dt; 
  
  if (newY1 < 0.2) { 
    newY1 = 0.2;
    return { ...state, velocity: 0, acceleration: 0, y1: 0.2, y2: ropeLen - 0.2 }; 
  }
  if (newY1 > ropeLen - 0.2) { 
     newY1 = ropeLen - 0.2;
     return { ...state, velocity: 0, acceleration: 0, y1: ropeLen - 0.2, y2: 0.2 };
  }

  const tension1 = mass1 * (GRAVITY + acceleration);
  const tension2 = mass2 * (GRAVITY - acceleration);
  
  let isBroken = false;
  if (mode === RealityMode.REAL) {
      if (tension1 > state.ropeMaxTension || tension2 > state.ropeMaxTension) {
          isBroken = true;
      }
  }

  const angularVelocity = newVelocity / state.pulleyRadius;

  return {
    ...state,
    y1: newY1,
    y2: (ropeLen - newY1), 
    velocity: newVelocity,
    acceleration,
    tension1,
    tension2,
    angularVelocity,
    isBroken,
    time: state.time + dt
  };
};

/**
 * Calculates Sandbox (Block & Tackle) physics using a unified Lagrangian dynamics approach.
 */
export const updateSandboxPhysics = (
  state: SandboxState,
  dt: number,
  mode: RealityMode = RealityMode.IDEAL
): SandboxState => {
  // BUG FIX: If there are no loads and no movable pulleys, the system is inert.
  if (state.loads.length === 0 && state.movablePulleys.length === 0) {
    return {
      ...state,
      loadVelocity: 0,
      loadAcceleration: 0,
      isBroken: false
    };
  }

  if (state.isDragging) return state; 
  
  const floorY = 550; 

  // --- 1. System Topology Analysis ---
  const movableIds = state.movablePulleys.map(p => p.id);
  const fixedIds = state.fixedPulleys.map(p => p.id);
  const anchorIds = state.anchors.map(a => a.id);
  
  let loadGroupA: LoadObject[] = []; 
  let loadGroupB: LoadObject[] = []; 

  const isFixedOrAnchor = (id: string) => fixedIds.includes(id) || anchorIds.includes(id);
  const isMovable = (id: string) => movableIds.includes(id);

  if (movableIds.length > 0) {
      const findConnectedLoads = (startIds: string[], boundaryCheck: (neighborId: string) => boolean): LoadObject[] => {
          const result: LoadObject[] = [];
          const visited = new Set<string>(startIds);
          const queue = [...startIds];

          while (queue.length > 0) {
              const currId = queue.shift()!;
              const load = state.loads.find(l => l.id === currId);
              if (load && !result.includes(load)) result.push(load);

              state.ropeSegments.forEach(r => {
                  if (r.fromId === currId) {
                      const neighbor = r.toId;
                      if (!visited.has(neighbor)) {
                          if (!boundaryCheck(neighbor)) {
                              visited.add(neighbor);
                              queue.push(neighbor);
                          }
                      }
                  }
                  if (r.toId === currId) {
                      const neighbor = r.fromId;
                      if (!visited.has(neighbor)) {
                          if (!boundaryCheck(neighbor)) {
                              visited.add(neighbor);
                              queue.push(neighbor);
                          }
                      }
                  }
              });
          }
          return result;
      };

      loadGroupA = findConnectedLoads(movableIds, (nid) => isFixedOrAnchor(nid));
      const groupAIds = loadGroupA.map(l => l.id);
      const allFixedPointIds = [...fixedIds, ...anchorIds];
      const loadsConnectedToFixed = findConnectedLoads(allFixedPointIds, (nid) => isMovable(nid));
      loadGroupB = loadsConnectedToFixed.filter(l => !groupAIds.includes(l.id));

  } else {
      const getSide = (startLoadId: string): number => {
         const q = [startLoadId];
         const visited = new Set<string>();
         while(q.length > 0) {
             const curr = q.shift()!;
             if (visited.has(curr)) continue;
             visited.add(curr);
             const ropes = state.ropeSegments.filter(r => r.fromId === curr || r.toId === curr);
             for(const r of ropes) {
                 const other = r.fromId === curr ? r.toId : r.fromId;
                 if (fixedIds.includes(other)) {
                     const isTo = r.toId === other;
                     const side = isTo ? r.toSide : r.fromSide;
                     if (side !== undefined) return side;
                     return -1;
                 }
                 if (state.loads.some(l => l.id === other)) q.push(other);
             }
         }
         return 0; 
      };
      const connectedLoads = state.loads.filter(l => 
          state.ropeSegments.some(r => r.fromId === l.id || r.toId === l.id)
      );
      connectedLoads.forEach(l => {
          const side = getSide(l.id);
          if (side === -1 || side === 0) loadGroupA.push(l);
          else if (side === 1) loadGroupB.push(l);
      });
  }

  // --- 2. System Forces & Acceleration ---
  const pulleyWeight = mode === RealityMode.IDEAL ? 0 : 0.1;
  const MassLoad = loadGroupA.reduce((sum, l) => sum + l.mass, 0) + (state.movablePulleys.length * pulleyWeight); 
  const MassCounter = loadGroupB.reduce((sum, l) => sum + l.mass, 0);
  
  const estimatedMA = state.movablePulleys.length > 0 ? 2 * state.movablePulleys.length : 1;

  let ForcePull = 0;
  let MassPullInertia = 0;

  if (MassCounter > 0) {
      ForcePull = MassCounter * GRAVITY;
      MassPullInertia = MassCounter;
  } else {
      if (loadGroupB.length === 0) {
         ForcePull = state.effortForce; 
         MassPullInertia = 0;
      }
  }

  const ForceLoad = MassLoad * GRAVITY;
  const totalWeight = ForceLoad + ForcePull;
  const numPulleys = state.fixedPulleys.length + state.movablePulleys.length;
  
  const frictionForce = state.friction > 0 
      ? state.friction * totalWeight * FRICTION_SCALE * (numPulleys || 1)
      : 0;

  let NetForce = ForcePull - (ForceLoad / estimatedMA);
  
  // --- Centering Logic ---
  let isBalanced = false;
  if (MassCounter > 0 && (loadGroupA.length > 0 || state.movablePulleys.length > 0)) {
      const driveImbalance = Math.abs(NetForce); 
      if (driveImbalance < 0.1) { 
          isBalanced = true;
          let avgY_A = 0;
          if (loadGroupA.length > 0) {
              avgY_A = loadGroupA.reduce((sum, l) => sum + l.y, 0) / loadGroupA.length;
          } else if (state.movablePulleys.length > 0) {
              avgY_A = state.movablePulleys.reduce((sum, p) => sum + p.y, 0) / state.movablePulleys.length;
          }

          let avgY_B = 0;
          if (loadGroupB.length > 0) {
               avgY_B = loadGroupB.reduce((sum, l) => sum + l.y, 0) / loadGroupB.length;
          }

          if (avgY_A > 0 && avgY_B > 0) {
               const yDiff = avgY_A - avgY_B;
               NetForce += yDiff * 0.1; 
          }
      }
  }

  // Apply Friction
  if (Math.abs(state.loadVelocity) > 0.01) {
      NetForce -= Math.sign(state.loadVelocity) * frictionForce;
  } else {
      if (Math.abs(NetForce) < frictionForce) NetForce = 0;
      else NetForce -= Math.sign(NetForce) * frictionForce;
  }
  
  if (mode === RealityMode.REAL && Math.abs(state.loadVelocity) > 0.01) {
      const dragMagnitude = (state.airResistance * AIR_RESISTANCE_SCALE * 2) * (state.loadVelocity * state.loadVelocity);
      const dragForce = Math.sign(state.loadVelocity) * dragMagnitude;
      NetForce -= dragForce;
  }

  const EffectiveMass = MassPullInertia + (MassLoad / (estimatedMA * estimatedMA)) + 1; 
  let acceleration = NetForce / EffectiveMass;

  if (state.isBroken) {
      acceleration = 0;
  }

  let newRopeVelocity = state.loadVelocity + acceleration * dt;
  
  if (isBalanced) {
      newRopeVelocity *= 0.95;
  }
  
  if (Math.abs(state.loadVelocity) > 0.01 && Math.sign(newRopeVelocity) !== Math.sign(state.loadVelocity)) {
      const staticDriveForce = ForcePull - (ForceLoad / estimatedMA);
      if (Math.abs(staticDriveForce) <= frictionForce) {
          newRopeVelocity = 0;
          acceleration = 0; 
      }
  }

  if (newRopeVelocity > 50) newRopeVelocity = 50;
  if (newRopeVelocity < -50) newRopeVelocity = -50;
  
  let deltaRope = newRopeVelocity * dt * METERS_TO_PIXELS; 

  // --- 4. Boundary Checks ---
  let dynamicCeilingY = 50;
  if (state.fixedPulleys.length > 0) {
      const lowestPulleyEdge = Math.max(...state.fixedPulleys.map(p => p.y + p.radius));
      dynamicCeilingY = lowestPulleyEdge + 5; 
  }
  const ceilingY = dynamicCeilingY;
  const dispA = -(deltaRope / estimatedMA); 
  const dispB = deltaRope;                  
  const itemsA: (LoadObject | Pulley)[] = [...loadGroupA, ...state.movablePulleys];
  let boundaryHit = false;

  if (!state.isBroken) {
      for (const item of itemsA) {
          const nextY = item.y + dispA;
          if (dispA < 0 && nextY < ceilingY) boundaryHit = true;
          if (dispA > 0 && nextY > floorY) boundaryHit = true;
      }
      for (const item of loadGroupB) {
          const nextY = item.y + dispB;
          if (dispB < 0 && nextY < ceilingY) boundaryHit = true;
          if (dispB > 0 && nextY > floorY) boundaryHit = true;
      }
      if (boundaryHit) {
          newRopeVelocity = 0;
          deltaRope = 0;
          acceleration = 0;
      }
  }

  // --- 5. Breakage Check ---
  let isBroken = state.isBroken;
  if (mode === RealityMode.REAL && !isBroken) {
      const staticTension = ForceLoad / estimatedMA;
      const dynamicTension = MassLoad * Math.abs(acceleration);
      const totalEstimatedTension = staticTension + dynamicTension + (frictionForce * 0.5);
      if (totalEstimatedTension > state.ropeMaxTension || ForcePull > state.ropeMaxTension) {
          isBroken = true;
      }
  }

  const finalDispA = boundaryHit || isBroken ? 0 : -(deltaRope / estimatedMA);
  const finalDispB = boundaryHit || isBroken ? 0 : deltaRope;
  const clamp = (val: number) => Math.max(ceilingY, Math.min(floorY, val));

  // --- 6. Update Movable Pulleys ---
  const updatedMovablePulleys = state.movablePulleys.map(p => {
      let nextY = p.y;
      if (isBroken) {
           nextY = Math.min(floorY, p.y + (100 * dt)); 
      } else {
           nextY = clamp(p.y + finalDispA);
      }
      let sumTargetX = 0;
      let count = 0;
      state.ropeSegments.forEach(r => {
           let otherId: string | null = null;
           let mySide = 0;
           let otherSide = 0;
           if (r.fromId === p.id) { otherId = r.toId; mySide = r.fromSide || 0; otherSide = r.toSide || 0; }
           else if (r.toId === p.id) { otherId = r.fromId; mySide = r.toSide || 0; otherSide = r.fromSide || 0; }

           if (otherId) {
               const otherFixed = state.fixedPulleys.find(fp => fp.id === otherId);
               const otherAnchor = state.anchors.find(a => a.id === otherId);
               const otherMovable = state.movablePulleys.find(mp => mp.id === otherId);
               let otherY = otherFixed?.y ?? otherAnchor?.y ?? otherMovable?.y ?? 9999;
               if (otherY < p.y) {
                   let anchorX = 0;
                   if (otherFixed) anchorX = otherFixed.x + (otherSide * (otherFixed.radius || 25));
                   else if (otherAnchor) anchorX = otherAnchor.x;
                   else if (otherMovable) anchorX = otherMovable.x + (otherSide * (otherMovable.radius || 25));
                   const targetCenter = anchorX - (mySide * (p.radius || 25));
                   sumTargetX += targetCenter;
                   count++;
               }
           }
      });
      let nextX = p.x;
      let nextVx = p.vx || 0;
      if (count > 0 && !isBroken) {
          const targetX = sumTargetX / count;
          const dx = targetX - p.x;
          const k = 1.2; 
          const forceX = k * dx;
          nextVx += forceX * dt;
          nextVx *= 0.95; 
          nextX += nextVx * dt * 5; 
      } else {
          nextVx *= 0.98;
          nextX += nextVx * dt;
      }
      return { ...p, x: nextX, y: nextY, vx: nextVx };
  });

  // --- 7. Update Loads ---
  const updatedLoads = state.loads.map(load => {
      const connectedRope = state.ropeSegments.find(r => r.fromId === load.id || r.toId === load.id);
      const isConnected = !!connectedRope && !isBroken;
      if (!isConnected) {
          let vy = (load.vy || 0);
          vy += GRAVITY * dt * 5; 
          if (mode === RealityMode.REAL) vy *= 0.99;
          let newY = load.y + (vy * dt * METERS_TO_PIXELS);
          if (newY >= floorY) {
              newY = floorY;
              vy = -vy * 0.3;
              if (Math.abs(vy) < 0.5) vy = 0;
              let newVx = load.vx * 0.9; 
              if (Math.abs(newVx) < 0.1) newVx = 0;
              return { ...load, y: newY, vy, vx: newVx, x: load.x + newVx * dt };
          }
          return { ...load, y: newY, vy, x: load.x + load.vx * dt };
      }
      let systemDispY = 0;
      if (loadGroupA.some(l => l.id === load.id)) systemDispY = finalDispA;
      else if (loadGroupB.some(l => l.id === load.id)) systemDispY = finalDispB;
      let newY = clamp(load.y + systemDispY);
      let pivotPoint: {x: number, y: number} | null = null;
      if (connectedRope) {
          const otherId = connectedRope.fromId === load.id ? connectedRope.toId : connectedRope.fromId;
          const otherFixed = state.fixedPulleys.find(p => p.id === otherId);
          const otherMovable = updatedMovablePulleys.find(p => p.id === otherId);
          const otherAnchor = state.anchors.find(a => a.id === otherId);
          let ropeSideAtPulley = 0;
          if (connectedRope.fromId === otherId) ropeSideAtPulley = connectedRope.fromSide || 0;
          else ropeSideAtPulley = connectedRope.toSide || 0;
          if (otherFixed) pivotPoint = { x: otherFixed.x + (ropeSideAtPulley * otherFixed.radius), y: otherFixed.y };
          else if (otherMovable) pivotPoint = { x: otherMovable.x + (ropeSideAtPulley * otherMovable.radius), y: otherMovable.y };
          else if (otherAnchor) pivotPoint = { x: otherAnchor.x, y: otherAnchor.y };
      }
      let newVx = load.vx;
      let newX = load.x;
      if (pivotPoint && newY > pivotPoint.y) {
          const dx = load.x - pivotPoint.x;
          const dy = load.y - pivotPoint.y;
          const length = Math.sqrt(dx*dx + dy*dy);
          if (length > 0) {
              const restoringAccelX = -(GRAVITY * 2.5) * (dx / length);
              newVx += restoringAccelX * dt;
              newVx *= 0.98; 
          }
      } else { newVx *= 0.90; }
      newX += newVx * dt * METERS_TO_PIXELS;
      return { ...load, y: newY, x: newX, vx: newVx, vy: 0 }; 
  });

  return {
    ...state,
    loadVelocity: isBroken ? 0 : newRopeVelocity,
    loadAcceleration: isBroken ? 0 : acceleration,
    loadPosition: state.loadPosition + (isBroken ? 0 : newRopeVelocity * dt), 
    movablePulleys: updatedMovablePulleys,
    loads: updatedLoads,
    isBroken
  };
};