"use client";
import { useState, useRef, useEffect } from "react";
type Msg = { role: string; content: string };
const MATIERES = [
  { id: "philo", label: "Philosophie", emoji: "🧠", color: "#8b5cf6", bg: "#8b5cf622" },
  { id: "histoire", label: "Histoire-Geo", emoji: "🌍", color: "#3b82f6", bg: "#3b82f622" },
  { id: "francais", label: "Francais", emoji: "📚", color: "#ec4899", bg: "#ec489922" },
  { id: "ses", label: "SES", emoji: "📈", color: "#f59e0b", bg: "#f59e0b22" },
  { id: "svt", label: "Biologie SVT", emoji: "🔬", color: "#22c55e", bg: "#22c55e22" },
  { id: "maths", label: "Mathematiques", emoji: "📐", color: "#06b6d4", bg: "#06b6d422" },
  { id: "anglais", label: "Anglais", emoji: "🇬🇧", color: "#f97316", bg: "#f9731622" },
  { id: "info", label: "Informatique", emoji: "💻", color: "#a855f7", bg: "#a855f722" },
  { id: "droit", label: "Droit", emoji: "⚖️", color: "#14b8a6", bg: "#14b8a622" },
  { id: "eco", label: "Economie", emoji: "💰", color: "#84cc16", bg: "#84cc1622" },
  { id: "sport", label: "EPS / Sport", emoji: "🏃", color: "#ef4444", bg: "#ef444422" },
  { id: "autre", label: "Autre", emoji: "✨", color: "#f43f5e", bg: "#f43f5e22" },
];
const SUJETS: Record<string,string[]> = {
  philo:["La liberte","La conscience","Le bonheur","La verite","La justice","Le temps","L art","La nature"],
  histoire:["La Revolution francaise","La 2e Guerre mondiale","La Guerre froide","La decolonisation","L Europe","La 1ere Guerre mondiale"],
  francais:["Le roman realiste","La poesie lyrique","Le theatre","L autobiographie","Le romantisme","Le surrealisme"],
  ses:["Le chomage","La mondialisation","Les inegalites","La democratie","La croissance economique","Le marche"],
  svt:["La genetique","L evolution","Le systeme nerveux","La photosynthese","La reproduction","L immunologie"],
  maths:["Les fonctions","Les probabilites","La geometrie","Les suites","Les derivees","Les integrales"],
  anglais:["Climate change","Social media","Artificial intelligence","Identity","Immigration","Technology"],
  info:["Les algorithmes","L intelligence artificielle","La cybersecurite","Les reseaux","La cryptographie","Le Big Data","La POO","Les bases de donnees"],
  droit:["Le contrat","La responsabilite civile","Les droits fondamentaux","La justice penale","Le droit du travail","La Constitution"],
  eco:["L inflation","Le PIB","Le libre echange","La politique monetaire","Les inegalites","La mondialisation"],
  sport:["L endurance","La tactique sportive","Le dopage","Le sport et la societe","La performance","L arbitrage"],
  autre:[],
};
const NIVEAUX=[{label:"Debutant",desc:"Bienveillant",color:"#22c55e",e:"🌱"},{label:"Intermediaire",desc:"Niveau bac",color:"#3b82f6",e:"📘"},{label:"Expert",desc:"Niveau prepa",color:"#f59e0b",e:"🔥"}];
const MODES=[{label:"6 questions",desc:"Session rapide",val:6,e:"⚡"},{label:"12 questions",desc:"Session complete",val:12,e:"📘"},{label:"Infini",desc:"Sans limite",val:999,e:"♾️"}];
const TIP = "Structurez en 3 parties : definition, argument, exemple.";
const DUREE_CHRONO = 30 * 60;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
}

