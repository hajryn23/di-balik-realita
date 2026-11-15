import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";

const CRANK_RADIUS = 0.45;
const ROD_LENGTH = 1.35;
const CRANK_CENTER_Y = -0.45;
const TOTAL_FRAMES = 240;

function metal(color, roughness = 0.32, metalness = 0.8) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
}

function cylinder(rt, rb, height, material, segments = 48) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, height, segments),
    material
  );
}

function torus(radius, tube, material) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 12, 64),
    material
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function between(mesh, a, b) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();

  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  mesh.scale.set(1, length, 1);
}

function addBolt(parent, x, y, z, material, radius = 0.055) {
  const bolt = cylinder(radius, radius, 0.045, material, 6);
  bolt.position.set(x, y, z);
  bolt.rotation.x = Math.PI / 2;
  parent.add(bolt);
  return bolt;
}

function smoothWindow(angle, start, end) {
  if (angle < start || angle > end) return 0;
  const t = (angle - start) / (end - start);
  return Math.sin(Math.PI * t);
}

function updateEngine(data, frame) {
  const cycleFrame = ((frame % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
  const angleDeg = (cycleFrame / TOTAL_FRAMES) * 720;
  const angle = THREE.MathUtils.degToRad(angleDeg);

  // Geometri slider-crank: panjang connecting rod tetap.
  const crankX = CRANK_RADIUS * Math.sin(angle);
  const crankY = CRANK_CENTER_Y + CRANK_RADIUS * Math.cos(angle);
  const vertical = Math.sqrt(
    ROD_LENGTH * ROD_LENGTH - crankX * crankX
  );

  const wristY = crankY + vertical;
  const pistonCenterY = wristY - 0.22;

  data.piston.position.y = pistonCenterY;
  data.pistonTop.position.y = pistonCenterY + 0.235;

  data.pistonRings.forEach((ring, i) => {
    ring.position.y = pistonCenterY + 0.12 - i * 0.075;
  });

  data.pistonPin.position.set(0, wristY, 0);
  data.rod.position.set(0, 0, 0);
  between(
    data.rod,
    new THREE.Vector3(crankX, crankY, 0.37),
    new THREE.Vector3(0, wristY, 0.37)
  );

  data.smallEnd.position.set(0, wristY, 0.37);
  data.bigEnd.position.set(crankX, crankY, 0.37);
  data.crankPin.position.set(crankX, crankY, 0.37);

  // Dua crank web berputar bersama poros engkol.
  data.crankWebs.forEach((web) => {
    web.rotation.z = angle;
  });

  // Timing katup ilustratif: hisap 0–180°, buang 540–720°.
  const intakeLift = smoothWindow(angleDeg, 0, 180) * 0.13;
  const exhaustLift = smoothWindow(angleDeg, 540, 720) * 0.13;

  data.valves[0].position.y = 1.70 - intakeLift;
  data.valves[1].position.y = 1.70 - exhaustLift;

  data.valveSprings[0].scale.y = 1 - intakeLift * 0.8;
  data.valveSprings[1].scale.y = 1 - exhaustLift * 0.8;

  // Percikan ditempatkan menjelang akhir kompresi.
  const sparkActive = angleDeg >= 340 && angleDeg <= 350;
  data.spark.visible = sparkActive;
  data.spark.scale.setScalar(sparkActive ? 1.4 : 0.01);

  // Animasi cahaya percikan.
  data.sparkLight.intensity = sparkActive ? 3.5 : 0;

  data.renderer.render(data.scene, data.camera);
}

export default function EngineScene() {
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const frame = useCurrentFrame();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#10151e");

    const camera = new THREE.PerspectiveCamera(
      34,
      16 / 9,
      0.1,
      100
    );
    camera.position.set(4.0, 2.0, 7.5);
    camera.lookAt(0, 0.55, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    host.appendChild(renderer.domElement);

    scene.add(
      new THREE.HemisphereLight("#dce4ec", "#26313d", 1.8)
    );

    const key = new THREE.DirectionalLight("#fff0d5", 3.2);
    key.position.set(4, 6, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight("#9bbbd2", 1.7);
    fill.position.set(-5, 2, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight("#76a8c8", 2.4);
    rim.position.set(-4, 3, -5);
    scene.add(rim);

    const gold = metal("#c6a66b", 0.26, 0.82);
    const aluminum = metal("#aebbc4", 0.29, 0.82);
    const steel = metal("#697984", 0.3, 0.88);
    const darkSteel = metal("#263642", 0.38, 0.78);
    const black = new THREE.MeshStandardMaterial({
      color: "#111b23",
      roughness: 0.48,
      metalness: 0.55
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: "#171a1d",
      roughness: 0.82,
      metalness: 0.05
    });

    const engine = new THREE.Group();
    scene.add(engine);

    // BLOK SILINDER DAN LINER
    const liner = cylinder(
      0.60, 0.60, 1.68, steel, 72
    );
    liner.position.y = 0.82;
    engine.add(liner);

    const bore = cylinder(
      0.565, 0.565, 1.70, black, 72
    );
    bore.position.y = 0.82;
    engine.add(bore);

    // Sirip pendingin berbentuk cincin mengelilingi liner.
    const fins = [];
    for (let i = 0; i < 7; i++) {
      const fin = torus(0.68 + (i % 2) * 0.025, 0.055, aluminum);
      fin.position.y = 0.18 + i * 0.205;
      engine.add(fin);
      fins.push(fin);
    }

    // Kepala silinder dan bidang ruang bakar.
    const head = cylinder(0.78, 0.72, 0.42, darkSteel, 72);
    head.position.y = 1.91;
    engine.add(head);

    const headCover = cylinder(0.73, 0.73, 0.09, aluminum, 72);
    headCover.position.y = 2.165;
    engine.add(headCover);

    const chamber = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 48, 32),
      black
    );
    chamber.scale.set(1, 0.22, 0.82);
    chamber.position.set(0, 1.68, 0);
    engine.add(chamber);

    // Baut kepala silinder.
    for (const x of [-0.57, 0.57]) {
      for (const z of [-0.43, 0.43]) {
        addBolt(engine, x, 2.15, z, gold);
      }
    }

    // PISTON
    const piston = cylinder(
      0.535, 0.55, 0.47, aluminum, 72
    );
    engine.add(piston);

    const pistonTop = cylinder(
      0.525, 0.525, 0.045, steel, 72
    );
    engine.add(pistonTop);

    // Tiga ring piston.
    const pistonRings = [];
    for (let i = 0; i < 3; i++) {
      const ring = torus(0.543, 0.018, gold);
      engine.add(ring);
      pistonRings.push(ring);
    }

    // Pin piston, melintang pada sumbu Z.
    const pistonPin = cylinder(
      0.085, 0.085, 1.02, gold, 32
    );
    pistonPin.rotation.x = Math.PI / 2;
    engine.add(pistonPin);

    // CONNECTING ROD
    const rod = cylinder(
      0.075, 0.095, 1, gold, 32
    );
    engine.add(rod);

    const smallEnd = torus(0.105, 0.035, aluminum);
    engine.add(smallEnd);

    const bigEnd = torus(0.145, 0.045, aluminum);
    engine.add(bigEnd);

    // CRANKSHAFT
    const crankWebs = [];
    for (const z of [-0.24, 0.24]) {
      const web = cylinder(
        0.34, 0.34, 0.13, darkSteel, 64
      );
      web.rotation.x = Math.PI / 2;
      web.position.set(0, CRANK_CENTER_Y, z);
      engine.add(web);
      crankWebs.push(web);
    }

    const crankPin = cylinder(
      0.105, 0.105, 0.42, gold, 32
    );
    crankPin.rotation.x = Math.PI / 2;
    engine.add(crankPin);

    const mainShaft = cylinder(
      0.115, 0.115, 1.35, aluminum, 40
    );
    mainShaft.rotation.x = Math.PI / 2;
    mainShaft.position.set(0, CRANK_CENTER_Y, 0);
    engine.add(mainShaft);

    // CRANKCASE
    const crankCase = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.82, 1.15),
      black
    );
    crankCase.position.set(0, -0.92, 0);
    engine.add(crankCase);

    const sideCover = cylinder(
      0.58, 0.58, 0.12, steel, 64
    );
    sideCover.rotation.x = Math.PI / 2;
    sideCover.position.set(0, -0.87, 0.60);
    engine.add(sideCover);

    // KATUP MASUK DAN BUANG.
    const valves = [];
    const valveSprings = [];

    for (const x of [-0.31, 0.31]) {
      const group = new THREE.Group();
      engine.add(group);

      const stem = cylinder(
        0.035, 0.035, 0.55, aluminum, 24
      );
      stem.position.y = 0.18;
      group.add(stem);

      const valveHead = cylinder(
        0.125, 0.125, 0.055, gold, 32
      );
      valveHead.position.y = -0.12;
      group.add(valveHead);

      group.position.set(x, 1.70, 0);
      valves.push(group);

      // Pegas katup berbentuk heliks.
      const points = [];
      const turns = 7;
      for (let i = 0; i <= turns * 12; i++) {
        const t = i / (turns * 12);
        const a = t * turns * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(a) * 0.075,
            t * 0.36 - 0.18,
            Math.sin(a) * 0.075
          )
        );
      }

      const springCurve = new THREE.CatmullRomCurve3(points);
      const springGeometry = new THREE.TubeGeometry(
        springCurve, 180, 0.012, 6, false
      );
      const spring = new THREE.Mesh(springGeometry, gold);
      spring.position.set(x, 2.02, 0);
      engine.add(spring);
      valveSprings.push(spring);
    }

    // POROS NOK DAN LOBE KATUP.
    const camshaft = cylinder(
      0.085, 0.085, 1.05, aluminum, 32
    );
    camshaft.rotation.x = Math.PI / 2;
    camshaft.position.set(0, 2.43, 0);
    engine.add(camshaft);

    for (const x of [-0.31, 0.31]) {
      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 32, 24),
        gold
      );
      lobe.scale.set(1, 1.25, 0.55);
      lobe.position.set(x, 2.43, 0);
      engine.add(lobe);
    }

    // BUSI DAN ELEKTRODA.
    const sparkPlug = cylinder(
      0.075, 0.095, 0.48, aluminum, 32
    );
    sparkPlug.position.set(0, 2.38, 0.12);
    engine.add(sparkPlug);

    const electrode = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 20, 20),
      gold
    );
    electrode.position.set(0, 2.06, 0.12);
    engine.add(electrode);

    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 24, 24),
      new THREE.MeshBasicMaterial({
        color: "#fff2b3",
        transparent: true
      })
    );
    spark.position.set(0, 1.94, 0.12);
    engine.add(spark);

    const sparkLight = new THREE.PointLight(
      "#ffd98a", 0, 1.2
    );
    sparkLight.position.copy(spark.position);
    engine.add(sparkLight);

    // DETAIL BAUT PADA BLOK.
    for (const x of [-0.62, 0.62]) {
      for (const y of [-0.72, -1.08]) {
        addBolt(engine, x, y, 0.59, aluminum, 0.045);
      }
    }

    // LANTAI STUDIO.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({
        color: "#17212b",
        roughness: 0.82,
        metalness: 0.12
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.42;
    scene.add(floor);

    const grid = new THREE.GridHelper(
      12, 24, "#52606c", "#293743"
    );
    grid.position.y = -1.415;
    scene.add(grid);

    function resize() {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.render(scene, camera);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    engineRef.current = {
      scene,
      camera,
      renderer,
      piston,
      pistonTop,
      pistonRings,
      pistonPin,
      rod,
      smallEnd,
      bigEnd,
      crankPin,
      crankWebs,
      valves,
      valveSprings,
      spark,
      sparkLight
    };

    resize();
    updateEngine(engineRef.current, frame);
    setReady(true);

    return () => {
      observer.disconnect();

      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      renderer.dispose();

      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }

      engineRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (engineRef.current) {
      updateEngine(engineRef.current, frame);
    }
  }, [frame]);

  const cycleFrame = frame % TOTAL_FRAMES;
  const phase = Math.floor(cycleFrame / 60);
  const phaseNames = [
    "LANGKAH HISAP",
    "LANGKAH KOMPRESI",
    "LANGKAH USAHA",
    "LANGKAH BUANG"
  ];
  const degrees = Math.round((cycleFrame / TOTAL_FRAMES) * 720);

  return (
    <div className="visual">
      <div className="visual-heading">
        <span>ANATOMI MESIN 4-TAK</span>
        <span>PUTARAN ENGKOL: {degrees}°</span>
      </div>

      <div className="engine-viewport" ref={hostRef}>
        {!ready && (
          <div className="loading">Menyiapkan model mesin 3D…</div>
        )}
      </div>

      <div className="visual-caption">
        <div>
          <span className="caption-label">FASE SIKLUS</span>
          <strong>{phaseNames[phase]}</strong>
        </div>

        <div className="phase-dots">
          {phaseNames.map((name, index) => (
            <span
              key={name}
              className={index === phase ? "dot active" : "dot"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
