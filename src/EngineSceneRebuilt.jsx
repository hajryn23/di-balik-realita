import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

const FRAMES = 240;
const DEG = Math.PI / 180;
const CRANK_RADIUS = 0.34;
const ROD_LENGTH = 1.12;
const CRANK_Y = -0.92;
const PISTON_PIN_OFFSET = 0.03;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (v) => {
  const x = clamp(v, 0, 1);
  return x * x * (3 - 2 * x);
};

// Slider-crank: piston pin remains on the cylinder axis.
function sliderCrank(degrees) {
  const a = degrees * DEG;
  const x = CRANK_RADIUS * Math.sin(a);
  const y = CRANK_Y + CRANK_RADIUS * Math.cos(a);
  const pinY = y + Math.sqrt(ROD_LENGTH ** 2 - x ** 2);
  return { crankX: x, crankY: y, pinY, pistonY: pinY - PISTON_PIN_OFFSET };
}

// Valve timing in crank degrees over a 720-degree four-stroke cycle.
// Intake: 10 BTDC to 40 ABDC. Exhaust: 50 BBDC to 10 ATDC.
function valveLift(crankDegrees, openAt, closeAt, maximum = 0.105) {
  const phase = ((crankDegrees % 720) + 720) % 720;
  const span = closeAt > openAt ? closeAt - openAt : closeAt + 720 - openAt;
  const progress = ((phase - openAt + 720) % 720) / span;
  if (progress > 1) return 0;
  const ramp = 0.18;
  return maximum * Math.min(smoothstep(progress / ramp), smoothstep((1 - progress) / ramp));
}

function Bar({ start, end, radius = 0.035, color = "#c6a66b", metalness = 0.8 }) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.clone().normalize()
  );
  return (
    <mesh position={a.clone().add(b).multiplyScalar(0.5)} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, delta.length(), 24]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={0.28} />
    </mesh>
  );
}

function Bearing({ x, y, z = 0, radius = 0.12 }) {
  return (
    <mesh position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.025, 10, 40]} />
      <meshStandardMaterial color="#d2d9dd" metalness={0.88} roughness={0.22} />
    </mesh>
  );
}

function CamLobe({ x, angle, z = 0.12 }) {
  return (
    <group position={[x, 2.36, z]} rotation={[0, 0, angle]}>
      <mesh position={[0, -0.045, 0]} scale={[0.105, 1.65, 0.72]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.88} roughness={0.22} />
      </mesh>
    </group>
  );
}

