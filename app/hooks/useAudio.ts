"use client";
import { useEffect, useRef, useState } from "react";

export function useSpeechToText(onResult: (text: string) => void) {
  const [ecoute, setEcoute] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "fr-FR";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: any) => { onResult(e.results[0][0].transcript); setEcoute(false); };
    r.onend = () => setEcoute(false);
    recognitionRef.current = r;
  }, [onResult]);

  function toggleEcoute() {
    if (!recognitionRef.current) return;
    if (ecoute) { recognitionRef.current.stop(); setEcoute(false); }
    else { recognitionRef.current.start(); setEcoute(true); }
  }

  return { ecoute, toggleEcoute };
}

export function useTextToSpeech() {
  const [parle, setParle] = useState(false);

  function lire(texte: string) {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = "fr-FR";
    u.rate = 0.9;
    u.pitch = 1;
    const voix = window.speechSynthesis.getVoices().find(v => v.lang.startsWith("fr"));
    if (voix) u.voice = voix;
    u.onstart = () => setParle(true);
    u.onend = () => setParle(false);
    window.speechSynthesis.speak(u);
  }

  function arreter() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setParle(false);
  }

  return { lire, arreter, parle };
}