export default function Home() {
  const [page, setPage] = useState("accueil");
  const [mat, setMat] = useState<typeof MATIERES[0] | null>(null);
  const [suj, setSuj] = useState("");
  const [matCustom, setMatCustom] = useState("");
  const [niv, setNiv] = useState(1);
  const [mode, setMode] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [rep, setRep] = useState("");
  const [load, setLoad] = useState(false);
  const [n, setN] = useState(0);
  const [bilan, setBilan] = useState<any>(null);
  const [erreur, setErreur] = useState("");
  const [genBilan, setGenBilan] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, moy: 0, scores: [] as number[] });
  const [fiche, setFiche] = useState("");
  const [genFiche, setGenFiche] = useState(false);
  const [showFiche, setShowFiche] = useState(false);
  const [chrono, setChrono] = useState(DUREE_CHRONO);
  const [chronoActif, setChronoActif] = useState(false);
  const [chronoFini, setChronoFini] = useState(false);
  const [historique, setHistorique] = useState<any[]>([]);
  const [showHistorique, setShowHistorique] = useState(false);
  const [scorePartage, setScorePartage] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const chronoRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, load]);

  useEffect(() => {
    if (chronoActif && chrono > 0) {
      chronoRef.current = setTimeout(() => setChrono(c => c - 1), 1000);
    } else if (chrono === 0 && chronoActif) {
      setChronoActif(false);
      setChronoFini(true);
    }
    return () => { if (chronoRef.current) clearTimeout(chronoRef.current); };
  }, [chronoActif, chrono]);

  const matLabel = mat?.id === "autre" && matCustom.trim() ? matCustom.trim() : mat?.label || "";

  async function appelIA(history: Msg[], systemPrompt: string): Promise<string | null> {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, systemPrompt })
      });
      const data = await res.json();
      if (data.error) { setErreur(data.error); return null; }
      return data.content || null;
    } catch (e) { setErreur("Erreur de connexion"); return null; }
  }

  function getPrompt() {
    const limite = MODES[mode].val === 999 ? "Tu peux poser autant de questions que necessaire." : "Apres exactement " + MODES[mode].val + " echanges, ecris uniquement : FIN_DE_SESSION";
    return "Tu es un examinateur de " + matLabel + " pour le baccalaureat francais. Niveau : " + NIVEAUX[niv].label + ". Le sujet est : " + suj + ". Pose UNE seule question a la fois. Rebondis sur les reponses. Ne donne jamais la reponse. " + limite;
  }

  async function genererFiche() {
    if (!mat || !suj) return;
    setGenFiche(true);
    setShowFiche(true);
    const prompt = "Genere une fiche de revision concise pour un oral de bac sur : " + matLabel + " - sujet : " + suj + ". Inclus : 3 definitions cles, 3 auteurs importants avec leurs idees, 3 exemples concrets, 2 citations celebres. Format clair avec emojis.";
    const repIA = await appelIA([{ role: "user", content: prompt }], "Tu es un professeur expert. Redige une fiche de revision claire et structuree.");
    setGenFiche(false);
    if (repIA) setFiche(repIA);
  }

  async function start() {
    if (!mat || !suj.trim()) return;
    if (mat.id === "autre" && !matCustom.trim()) return;
    setMsgs([]); setN(0); setBilan(null); setErreur("");
    setFiche(""); setShowFiche(false);
    setChrono(DUREE_CHRONO); setChronoActif(true); setChronoFini(false);
    setLoad(true);
    const repIA = await appelIA([{ role: "user", content: "Commence l examen." }], getPrompt());
    if (repIA) { setMsgs([{ role: "assistant", content: repIA }]); setPage("chat"); }
    setLoad(false);
  }

  async function send() {
    if (!rep.trim() || load) return;
    const newMsgs: Msg[] = [...msgs, { role: "user", content: rep }];
    setMsgs(newMsgs); setRep(""); setErreur(""); setLoad(true);
    const nb = n + 1; setN(nb);
    const history: Msg[] = newMsgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const repIA = await appelIA(history, getPrompt());
    if (repIA) {
      const limite = MODES[mode].val;
      if (repIA.includes("FIN_DE_SESSION") || (limite !== 999 && nb >= limite)) {
        const texte = repIA.replace("FIN_DE_SESSION", "").trim();
        const finalMsgs = texte ? [...newMsgs, { role: "assistant", content: texte }] : newMsgs;
        if (texte) setMsgs(finalMsgs);
        await terminer(finalMsgs, nb);
      } else {
        setMsgs([...newMsgs, { role: "assistant", content: repIA }]);
      }
    }
    setLoad(false);
  }

  async function terminer(currentMsgs?: Msg[], currentN?: number) {
    setChronoActif(false);
    const finalMsgs = currentMsgs || msgs;
    const finalN = currentN !== undefined ? currentN : n;
    const tempsUtilise = DUREE_CHRONO - chrono;
    if (finalN === 0) {
      setBilan({ score: 0, pts: "Aucune reponse fournie.", axes: "Repondez aux questions.", conseil: "Lancez une nouvelle session.", n: 0, temps: tempsUtilise });
      setPage("bilan"); return;
    }
    setGenBilan(true); setPage("bilan");
    const transcription = finalMsgs.map(m => (m.role === "assistant" ? "Examinateur: " : "Eleve: ") + m.content).join("\n\n");
    const bilanPrompt = "Session orale de " + matLabel + " sur: " + suj + ".\n\n" + transcription + "\n\nBilan JSON:\n{\"score\": 0-20, \"pts\": \"points forts\", \"axes\": \"axes amelioration\", \"conseil\": \"conseil concret\"}\nJSON uniquement.";
    const repIA = await appelIA([{ role: "user", content: bilanPrompt }], "Correcteur bienveillant. JSON valide uniquement.");
    setGenBilan(false);
    if (repIA) {
      try {
        const parsed = JSON.parse(repIA.replace(/```json|```/g, "").trim());
        const ns = [...stats.scores, Number(parsed.score)];
        setStats({ sessions: stats.sessions + 1, moy: Math.round(ns.reduce((a: number, b: number) => a + b, 0) / ns.length), scores: ns });
        const entry = { ...parsed, n: finalN, temps: tempsUtilise, matiere: matLabel, sujet: suj, date: new Date().toLocaleDateString("fr-FR") };
        setBilan(entry);
        setHistorique(h => [entry, ...h].slice(0, 20));
        setScorePartage("Simulateur d Oral IA\n" + matLabel + " - " + suj + "\nScore : " + parsed.score + "/20\nPoints forts : " + parsed.pts + "\nConseil : " + parsed.conseil);
      } catch {
        setBilan({ score: 12, pts: "Bonne participation.", axes: "Continuez a pratiquer.", conseil: "Faites plusieurs sessions.", n: finalN, temps: tempsUtilise });
      }
    }
  }

  const c = mat?.color || "#6366f1";
  const sc = bilan?.score;
  const scC = sc >= 16 ? "#22c55e" : sc >= 13 ? "#6366f1" : sc >= 10 ? "#f59e0b" : "#ef4444";
  const maxQ = MODES[mode].val;
  const chronoColor = chrono < 300 ? "#ef4444" : chrono < 600 ? "#f59e0b" : "#22c55e";

  if (page === "accueil") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", fontFamily: "system-ui,sans-serif", color: "#fff", padding: "1rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto", paddingTop: "2rem" }}>
        <div style={{ textAlign: "center", paddingBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#8b5cf620", border: "1px solid #8b5cf640", borderRadius: "100px", padding: "5px 14px", fontSize: "12px", color: "#a78bfa", marginBottom: "1.25rem" }}>Preparez votre oral avec IA</div>
          <h1 style={{ fontSize: "clamp(30px,6vw,52px)", fontWeight: 800, margin: "0 0 10px", background: "linear-gradient(135deg,#fff,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Simulateur d Oral IA</h1>
          <p style={{ fontSize: "16px", color: "#64748b", margin: "0 auto 1.5rem", maxWidth: "420px" }}>Entrainez-vous face a un examinateur virtuel intelligent.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "1rem" }}>
            {stats.sessions > 0 && <div style={{ display: "inline-flex", gap: "1.5rem", background: "#ffffff08", border: "1px solid #ffffff10", borderRadius: "10px", padding: "8px 18px", fontSize: "13px", color: "#94a3b8" }}>
              <span>Sessions : {stats.sessions}</span>
              <span>Moyenne : {stats.moy}/20</span>
            </div>}
            {historique.length > 0 && <button onClick={() => setShowHistorique(true)} style={{ background: "#6366f120", border: "1px solid #6366f140", borderRadius: "10px", padding: "8px 18px", fontSize: "13px", color: "#a5b4fc", cursor: "pointer" }}>📊 Historique</button>}
          </div>
        </div>

        {showHistorique && (
          <div style={{ background: "#0f0f1e", border: "1px solid #ffffff15", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>📊 Historique des sessions</div>
              <button onClick={() => setShowHistorique(false)} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>
            {historique.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#ffffff06", borderRadius: "10px", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{h.matiere} — {h.sujet}</div>
                  <div style={{ fontSize: "11px", color: "#475569" }}>{h.date} · {h.n} questions · {Math.floor(h.temps / 60)}min</div>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: h.score >= 16 ? "#22c55e" : h.score >= 13 ? "#6366f1" : h.score >= 10 ? "#f59e0b" : "#ef4444" }}>{h.score}/20</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>1. Choisissez votre matiere</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: "8px" }}>
            {MATIERES.map(m => (
              <button key={m.id} onClick={() => { setMat(m); setSuj(""); setMatCustom(""); setFiche(""); setShowFiche(false); }} style={{ padding: "14px 6px", borderRadius: "14px", border: mat?.id === m.id ? "2px solid " + m.color : "1px solid #ffffff10", background: mat?.id === m.id ? m.bg : "#ffffff04", color: mat?.id === m.id ? m.color : "#64748b", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: "26px", marginBottom: "4px" }}>{m.emoji}</div>
                <div style={{ fontSize: "11px", fontWeight: mat?.id === m.id ? 700 : 400 }}>{m.label}</div>
              </button>
            ))}
          </div>
          {mat?.id === "autre" && <div style={{ marginTop: "12px" }}>
            <input value={matCustom} onChange={e => setMatCustom(e.target.value)} placeholder="Nom de votre matiere (ex: Droit, Avocat, Marketing...)" style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #f43f5e44", background: "#f43f5e11", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          </div>}
        </div>

        {mat && <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>2. Choisissez un sujet</div>
          {(SUJETS[mat.id] || []).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {(SUJETS[mat.id] || []).map(s => (
              <button key={s} onClick={() => setSuj(s)} style={{ padding: "7px 14px", borderRadius: "100px", border: suj === s ? "1.5px solid " + mat.color : "1px solid #ffffff12", background: suj === s ? mat.bg : "transparent", color: suj === s ? mat.color : "#64748b", fontSize: "13px", cursor: "pointer", fontWeight: suj === s ? 600 : 400 }}>{s}</button>
            ))}
          </div>}
          <input value={suj} onChange={e => setSuj(e.target.value)} placeholder={mat.id === "autre" ? "Tapez votre sujet..." : "Ou tapez votre propre sujet..."} style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          {suj && <button onClick={genererFiche} disabled={genFiche} style={{ marginTop: "10px", padding: "8px 16px", borderRadius: "10px", border: "1px solid #f59e0b44", background: "#f59e0b15", color: "#f59e0b", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
            {genFiche ? "Generation en cours..." : "📚 Generer une fiche de revision"}
          </button>}
        </div>}

        {showFiche && <div style={{ background: "#0f0f1e", border: "1px solid #f59e0b33", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#f59e0b" }}>📚 Fiche de revision — {suj}</div>
            <button onClick={() => setShowFiche(false)} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "18px", cursor: "pointer" }}>✕</button>
          </div>
          {genFiche ? <div style={{ color: "#64748b", fontSize: "14px" }}>L IA genere votre fiche...</div> :
            <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.8, whiteSpace: "pre-line" }}>{fiche}</div>}
        </div>}

        {mat && suj && <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>3. Niveau de l examinateur</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
            {NIVEAUX.map((nv, i) => (
              <button key={i} onClick={() => setNiv(i)} style={{ padding: "14px 8px", borderRadius: "14px", border: niv === i ? "2px solid " + nv.color : "1px solid #ffffff10", background: niv === i ? nv.color + "18" : "#ffffff04", color: niv === i ? nv.color : "#64748b", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>{nv.e}</div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{nv.label}</div>
                <div style={{ fontSize: "11px", opacity: .7, marginTop: "2px" }}>{nv.desc}</div>
              </button>
            ))}
          </div>
        </div>}

        {mat && suj && <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>4. Duree de la session</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
            {MODES.map((mo, i) => (
              <button key={i} onClick={() => setMode(i)} style={{ padding: "14px 8px", borderRadius: "14px", border: mode === i ? "2px solid " + c : "1px solid #ffffff10", background: mode === i ? c + "18" : "#ffffff04", color: mode === i ? c : "#64748b", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>{mo.e}</div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{mo.label}</div>
                <div style={{ fontSize: "11px", opacity: .7, marginTop: "2px" }}>{mo.desc}</div>
              </button>
            ))}
          </div>
        </div>}

        {erreur && <div style={{ padding: "10px 14px", background: "#ef444420", border: "1px solid #ef444440", borderRadius: "10px", color: "#ef4444", fontSize: "13px", marginBottom: "1rem" }}>{erreur}</div>}
        {mat && suj && (mat.id !== "autre" || matCustom.trim()) && <button onClick={start} disabled={load} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg," + c + ",#6366f1)", color: "#fff", fontSize: "16px", fontWeight: 700, cursor: "pointer", marginBottom: "1rem", opacity: load ? 0.6 : 1 }}>
          {load ? "Preparation..." : "Commencer l oral en " + (matLabel || mat.label) + " ->"}
        </button>}
        <div style={{ padding: "12px 16px", background: "#ffffff05", border: "1px solid #ffffff08", borderRadius: "12px", fontSize: "13px", color: "#475569", textAlign: "center" }}>{TIP}</div>
      </div>
    </main>
  );

  if (page === "chat") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "680px", display: "flex", flexDirection: "column", height: "92vh", background: "#0f0f1e", border: "1px solid " + c + "33", borderRadius: "20px", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #ffffff08", display: "flex", alignItems: "center", justifyContent: "space-between", background: c + "12" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg," + c + ",#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{mat?.emoji}</div>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", margin: 0 }}>Examinateur IA - {matLabel}</p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{suj} - {NIVEAUX[niv].label}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ textAlign: "center", background: chronoColor + "20", border: "1px solid " + chronoColor + "44", borderRadius: "10px", padding: "4px 10px" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: chronoColor, fontFamily: "monospace" }}>{formatTime(chrono)}</div>
              <div style={{ fontSize: "10px", color: chronoColor, opacity: 0.7 }}>restant</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: c }}>Q {n}{maxQ !== 999 ? " / " + maxQ : ""}</div>
              {maxQ !== 999 && <div style={{ width: "60px", height: "4px", background: "#ffffff10", borderRadius: "2px", marginTop: "4px" }}>
                <div style={{ width: Math.min(Math.round((n / maxQ) * 100), 100) + "%", height: "100%", background: "linear-gradient(90deg," + c + ",#6366f1)", borderRadius: "2px", transition: "width .4s" }}></div>
              </div>}
            </div>
            <button onClick={() => terminer()} disabled={load} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #ef444440", background: "#ef444415", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontWeight: 600, opacity: load ? 0.5 : 1 }}>Terminer</button>
          </div>
        </div>
        {chronoFini && <div style={{ padding: "10px 14px", background: "#ef444420", color: "#ef4444", fontSize: "13px", textAlign: "center", fontWeight: 600 }}>⏰ Temps ecoule ! Terminez votre reponse et cliquez Terminer.</div>}
        {erreur && <div style={{ padding: "10px 14px", background: "#ef444420", color: "#ef4444", fontSize: "13px", borderBottom: "1px solid #ef444430" }}>{erreur}</div>}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-start" : "flex-end", alignItems: "flex-end", gap: "8px" }}>
              {m.role === "assistant" && <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg," + c + ",#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{mat?.emoji}</div>}
              <div style={{ maxWidth: "75%", padding: "11px 15px", borderRadius: m.role === "assistant" ? "16px 16px 16px 4px" : "16px 16px 4px 16px", background: m.role === "assistant" ? "#1e293b" : "linear-gradient(135deg," + c + ",#6366f1)", color: "#fff", fontSize: "14px", lineHeight: 1.7, border: m.role === "assistant" ? "1px solid #ffffff0f" : "none", whiteSpace: "pre-line" }}>{m.content}</div>
            </div>
          ))}
          {load && <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg," + c + ",#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>{mat?.emoji}</div>
            <div style={{ padding: "11px 16px", background: "#1e293b", border: "1px solid #ffffff0f", borderRadius: "16px 16px 16px 4px", display: "flex", gap: "5px" }}>
              {[0, 150, 300].map(d => <span key={d} style={{ width: "7px", height: "7px", borderRadius: "50%", background: c, display: "inline-block", animation: "b 1.2s infinite", animationDelay: d + "ms", opacity: .8 }}></span>)}
            </div>
          </div>}
          <div ref={end} />
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #ffffff08", background: "#0a0a1a", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea value={rep} onChange={e => setRep(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Tapez votre reponse... (Entree pour envoyer)" rows={2} style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #ffffff10", background: "#ffffff08", color: "#fff", fontSize: "14px", resize: "none", fontFamily: "inherit", lineHeight: 1.5, outline: "none" }} />
          <button onClick={send} disabled={!rep.trim() || load} style={{ width: "42px", height: "42px", borderRadius: "12px", border: "none", background: rep.trim() && !load ? "linear-gradient(135deg," + c + ",#6366f1)" : "#ffffff10", color: "#fff", cursor: rep.trim() && !load ? "pointer" : "not-allowed", fontSize: "20px", flexShrink: 0 }}>↑</button>
        </div>
      </div>
      <style>{"@keyframes b{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}"}</style>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          {genBilan ? (
            <div>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>⏳</div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Analyse en cours...</h2>
              <p style={{ fontSize: "14px", color: "#64748b" }}>L IA evalue vos reponses</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "52px", marginBottom: "8px" }}>{sc >= 16 ? "🏆" : sc >= 13 ? "🎯" : sc >= 10 ? "📈" : "💪"}</div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Session terminee !</h2>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>{matLabel} - {suj}</p>
            </>
          )}
        </div>
        {!genBilan && bilan && <>
          <div style={{ background: "#ffffff06", border: "1px solid " + scC + "33", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>Score IA</div>
                <div style={{ fontSize: "44px", fontWeight: 800, color: scC, lineHeight: 1 }}>{sc}<span style={{ fontSize: "18px", color: "#475569" }}>/20</span></div>
                <div style={{ fontSize: "13px", color: scC, fontWeight: 600, marginTop: "3px" }}>{sc >= 16 ? "Excellent !" : sc >= 13 ? "Bien" : sc >= 10 ? "Passable" : "A retravailler"}</div>
              </div>
              {stats.sessions > 0 && <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#475569" }}>Moyenne</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#6366f1" }}>{stats.moy}/20</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>{stats.sessions} sessions</div>
              </div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "1.25rem" }}>
              <div style={{ background: "#ffffff05", border: "1px solid #ffffff08", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0" }}>{bilan.n}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>questions</div>
              </div>
              <div style={{ background: "#ffffff05", border: "1px solid #ffffff08", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>{Math.floor((bilan.temps || 0) / 60)}min</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>temps utilise</div>
              </div>
              <div style={{ background: "#ffffff05", border: "1px solid #ffffff08", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: NIVEAUX[niv].color }}>{NIVEAUX[niv].label}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>niveau</div>
              </div>
            </div>
            {[{ e: "⭐", t: "Points forts", v: bilan.pts, col: "#22c55e" }, { e: "🎯", t: "A ameliorer", v: bilan.axes, col: "#f59e0b" }, { e: "💡", t: "Conseil", v: bilan.conseil, col: "#6366f1" }].map(x => x.v && (
              <div key={x.t} style={{ marginBottom: "8px", padding: "10px 12px", background: x.col + "12", border: "1px solid " + x.col + "28", borderRadius: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: x.col, marginBottom: "3px" }}>{x.e} {x.t}</div>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{x.v}</p>
              </div>
            ))}
            {scorePartage && <div style={{ marginTop: "12px" }}>
              <button onClick={() => { navigator.clipboard?.writeText(scorePartage); alert("Score copie ! Partagez-le avec vos amis."); }} style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #22c55e44", background: "#22c55e15", color: "#22c55e", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                🔗 Copier mon score a partager
              </button>
            </div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button onClick={start} style={{ padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg," + c + ",#6366f1)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Rejouer</button>
            <button onClick={() => setPage("accueil")} style={{ padding: "13px", borderRadius: "12px", border: "1px solid #ffffff12", background: "transparent", color: "#94a3b8", fontSize: "14px", cursor: "pointer" }}>Accueil</button>
          </div>
        </>}
      </div>
    </main>
  );
}
