"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

export default function MotionToggle() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mentor:motion") === "paused";
      setPaused(saved);
      document.documentElement.dataset.motion = saved ? "paused" : "playing";
    } catch { /* Motion still works when browser storage is unavailable. */ }
  }, []);
  function toggle() {
    const next = !paused;
    setPaused(next);
    document.documentElement.dataset.motion = next ? "paused" : "playing";
    try { localStorage.setItem("mentor:motion", next ? "paused" : "playing"); } catch { /* Optional preference persistence. */ }
  }
  return <button className="motion-toggle" onClick={toggle} aria-label={paused ? "Play animations" : "Pause animations"} title={paused ? "Play animations" : "Pause animations"} aria-pressed={paused}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>;
}
