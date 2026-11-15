import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

const CYCLE_FRAMES = 240;
const CRANK_R = 0.42;
const ROD_L = 1.48;
const CRANK_Y = -0.62;
const DEG = Math.PI / 180;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

// Valve events are specified in crank degrees for a 720-degree cycle.
// Intake: opens 10° BTDC overlap, closes 40° ABDC.
// Exhaust: opens 50° BBDC, closes 10° ATDC overlap.
function eventLift(crankDeg, open, close, maxLift = 0.115) {
  const a = ((crankDeg % 720) + 720) % 720;
  const span = close > open ? close - open : close + 720 - open;
  const p = ((a - open + 720) % 720) / span;
  if (p > 1) return 0;
  // Rounded cam ramps with a broad nose; zero lift at both ramps.
  const ramp = 0.16;
  const rise = smooth(p / ramp);
  const fall = smooth((1 - p) / ramp);
  return maxLift * Math.min(rise, fall);
}

function CylinderFin({ y, radius }) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.035, 8, 64]} />
      <meshStandardMaterial color="#8f9da7" metalness={0.82} roughness={0.3} />
    </mesh>
  );
}

function CamLobe({ x, angle, lift, color = "#c6a66b" }) {
  // A rounded eccentric cam profile, extruded along the camshaft axis.
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, 0.115, 0.115, 0, Math.PI * 2, false, 0);
  const geo = React.useMemo(() => new THREE.ShapeGeometry(shape, 48), []);
  return (
    <group position={[x, 2.47, 0.24]} rotation={[0, 0, angle]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={color} metalness={0.82} roughness={0.24} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.055, 0.025]} scale={[1, 1.35 + lift * 2, 0.55]}>
        <sphereGeometry args={[0.09, 24, 16]} />
        <meshStandardMaterial color={color} metalness={0.82} roughness={0.24} />
      </mesh>
    </group>
  );
}

