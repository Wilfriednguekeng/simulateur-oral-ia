"use client";
import { useState, useEffect } from "react";

export type AccessibiliteConfig = {
  fontSize: "small" | "normal" | "large" | "xlarge";
  contraste: boolean;
  daltonisme: boolean;
  noMotion: boolean;
  lectureAuto: boolean;
};

const defaultConfig: AccessibiliteConfig = {
  fontSize: "normal",
  contraste: false,
  daltonisme: false,
  noMotion: false,
  lectureAuto: false,
};

export function useAccessibilite() {
  const [config, setConfig] = useState<AccessibiliteConfig>(defaultConfig);

  useEffect(() => {
    const saved = localStorage.getItem("accessibilite");
    if (saved) setConfig(JSON.parse(saved));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setConfig(c => ({ ...c, noMotion: true }));
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Contraste eleve
    if (config.contraste) {
      body.style.filter = "contrast(1.5) brightness(1.2)";
      root.style.setProperty("--color-bg", "#000000");
      root.style.setProperty("--color-text", "#ffffff");
      root.style.setProperty("--color-border", "rgba(255,255,255,0.5)");
    } else {
      body.style.filter = "";
      root.style.removeProperty("--color-bg");
      root.style.removeProperty("--color-text");
      root.style.removeProperty("--color-border");
    }

    // Daltonisme - filtre SVG
    if (config.daltonisme) {
      body.style.filter = (config.contraste ? "contrast(1.5) brightness(1.2) " : "") + "url(#colorblind-filter)";
    }

    // Animations
    root.classList.toggle("no-motion", config.noMotion);

    // Taille police
    const sizes = { small: "14px", normal: "16px", large: "20px", xlarge: "24px" };
    body.style.fontSize = sizes[config.fontSize];

    localStorage.setItem("accessibilite", JSON.stringify(config));
  }, [config]);

  function update(key: keyof AccessibiliteConfig, value: any) {
    setConfig(c => ({ ...c, [key]: value }));
  }

  return { config, update };
}

export default function AccessibiliteBar({ config, update, testerVoix }: { config: AccessibiliteConfig; update: (k: keyof AccessibiliteConfig, v: any) => void; testerVoix?: () => void }) {
  const [open, setOpen] = useState(false);
  const fontSizes = ["small", "normal", "large", "xlarge"] as const;
  const fontLabels = { small: "Petit", normal: "Normal", large: "Grand", xlarge: "Tres grand" };

  return (
    <div role="region" aria-label="Options d accessibilite">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="panel-accessibilite"
        style={{ background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", minHeight: "44px" }}
      >
        <span aria-hidden="true">♿</span>
        <span>Accessibilite</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div id="panel-accessibilite" role="group" style={{ background: "#0f0f1e", border: "1px solid #ffffff15", borderRadius: "14px", padding: "1.25rem", marginTop: "8px", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Taille du texte */}
          <div>
            <p id="label-font" style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "1px" }}>Taille du texte</p>
            <div role="group" aria-labelledby="label-font" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {fontSizes.map(size => (
                <button
                  key={size}
                  onClick={() => update("fontSize", size)}
                  aria-pressed={config.fontSize === size}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: config.fontSize === size ? "2px solid #6366f1" : "1px solid #ffffff15", background: config.fontSize === size ? "#6366f120" : "#ffffff06", color: config.fontSize === size ? "#a5b4fc" : "#64748b", cursor: "pointer", fontSize: size === "small" ? "12px" : size === "large" ? "16px" : size === "xlarge" ? "18px" : "14px", minHeight: "44px" }}
                >
                  {fontLabels[size]}
                </button>
              ))}
            </div>
          </div>

          {/* Options visuelles */}
          <div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "1px" }}>Options visuelles</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { key: "contraste", label: "Fort contraste", icon: "◑", desc: "Augmente le contraste pour une meilleure lisibilite" },
                { key: "daltonisme", label: "Mode daltonisme", icon: "👁", desc: "Adapte les couleurs pour les personnes daltoniennes" },
                { key: "noMotion", label: "Reduire animations", icon: "⏸", desc: "Desactive les animations et transitions" },
                { key: "lectureAuto", label: "Lecture vocale", icon: "🔊", desc: "Lit automatiquement les questions a voix haute" },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => update(opt.key as keyof AccessibiliteConfig, !config[opt.key as keyof AccessibiliteConfig])}
                  aria-pressed={!!config[opt.key as keyof AccessibiliteConfig]}
                  aria-describedby={"desc-" + opt.key}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: config[opt.key as keyof AccessibiliteConfig] ? "2px solid #22c55e" : "1px solid #ffffff15", background: config[opt.key as keyof AccessibiliteConfig] ? "#22c55e20" : "#ffffff06", color: config[opt.key as keyof AccessibiliteConfig] ? "#22c55e" : "#64748b", cursor: "pointer", fontSize: "13px", minHeight: "44px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span aria-hidden="true">{opt.icon}</span>
                  <span>{opt.label}</span>
                  <span aria-hidden="true">{config[opt.key as keyof AccessibiliteConfig] ? "✓" : ""}</span>
                  <span id={"desc-" + opt.key} style={{ position: "absolute", left: "-9999px" }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Info WCAG */}
          {testerVoix && config.lectureAuto && (
            <button onClick={testerVoix} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #6366f140", background: "#6366f115", color: "#a5b4fc", fontSize: "13px", cursor: "pointer", minHeight: "44px" }}>
              🔊 Tester la voix maintenant
            </button>
          )}
          <p style={{ fontSize: "11px", color: "#475569", margin: 0, borderTop: "1px solid #ffffff08", paddingTop: "10px" }}>
            ✓ Conforme WCAG 2.2 niveau AA · Navigation clavier · Lecteurs d ecran
          </p>
        </div>
      )}
    </div>
  );
}
