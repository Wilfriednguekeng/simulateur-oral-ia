"use client";
import { useCallback, useRef, useState } from "react";

export function useSpeechToText(onResult: (text: string) => void) {
  const [ecoute, setEcoute] = useState(false);
  const recognitionRef = useRef<any>(null);

  const init = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return;
    const r = new SR();
    r.lang = "fr-FR";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: any) => { onResult(e.results[0][0].transcript); setEcoute(false); };
    r.onerror = () => setEcoute(false);
    r.onend = () => setEcoute(false);
    recognitionRef.current = r;
  }, [onResult]);

  function toggleEcoute() {
    init();
    if (!recognitionRef.current) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale. Essayez Chrome.");
      return;
    }
    if (ecoute) { recognitionRef.current.stop(); setEcoute(false); }
    else { recognitionRef.current.start(); setEcoute(true); }
  }

  return { ecoute, toggleEcoute };
}

export function useTextToSpeech() {
  const [parle, setParle] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  function lire(texte: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Synthese vocale non disponible");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = "fr-FR";
    u.rate = 0.85;
    u.pitch = 1;
    u.volume = 1;

    // Chercher une voix francaise
    const chargerVoix = () => {
      const voix = window.speechSynthesis.getVoices();
      const voixFR = voix.find(v => v.lang === "fr-FR") ||
                     voix.find(v => v.lang.startsWith("fr")) ||
                     voix[0];
      if (voixFR) u.voice = voixFR;
    };

    chargerVoix();
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", chargerVoix, { once: true });
    }

    u.onstart = () => setParle(true);
    u.onend = () => setParle(false);
    u.onerror = (e) => { console.warn("Erreur synthese vocale:", e); setParle(false); };

    utteranceRef.current = u;

    // Safari fix - demarrer apres un court delai
    setTimeout(() => {
      try { window.speechSynthesis.speak(u); } catch(e) { console.warn(e); }
    }, 100);
  }

  function arreter() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setParle(false);
  }

  function tester() {
    lire("Test de la synthese vocale. Bonjour, je suis votre examinateur.");
  }

  return { lire, arreter, parle, tester };
}