function EngineModel({ crankDeg }) {
  const crank = crankDeg * DEG;
  const crankX = CRANK_R * Math.sin(crank);
  const crankPinY = CRANK_Y + CRANK_R * Math.cos(crank);
  const rodRise = Math.sqrt(ROD_L * ROD_L - crankX * crankX);
  const wristY = crankPinY + rodRise;
  const pistonY = wristY - 0.19;
  const rodAngle = Math.atan2(-crankX, rodRise);

  const intakeLift = eventLift(crankDeg, 710, 220);
  const exhaustLift = eventLift(crankDeg, 490, 730);
  const camDeg = (crankDeg / 2) * DEG;

  // Rocker angular displacement is derived from valve lift. The rocker,
  // valve and spring therefore move as one kinematic chain.
  const rockerAngleIn = -intakeLift * 1.7;
  const rockerAngleEx = exhaustLift * 1.7;

  return (
    <>
      <ambientLight intensity={0.72} />
      <hemisphereLight args={["#dce7ef", "#202a34", 1.1]} />
      <directionalLight position={[4, 6, 6]} intensity={2.2} color="#fff0d8" />
      <directionalLight position={[-5, 2, 3]} intensity={1.35} color="#9bbbd2" />
      <directionalLight position={[-3, 4, -5]} intensity={1.1} color="#6e9dbd" />

      {/* Cylinder barrel: partial shell leaves the piston and rod visible. */}
      <mesh position={[0, 0.92, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.61, 0.61, 1.55, 64, 1, true, 0.45, 4.9]} />
        <meshStandardMaterial color="#687985" metalness={0.72} roughness={0.34} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.535, 0.535, 1.54, 64, 1, true]} />
        <meshStandardMaterial color="#18232c" metalness={0.38} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <CylinderFin key={i} y={0.35 + i * 0.2} radius={0.68 + (i % 2) * 0.035} />
      ))}

      {/* Head and shallow combustion chamber. */}
      <mesh position={[0, 1.83, 0]}>
        <cylinderGeometry args={[0.72, 0.67, 0.34, 64]} />
        <meshStandardMaterial color="#344550" metalness={0.76} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.49, 0.49, 0.08, 48]} />
        <meshStandardMaterial color="#b28e58" metalness={0.55} roughness={0.4} />
      </mesh>

      {/* Piston crown, skirt and three rings. */}
      <mesh position={[0, pistonY, 0]}>
        <cylinderGeometry args={[0.505, 0.53, 0.39, 64]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.86} roughness={0.24} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, pistonY + 0.12 - i * 0.075, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.516, 0.014, 8, 64]} />
          <meshStandardMaterial color={i === 2 ? "#b58d4f" : "#d1d8dc"} metalness={0.88} roughness={0.22} />
        </mesh>
      ))}
      <mesh position={[0, wristY, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.9, 32]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Connecting rod, big-end and small-end. */}
      <mesh position={[crankX / 2, (crankPinY + wristY) / 2, 0.28]} rotation={[0, 0, rodAngle]}>
        <boxGeometry args={[0.105, ROD_L, 0.12]} />
        <meshStandardMaterial color="#b5a17b" metalness={0.84} roughness={0.25} />
      </mesh>
      <mesh position={[crankX, crankPinY, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.145, 0.145, 0.19, 40]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.88} roughness={0.22} />
      </mesh>
      <mesh position={[0, wristY, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.105, 0.027, 10, 40]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.88} roughness={0.22} />
      </mesh>

      {/* Crankshaft webs, crankpin and main journals. */}
      {[-0.24, 0.24].map((z) => (
        <group key={z} position={[0, CRANK_Y, z]} rotation={[0, 0, crank]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.12, 48]} />
            <meshStandardMaterial color="#354650" metalness={0.86} roughness={0.28} />
          </mesh>
          <mesh position={[0.13, 0.02, 0.01]}>
            <boxGeometry args={[0.25, 0.46, 0.12]} />
            <meshStandardMaterial color="#354650" metalness={0.86} roughness={0.28} />
          </mesh>
        </group>
      ))}
      <mesh position={[crankX, crankPinY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.095, 0.095, 0.58, 32]} />
        <meshStandardMaterial color="#d0b078" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, CRANK_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 1.05, 32]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.9} roughness={0.22} />
      </mesh>

      {/* Open crankcase section. */}
      <mesh position={[0, -0.95, -0.04]}>
        <boxGeometry args={[1.55, 0.64, 0.9]} />
        <meshStandardMaterial color="#202d36" metalness={0.66} roughness={0.4} transparent opacity={0.58} />
      </mesh>
      <mesh position={[0, -1.28, 0.05]}>
        <boxGeometry args={[1.75, 0.08, 1.05]} />
        <meshStandardMaterial color="#657782" metalness={0.72} roughness={0.32} />
      </mesh>

      {/* Intake and exhaust ports, cutaway tubes leading into the chamber. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.42, 1.78, 0.02]} rotation={[0, 0, side * -0.45]}>
          <mesh position={[side * 0.2, 0.12, 0]}>
            <cylinderGeometry args={[0.105, 0.13, 0.62, 32, 1, true]} />
            <meshStandardMaterial color={side < 0 ? "#568aa4" : "#b36b48"} metalness={0.45} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Two valves, springs and rocker arms. */}
      {[-1, 1].map((side) => {
        const lift = side < 0 ? intakeLift : exhaustLift;
        const valveX = side * 0.29;
        const valveY = 1.59 - lift;
        const rockerAngle = side < 0 ? rockerAngleIn : rockerAngleEx;
        return (
          <group key={side}>
            <mesh position={[valveX, 1.98 - lift / 2, 0.1]}>
              <cylinderGeometry args={[0.027, 0.027, 0.68 + lift, 20]} />
              <meshStandardMaterial color="#d1d8dc" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[valveX, valveY, 0.1]}>
              <cylinderGeometry args={[0.105, 0.105, 0.045, 32]} />
              <meshStandardMaterial color="#c6a66b" metalness={0.86} roughness={0.24} />
            </mesh>
            {Array.from({ length: 8 }, (_, j) => (
              <mesh key={j} position={[valveX, 1.98 - lift * 0.35 + (j - 3.5) * 0.043, 0.1]}>
                <torusGeometry args={[0.065, 0.009, 8, 24]} />
                <meshStandardMaterial color="#aebbc4" metalness={0.9} roughness={0.22} />
              </mesh>
            ))}
            <group position={[side * 0.12, 2.25, 0.25]} rotation={[0, 0, rockerAngle]}>
              <mesh position={[side * 0.16, -0.015, 0]}>
                <boxGeometry args={[0.43, 0.065, 0.09]} />
                <meshStandardMaterial color="#c6a66b" metalness={0.86} roughness={0.24} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.055, 0.055, 0.16, 24]} />
                <meshStandardMaterial color="#8e9ba3" metalness={0.86} roughness={0.24} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* SOHC shaft, journals, two cam lobes and 2:1 timing drive. */}
      <mesh position={[0, 2.47, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 1.0, 32]} />
        <meshStandardMaterial color="#b8c2c8" metalness={0.9} roughness={0.2} />
      </mesh>
      <CamLobe x={-0.29} angle={camDeg} lift={intakeLift} />
      <CamLobe x={0.29} angle={camDeg + Math.PI} lift={exhaustLift} />
      <mesh position={[-0.63, 2.47, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.12, 48]} />
        <meshStandardMaterial color="#8b9aa4" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0.0, -0.62, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.12, 48]} />
        <meshStandardMaterial color="#8b9aa4" metalness={0.9} roughness={0.22} />
      </mesh>
      {/* Chain run shown schematically between sprocket centers. */}
      <mesh position={[-0.31, 0.92, 0.5]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.035, 1.65, 0.035]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.9} roughness={0.24} />
      </mesh>
      <mesh position={[-0.47, 1.72, 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.16, 0.025, 8, 40]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.9} roughness={0.24} />
      </mesh>

      {/* Spark plug and ignition point. */}
      <mesh position={[0, 2.0, 0.04]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.36, 24]} />
        <meshStandardMaterial color="#d1d8dc" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.79, 0.04]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshBasicMaterial color="#fff0b2" />
      </mesh>

      <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#111a22" roughness={0.9} />
      </mesh>
      <gridHelper args={[10, 20, "#40515e", "#26343e"]} position={[0, -1.54, 0]} />
    </>
  );
}

