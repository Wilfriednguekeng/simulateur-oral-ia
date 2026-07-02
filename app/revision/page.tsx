"use client";
import { useState } from "react";

type Question = {
  question: string;
  options: string[];
  bonne: number;
  explication: string;
};

const MATIERES = [
  { id: "philo", label: "Philosophie", emoji: "🧠", color: "#8b5cf6" },
  { id: "histoire", label: "Histoire-Geo", emoji: "🌍", color: "#3b82f6" },
  { id: "francais", label: "Francais", emoji: "📚", color: "#ec4899" },
  { id: "ses", label: "SES", emoji: "📈", color: "#f59e0b" },
  { id: "svt", label: "Biologie SVT", emoji: "🔬", color: "#22c55e" },
  { id: "maths", label: "Mathematiques", emoji: "📐", color: "#06b6d4" },
  { id: "anglais", label: "Anglais", emoji: "🇬🇧", color: "#f97316" },
  { id: "info", label: "Informatique", emoji: "💻", color: "#a855f7" },
];

export default function Revision() {
  const [mat, setMat] = useState<typeof MATIERES[0] | null>(null);
  const [sujet, setSujet] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [page, setPage] = useState("accueil");
  const [load, setLoad] = useState(false);
  const [resultats, setResultats] = useState<{q: Question, rep: number}[]>([]);

  async function genererQCM() {
    if (!mat || !sujet.trim()) return;
    setLoad(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: `Genere 5 questions QCM pour un oral de bac sur ${mat.label} - sujet: ${sujet}. Format JSON strict:\n[{"question":"...","options":["A","B","C","D"],"bonne":0,"explication":"..."}]\nJSON uniquement, bonne = index 0-3 de la bonne reponse.` }],
        systemPrompt: "Tu es un professeur expert. Reponds uniquement avec du JSON valide sans markdown."
      })
    });
    const data = await res.json();
    try {
      const parsed = JSON.parse(data.content.replace(/```json|```/g, "").trim());
      setQuestions(parsed);
      setCurrent(0);
      setSelected(null);
      setScore(0);
      setResultats([]);
      setPage("qcm");
    } catch {
      alert("Erreur generation QCM. Reessayez.");
    }
    setLoad(false);
  }

  function repondre(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const q = questions[current];
    if (idx === q.bonne) setScore(s => s + 1);
    setResultats(r => [...r, { q, rep: idx }]);
  }

  function suivant() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
    } else {
      setPage("bilan");
    }
  }

  const c = mat?.color || "#6366f1";

  if (page === "accueil") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📝</div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Revision Express</h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>5 questions QCM generees par IA pour tester vos connaissances avant l oral</p>
        </div>
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Choisissez votre matiere</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: "8px", marginBottom: "1rem" }}>
            {MATIERES.map(m => (
              <button key={m.id} onClick={() => setMat(m)} style={{ padding: "12px 6px", borderRadius: "12px", border: mat?.id === m.id ? "2px solid " + m.color : "1px solid #ffffff10", background: mat?.id === m.id ? m.color + "22" : "#ffffff04", color: mat?.id === m.id ? m.color : "#64748b", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>{m.emoji}</div>
                <div style={{ fontSize: "11px", fontWeight: mat?.id === m.id ? 700 : 400 }}>{m.label}</div>
              </button>
            ))}
          </div>
          <input value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Sujet ou notion (ex: La liberte, La Revolution francaise...)" style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "12px" }} />
          <button onClick={genererQCM} disabled={!mat || !sujet.trim() || load} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: mat ? "linear-gradient(135deg," + c + ",#6366f1)" : "#ffffff10", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: load ? 0.6 : 1 }}>
            {load ? "Generation du QCM en cours..." : "Generer mon QCM →"}
          </button>
        </div>
        <div style={{ textAlign: "center" }}>
          <a href="/" style={{ fontSize: "13px", color: "#475569", textDecoration: "none" }}>← Retour a l accueil</a>
        </div>
      </div>
    </main>
  );

  if (page === "qcm") {
    const q = questions[current];
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
        <div style={{ width: "100%", maxWidth: "600px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "13px", color: "#64748b" }}>{mat?.emoji} {mat?.label} — {sujet}</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: c }}>Q {current + 1}/{questions.length}</div>
          </div>
          <div style={{ width: "100%", height: "6px", background: "#ffffff10", borderRadius: "3px", marginBottom: "1.5rem" }}>
            <div style={{ width: ((current + 1) / questions.length * 100) + "%", height: "100%", background: "linear-gradient(90deg," + c + ",#6366f1)", borderRadius: "3px", transition: "width 0.4s" }}></div>
          </div>
          <div style={{ background: "#0f0f1e", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "17px", fontWeight: 600, color: "#fff", lineHeight: 1.6, margin: "0 0 1.5rem" }}>{q.question}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {q.options.map((opt, i) => {
                let bg = "#ffffff06";
                let border = "1px solid #ffffff10";
                let color = "#e2e8f0";
                if (selected !== null) {
                  if (i === q.bonne) { bg = "#22c55e20"; border = "2px solid #22c55e"; color = "#22c55e"; }
                  else if (i === selected && selected !== q.bonne) { bg = "#ef444420"; border = "2px solid #ef4444"; color = "#ef4444"; }
                  else { bg = "#ffffff04"; color = "#64748b"; }
                }
                return (
                  <button key={i} onClick={() => repondre(i)} style={{ padding: "14px 16px", borderRadius: "12px", border, background: bg, color, fontSize: "14px", textAlign: "left", cursor: selected !== null ? "default" : "pointer", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s" }}>
                    <span style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>{["A","B","C","D"][i]}</span>
                    <span>{opt}</span>
                    {selected !== null && i === q.bonne && <span style={{ marginLeft: "auto" }}>✓</span>}
                    {selected !== null && i === selected && selected !== q.bonne && <span style={{ marginLeft: "auto" }}>✗</span>}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <div style={{ marginTop: "1rem", padding: "12px 14px", background: "#6366f115", border: "1px solid #6366f130", borderRadius: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#a5b4fc", marginBottom: "4px" }}>💡 Explication</div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{q.explication}</p>
              </div>
            )}
          </div>
          {selected !== null && (
            <button onClick={suivant} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg," + c + ",#6366f1)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
              {current < questions.length - 1 ? "Question suivante →" : "Voir mon bilan →"}
            </button>
          )}
        </div>
      </main>
    );
  }

  const pct = Math.round(score / questions.length * 100);
  const scColor = pct >= 80 ? "#22c55e" : pct >= 60 ? "#6366f1" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "52px", marginBottom: "8px" }}>{pct >= 80 ? "🏆" : pct >= 60 ? "🎯" : pct >= 40 ? "📈" : "💪"}</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>QCM termine !</h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>{mat?.label} — {sujet}</p>
        </div>
        <div style={{ background: "#ffffff06", border: "1px solid " + scColor + "33", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "52px", fontWeight: 800, color: scColor }}>{score}/{questions.length}</div>
            <div style={{ fontSize: "14px", color: scColor, fontWeight: 600 }}>{pct}% de bonnes reponses</div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{pct >= 80 ? "Excellent ! Vous etes pret pour l oral." : pct >= 60 ? "Bien ! Quelques points a revoir." : pct >= 40 ? "Passable. Continuez a vous entrainer." : "A retravailler. Consultez la fiche de revision."}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {resultats.map((r, i) => (
              <div key={i} style={{ padding: "10px 14px", background: r.rep === r.q.bonne ? "#22c55e10" : "#ef444410", border: "1px solid " + (r.rep === r.q.bonne ? "#22c55e30" : "#ef444430"), borderRadius: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: r.rep === r.q.bonne ? "#22c55e" : "#ef4444", marginBottom: "4px" }}>{r.rep === r.q.bonne ? "✓ Correct" : "✗ Incorrect"} — Q{i + 1}</div>
                <div style={{ fontSize: "13px", color: "#94a3b8" }}>{r.q.question}</div>
                {r.rep !== r.q.bonne && <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "4px" }}>Bonne reponse : {r.q.options[r.q.bonne]}</div>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button onClick={() => { setCurrent(0); setSelected(null); setScore(0); setResultats([]); setPage("qcm"); }} style={{ padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg," + c + ",#6366f1)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>🔄 Recommencer</button>
          <a href="/" style={{ padding: "13px", borderRadius: "12px", border: "1px solid #ffffff12", background: "transparent", color: "#94a3b8", fontSize: "14px", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>🏠 Accueil</a>
        </div>
      </div>
    </main>
  );
}
