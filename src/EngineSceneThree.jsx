import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";

const CRANK_RADIUS = 0.45;
const ROD_LENGTH = 1.35;
const CRANK_CENTER_Y = -0.45;
const TOTAL_FRAMES = 240;

function smoothWindow(angle, start, end) {
  if (angle < start || angle > end) return 0;
  return Math.sin(Math.PI * (angle - start) / (end - start));
}

function EngineModel() {
  const frame = useCurrentFrame();

  const cycleFrame = ((frame % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
  const angleDeg = (cycleFrame / TOTAL_FRAMES) * 720;
  const angle = THREE.MathUtils.degToRad(angleDeg);

  // Geometri slider-crank: connecting rod tetap panjang.
  const crankX = CRANK_RADIUS * Math.sin(angle);
  const crankY = CRANK_CENTER_Y + CRANK_RADIUS * Math.cos(angle);
  const rodVertical = Math.sqrt(
    ROD_LENGTH * ROD_LENGTH - crankX * crankX
  );
  const wristY = crankY + rodVertical;
  const pistonY = wristY - 0.22;

  // Camshaft berputar setengah kecepatan crankshaft.
  const camAngle = angle / 2;
  const camDegrees = (angleDeg / 2) % 360;

  // Timing ilustratif katup masuk dan buang.
  const intakeLift = smoothWindow(angleDeg, 0, 180) * 0.13;
  const exhaustLift = smoothWindow(angleDeg, 540, 720) * 0.13;

  const sparkActive = angleDeg >= 340 && angleDeg <= 350;

  const rodRotation = Math.atan2(crankX, rodVertical);
  const webY = (CRANK_CENTER_Y + crankY) / 2;
  const webX = crankX / 2;

  return (
    <>
      {/* BLOK SILINDER DAN LINER */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.60, 0.60, 1.68, 64]} />
        <meshStandardMaterial color="#697984" metalness={0.8} roughness={0.3} />
      </mesh>

      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.565, 0.565, 1.70, 64]} />
        <meshStandardMaterial color="#111b23" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* SIRIP PENDINGIN */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, 0.18 + i * 0.205, 0]}
          rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.68 + (i % 2) * 0.025, 0.055, 12, 64]} />
          <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.28} />
        </mesh>
      ))}

      {/* KEPALA SILINDER */}
      <mesh position={[0, 1.91, 0]}>
        <cylinderGeometry args={[0.78, 0.72, 0.42, 64]} />
        <meshStandardMaterial color="#263642" metalness={0.75} roughness={0.38} />
      </mesh>

      <mesh position={[0, 2.165, 0]}>
        <cylinderGeometry args={[0.73, 0.73, 0.09, 64]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.82} roughness={0.28} />
      </mesh>

      {/* PISTON */}
      <mesh position={[0, pistonY, 0]}>
        <cylinderGeometry args={[0.535, 0.55, 0.47, 64]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.26} />
      </mesh>

      <mesh position={[0, pistonY + 0.235, 0]}>
        <cylinderGeometry args={[0.525, 0.525, 0.045, 64]} />
        <meshStandardMaterial color="#697984" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* RING PISTON */}
      {[0, 1, 2].map((i) => (
        <mesh key={i}
          position={[0, pistonY + 0.12 - i * 0.075, 0]}
          rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.543, 0.018, 12, 64]} />
          <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}

      {/* PIN PISTON */}
      <mesh position={[0, wristY, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 1.02, 32]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* CONNECTING ROD */}
      <mesh
        position={[crankX / 2, (crankY + wristY) / 2, 0.37]}
        rotation={[0, 0, rodRotation]}
      >
        <cylinderGeometry args={[0.075, 0.095, ROD_LENGTH, 32]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
      </mesh>

      <mesh position={[0, wristY, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.105, 0.035, 12, 48]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.25} />
      </mesh>

      <mesh position={[crankX, crankY, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.145, 0.045, 12, 48]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* CRANKSHAFT DAN LENGAN ENGKOL */}
      {[-0.24, 0.24].map((z) => (
        <mesh key={z}
          position={[webX, webY, z]}
          rotation={[0, 0, -angle]}>
          <boxGeometry args={[0.36, 0.78, 0.13]} />
          <meshStandardMaterial color="#263642" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      <mesh position={[crankX, crankY, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.42, 32]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
      </mesh>

      <mesh position={[0, CRANK_CENTER_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 1.35, 40]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* CRANKCASE */}
      <mesh position={[0, -0.92, 0]}>
        <boxGeometry args={[1.65, 0.82, 1.15]} />
        <meshStandardMaterial color="#111b23" metalness={0.55} roughness={0.48} />
      </mesh>

      {/* KATUP DAN PEGAS */}
      {[-0.31, 0.31].map((x, i) => {
        const lift = i === 0 ? intakeLift : exhaustLift;
        const valveY = 1.70 - lift;

        return (
          <group key={x}>
            <mesh position={[x, valveY + 0.18, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.55, 24]} />
              <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.25} />
            </mesh>

            <mesh position={[x, valveY - 0.12, 0]}>
              <cylinderGeometry args={[0.125, 0.125, 0.055, 32]} />
              <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
            </mesh>

            {Array.from({ length: 7 }, (_, j) => (
              <mesh key={j}
                position={[x, 2.02 - lift * 0.4 + (j - 3) * 0.045, 0]}>
                <torusGeometry args={[0.075, 0.012, 8, 32]} />
                <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* CAMSHAFT */}
      <mesh position={[0, 2.43, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 1.05, 32]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.25} />
      </mesh>

      {[-0.31, 0.31].map((x, i) => (
        <mesh key={x}
          position={[x, 2.43, 0]}
          rotation={[0, 0, camAngle + (i === 0 ? 0 : Math.PI)]}
          scale={[0.13, 0.20, 0.09]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}

      {/* BUSI DAN PERCIKAN */}
      <mesh position={[0, 2.38, 0.12]}>
        <cylinderGeometry args={[0.075, 0.095, 0.48, 32]} />
        <meshStandardMaterial color="#aebbc4" metalness={0.85} roughness={0.25} />
      </mesh>

      <mesh position={[0, 2.06, 0.12]}>
        <sphereGeometry args={[0.045, 20, 20]} />
        <meshStandardMaterial color="#c6a66b" metalness={0.85} roughness={0.25} />
      </mesh>

      <mesh position={[0, 1.94, 0.12]} visible={sparkActive}
        scale={sparkActive ? [1.4, 1.4, 1.4] : [0.01, 0.01, 0.01]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshBasicMaterial color="#fff2b3" />
      </mesh>

      {/* LANTAI DAN GRID */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.42, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#17212b" roughness={0.82} />
      </mesh>

      <gridHelper args={[12, 24, "#52606c", "#293743"]}
        position={[0, -1.415, 0]} />
    </>
  );
}

export default function EngineSceneThree() {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const cycleFrame = ((frame % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
  const phase = Math.floor(cycleFrame / 60);
  const degrees = Math.round((cycleFrame / TOTAL_FRAMES) * 720);

  const phaseNames = [
    "LANGKAH HISAP",
    "LANGKAH KOMPRESI",
    "LANGKAH USAHA",
    "LANGKAH BUANG"
  ];

  return (
    <div className="visual">
      <div className="visual-heading">
        <span>ANATOMI MESIN 4-TAK</span>
        <span>PUTARAN ENGKOL: {degrees}°</span>
      </div>

      <div className="engine-viewport">
        <ThreeCanvas
          width={width}
          height={height}
          camera={{ position: [4, 2.5, 8], fov: 38 }}
          style={{ width: "100%", height: "100%", backgroundColor: "#10151e" }}
        >
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#dce4ec", "#26313d", 1.2]} />
          <directionalLight position={[4, 6, 5]} intensity={2.5} color="#fff0d5" />
          <directionalLight position={[-5, 2, 3]} intensity={1.2} color="#9bbbd2" />
          <directionalLight position={[-4, 3, -5]} intensity={1.8} color="#76a8c8" />
          <EngineModel />
        </ThreeCanvas>
      </div>

      <div className="visual-caption">
        <div>
          <span className="caption-label">FASE SIKLUS</span>
          <strong>{phaseNames[phase]}</strong>
        </div>
        <div className="phase-dots">
          {phaseNames.map((name, index) => (
            <span key={name} className={index === phase ? "dot active" : "dot"} />
          ))}
        </div>
      </div>
    </div>
  );
}