export default function EngineSceneSOHC() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const frameInCycle = ((frame % CYCLE_FRAMES) + CYCLE_FRAMES) % CYCLE_FRAMES;
  const crankDeg = (frameInCycle / CYCLE_FRAMES) * 720;
  const phase = crankDeg < 180 ? 0 : crankDeg < 360 ? 1 : crankDeg < 540 ? 2 : 3;
  const names = ["HISAP", "KOMPRESI", "USAHA", "BUANG"];
  const intake = eventLift(crankDeg, 710, 220);
  const exhaust = eventLift(crankDeg, 490, 730);
  const spark = crankDeg >= 350 && crankDeg <= 358;

  return (
    <div className="visual">
      <div className="visual-heading">
        <span>ANATOMI MESIN 4-TAK · SOHC 2-KATUP</span>
        <span>POROS ENGKOL {Math.round(crankDeg)}°</span>
      </div>
      <div className="engine-viewport">
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ position: [4.7, 2.55, 7.5], fov: 37 }}
          style={{ width: "100%", height: "100%", backgroundColor: "#10151e" }}
        >
          <EngineModel crankDeg={crankDeg} />
        </ThreeCanvas>
      </div>
      <div className="visual-caption">
        <div>
          <span className="caption-label">LANGKAH SIKLUS</span>
          <strong>{names[phase]}</strong>
          <small>Katup masuk: {(intake * 1000).toFixed(0)} · Katup buang: {(exhaust * 1000).toFixed(0)} (skala visual)</small>
        </div>
        <div className="phase-dots">
          {names.map((name, i) => <span key={name} className={i === phase ? "dot active" : "dot"} />)}
        </div>
      </div>
      <div className="visual-note">
        {spark ? "MOMEN PENGAPIAN — mendekati TMA akhir kompresi" : "Animasi kinematika ilustratif · rasio poros engkol : noken as = 2 : 1"}
      </div>
    </div>
  );
}