function EngineModel({ crankDegrees }) {
  const crankRadians = crankDegrees * DEG;
  const { crankX, crankY, pistonY } = sliderCrank(crankDegrees);
  const camDegrees = crankDegrees / 2;
  const camRadians = camDegrees * DEG;
  const intake = valveLift(crankDegrees, 710, 220);
  const exhaust = valveLift(crankDegrees, 490, 730);
  const valves = [
    { x: -0.27, lift: intake, side: -1, color: "#568ba5" },
    { x: 0.27, lift: exhaust, side: 1, color: "#b87550" },
  ];

  const chainCurve = React.useMemo(() => {
    const pts = [
      new THREE.Vector3(-0.76, -0.92, 0.43),
      new THREE.Vector3(-0.96, -0.72, 0.43),
      new THREE.Vector3(-0.96, 1.98, 0.43),
      new THREE.Vector3(-0.78, 2.36, 0.43),
      new THREE.Vector3(-0.58, 2.36, 0.43),
      new THREE.Vector3(-0.48, 2.13, 0.43),
      new THREE.Vector3(-0.48, -0.72, 0.43),
      new THREE.Vector3(-0.62, -0.92, 0.43),
    ];
    return new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.15);
  }, []);

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#dce8ef", "#1c2831", 1.1]} />
      <directionalLight position={[4, 5, 7]} intensity={2.1} color="#fff0d9" />
      <directionalLight position={[-4, 2, 4]} intensity={1.2} color="#9dbdd0" />

      {/* Cylinder liner and cooling fins. The front is opened for the cutaway view. */}
      <mesh position={[0, 0.47, -0.02]}>
        <cylinderGeometry args={[0.48, 0.48, 1.22, 64, 1, true]} />
        <meshStandardMaterial color="#667985" metalness={0.76} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {[0.03, 0.19, 0.35, 0.51, 0.67, 0.83].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.53, 0.018, 8, 64]} />
          <meshStandardMaterial color="#8999a3" metalness={0.82} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 0.47, 0.02]}>
        <cylinderGeometry args={[0.445, 0.445, 1.2, 64, 1, true]} />
        <meshStandardMaterial color="#18232b" metalness={0.45} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>

      {/* Piston, ring pack and wrist pin. */}
      <mesh position={[0, pistonY, 0.03]}>
        <cylinderGeometry args={[0.405, 0.425, 0.31, 64]} />
        <meshStandardMaterial color="#b9c4ca" metalness={0.88} roughness={0.22} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, pistonY + 0.095 - i * 0.065, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.412, 0.012, 8, 64]} />
          <meshStandardMaterial color={i === 2 ? "#bd965d" : "#e0e5e8"} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, pistonY - 0.025, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.72, 32]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Connecting rod and big-end/small-end eyes. */}
      <Bar start={[crankX, crankY, 0.28]} end={[0, pistonY - 0.025, 0.28]} radius={0.075} color="#b7a27c" />
      <Bearing x={crankX} y={crankY} z={0.31} radius={0.12} />
      <Bearing x={0} y={pistonY - 0.025} z={0.31} radius={0.085} />

      {/* Crank webs and main shaft, with the crankpin at the slider-crank position. */}
      {[-0.27, 0.27].map((z) => (
        <group key={z} position={[0, CRANK_Y, z]} rotation={[0, 0, -crankRadians]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.105, 48]} />
            <meshStandardMaterial color="#53636d" metalness={0.88} roughness={0.25} />
          </mesh>
          <mesh position={[0, CRANK_RADIUS * 0.5, 0]}>
            <boxGeometry args={[0.22, CRANK_RADIUS, 0.11]} />
            <meshStandardMaterial color="#53636d" metalness={0.88} roughness={0.25} />
          </mesh>
          <mesh position={[0, CRANK_RADIUS, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.12, 32]} />
            <meshStandardMaterial color="#c6a66b" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, CRANK_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.78, 32]} />
        <meshStandardMaterial color="#cbd3d8" metalness={0.92} roughness={0.18} />
      </mesh>

      {/* Split crankcase: solid lower housing around the rotating assembly. */}
      <mesh position={[0, -1.16, -0.05]}>
        <boxGeometry args={[1.45, 0.62, 0.82]} />
        <meshStandardMaterial color="#354650" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[0, -1.49, 0.02]}>
        <boxGeometry args={[1.58, 0.08, 0.9]} />
        <meshStandardMaterial color="#758690" metalness={0.78} roughness={0.28} />
      </mesh>

      {/* Cylinder head and combustion chamber. */}
      <mesh position={[0, 1.23, -0.02]}>
        <boxGeometry args={[1.16, 0.34, 0.86]} />
        <meshStandardMaterial color="#465963" metalness={0.78} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.045, 0.08]}>
        <boxGeometry args={[0.82, 0.08, 0.66]} />
        <meshStandardMaterial color="#c0a06d" metalness={0.65} roughness={0.34} />
      </mesh>
      <mesh position={[0, 1.47, 0.12]} rotation={[0.12, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.35, 24]} />
        <meshStandardMaterial color="#d2d9dd" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Intake/exhaust runners enter the chamber from opposite sides. */}
      {valves.map((v) => (
        <group key={v.side}>
          <Bar start={[v.x, 1.12, 0.05]} end={[v.x + v.side * 0.48, 1.47, 0.05]} radius={0.085} color={v.color} />
          <mesh position={[v.x + v.side * 0.48, 1.47, 0.05]} rotation={[0, 0, v.side * -0.7]}>
            <cylinderGeometry args={[0.085, 0.085, 0.32, 24, 1, true]} />
            <meshStandardMaterial color={v.color} metalness={0.55} roughness={0.38} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Two valve stems and heads; lift follows the camshaft phase at 2:1. */}
      {valves.map((v) => {
        const stemBottom = 1.13 - v.lift;
        const stemTop = 1.91 - v.lift;
        return (
          <group key={v.side}>
            <Bar start={[v.x, stemBottom, 0.17]} end={[v.x, stemTop, 0.17]} radius={0.025} color="#d4dce0" metalness={0.92} />
            <mesh position={[v.x, stemBottom, 0.17]}>
              <cylinderGeometry args={[0.105, 0.105, 0.045, 32]} />
              <meshStandardMaterial color="#c6a66b" metalness={0.88} roughness={0.22} />
            </mesh>
            {Array.from({ length: 7 }, (_, i) => (
              <mesh key={i} position={[v.x, 1.36 + i * 0.065 - v.lift * 0.45, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.052, 0.008, 8, 24]} />
                <meshStandardMaterial color="#aebbc4" metalness={0.9} roughness={0.2} />
              </mesh>
            ))}
            {/* Rocker pivots and arms. The angle is phase-linked; contact is illustrative. */}
            <mesh position={[v.x - v.side * 0.17, 2.02, 0.22]}>
              <cylinderGeometry args={[0.065, 0.065, 0.2, 24]} />
              <meshStandardMaterial color="#8d9ba3" metalness={0.88} roughness={0.22} />
            </mesh>
            <group position={[v.x - v.side * 0.17, 2.02, 0.22]} rotation={[0, 0, v.side * v.lift * 1.8]}>
              <Bar start={[0, 0, 0]} end={[v.side * 0.34, -0.04, 0]} radius={0.035} color="#c6a66b" />
              <mesh position={[v.side * 0.34, -0.04, 0]}>
                <sphereGeometry args={[0.045, 16, 12]} />
                <meshStandardMaterial color="#d2d9dd" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* SOHC camshaft, eccentric lobes, and timing sprockets/chain. */}
      <mesh position={[0, 2.36, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.9, 32]} />
        <meshStandardMaterial color="#cbd3d8" metalness={0.92} roughness={0.18} />
      </mesh>
      <CamLobe x={-0.27} angle={camRadians} />
      <CamLobe x={0.27} angle={camRadians + Math.PI} />
      <mesh position={[-0.77, 2.36, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.12, 48]} />
        <meshStandardMaterial color="#8d9ba3" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.77, -0.92, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 48]} />
        <meshStandardMaterial color="#8d9ba3" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh>
        <tubeGeometry args={[chainCurve, 96, 0.018, 8, true]} />
        <meshStandardMaterial color="#b7c1c7" metalness={0.9} roughness={0.24} />
      </mesh>

      <mesh position={[0, -1.57, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#101820" roughness={0.95} />
      </mesh>
      <gridHelper args={[10, 20, "#344550", "#202d36"]} position={[0, -1.56, 0]} />
    </>
  );
}

export default function EngineSceneSOHC() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const frameInCycle = ((frame % FRAMES) + FRAMES) % FRAMES;
  const crankDegrees = (frameInCycle / FRAMES) * 720;
  const phase = Math.floor(crankDegrees / 180) % 4;
  const phaseNames = ["HISAP", "KOMPRESI", "USAHA", "BUANG"];
  const intake = valveLift(crankDegrees, 710, 220);
  const exhaust = valveLift(crankDegrees, 490, 730);

  return (
    <div className="visual">
      <div className="visual-heading">
        <span>ANATOMI MESIN 4-TAK · SOHC 2-KATUP</span>
        <span>POROS ENGKOL {Math.round(crankDegrees)}°</span>
      </div>
      <div className="engine-viewport">
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ position: [0.4, 1.05, 7.8], fov: 38 }}
          style={{ width: "100%", height: "100%", backgroundColor: "#101820" }}
        >
          <EngineModel crankDegrees={crankDegrees} />
        </ThreeCanvas>
      </div>
      <div className="visual-caption">
        <div>
          <span className="caption-label">LANGKAH SIKLUS</span>
          <strong>{phaseNames[phase]}</strong>
          <small>Katup masuk: {(intake * 1000).toFixed(0)} · Katup buang: {(exhaust * 1000).toFixed(0)} (skala visual)</small>
        </div>
        <div className="phase-dots">
          {phaseNames.map((name, i) => <span key={name} className={i === phase ? "dot active" : "dot"} />)}
        </div>
      </div>
      <div className="visual-note">
        Model geometri direvisi · engkol 720° per siklus · camshaft 360° per siklus · kontak nok/rocker masih pendekatan visual
      </div>
    </div>
  );
}
