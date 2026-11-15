import React from "react";
import { Player } from "@remotion/player";
import EngineSceneThree from "./EngineSceneThree.jsx";

export default function App() {
  return (
    <main className="page">
      <header className="brand">
        <div className="eyebrow">DOKUMENTER SAINS & TEKNOLOGI</div>
        <h1>DI BALIK <span>REALITA</span></h1>
        <p>Mengungkap apa yang tak terlihat.</p>
      </header>

      <section className="intro">
        <div className="chapter">PROTOTIPE VISUAL 01</div>
        <h2>Apa yang Terjadi di Dalam Mesin Motor?</h2>
        <p>
          Simulasi mekanisme mesin satu silinder, empat langkah,
          dengan gerakan piston dan poros engkol.
        </p>
      </section>

      <section className="player-shell">
        <Player
          component={EngineSceneThree}
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
        <span>MODEL ILUSTRATIF — BUKAN REPLIKA MESIN MEREK TERTENTU</span>
        <span>30 FPS · 720° SIKLUS EMPAT LANGKAH</span>
      </footer>
    </main>
  );
}
