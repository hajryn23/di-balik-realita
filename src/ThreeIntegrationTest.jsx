import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";

function RotatingCube() {
  const frame = useCurrentFrame();

  return (
    <mesh rotation={[
      frame * 0.025,
      frame * 0.035,
      frame * 0.015
    ]}>
      <boxGeometry args={[1.8, 1.8, 1.8]} />
      <meshStandardMaterial
        color="#c6a66b"
        metalness={0.75}
        roughness={0.25}
      />
    </mesh>
  );
}

export default function ThreeIntegrationTest() {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [3, 2.5, 5], fov: 45 }}
      style={{ backgroundColor: "#10151e" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 5, 6]}
        intensity={2}
      />
      <RotatingCube />
      <gridHelper
        args={[8, 16, "#52606c", "#293743"]}
        position={[0, -1.5, 0]}
      />
    </ThreeCanvas>
  );
}
