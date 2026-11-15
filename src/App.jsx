import React from "react";
import { Player } from "@remotion/player";
import EngineSceneSOHC from "./EngineSceneSOHC.jsx";

export default function App() {
  return (
    <main className="page">
      <header className="brand">
        <div className="eyebrow">DOKUMENTER SAINS & TEKNOLOGI</div>
        <h1>DI BALIK <span>REALITA</span></h1>
        <p>Mengungkap apa yang tak terlihat.</p>
      </header>

      <section className="intro">
        <div className="chapter">PROTOTIPE VISUAL 01 · REVISI MEKANIS</div>
        <h2>Apa yang Terjadi di Dalam Mesin Motor?</h2>
        <p>
          Model potongan mesin satu silinder 4-langkah SOHC 2-katup:
          piston, poros engkol, batang piston, noken as, rocker arm,
          pegas katup, serta jalur masuk dan buang.
        </p>
      </section>

      <section className="player-shell">
        <Player
          component={EngineSceneSOHC}
          durationInFrames={240}
          compositionWidth={1280}
          compositionHeight={720}
          fps={30}
          controls
          loop
          style={{ width: "100%" }}
        />
      </section>

      <footer>
        <span>MODEL KINEMATIKA ILUSTRATIF — BUKAN REPLIKA MEREK TERTENTU</span>
        <span>30 FPS · POROS ENGKOL 720° · NOKKEN AS 360°</span>
      </footer>
    </main>
  );
}
