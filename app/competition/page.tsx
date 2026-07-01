"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const SUJETS_ALEATOIRES = [
  { matiere: "Philosophie", sujet: "La liberte" },
  { matiere: "Philosophie", sujet: "Le bonheur" },
  { matiere: "Histoire-Geo", sujet: "La Revolution francaise" },
  { matiere: "Histoire-Geo", sujet: "La Guerre froide" },
  { matiere: "SES", sujet: "La mondialisation" },
  { matiere: "Francais", sujet: "Le roman realiste" },
  { matiere: "Informatique", sujet: "L intelligence artificielle" },
  { matiere: "Anglais", sujet: "Climate change" },
];

function genererCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Competition() {
  const [page, setPage] = useState("accueil");
  const [pseudo, setPseudo] = useState("");
  const [code, setCode] = useState("");
  const [codeRejoint, setCodeRejoint] = useState("");
  const [salle, setSalle] = useState<any>(null);
  const [joueurs, setJoueurs] = useState<any[]>([]);
  const [load, setLoad] = useState(false);
  const [erreur, setErreur] = useState("");
  const [user, setUser] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [rep, setRep] = useState("");
  const [n, setN] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [genBilan, setGenBilan] = useState(false);
  const [monId, setMonId] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
  }, []);

  useEffect(() => {
    if (!salle) return;
    const channel = supabase.channel("salle-" + salle.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "salle_joueurs", filter: "salle_id=eq." + salle.id }, () => {
        chargerJoueurs(salle.id);
      })
      .subscribe();
    chargerJoueurs(salle.id);
    return () => { supabase.removeChannel(channel); };
  }, [salle]);

  async function chargerJoueurs(salleId: string) {
    const { data } = await supabase.from("salle_joueurs").select("*").eq("salle_id", salleId).order("score", { ascending: false });
    if (data) setJoueurs(data);
  }

  async function creerSalle() {
    if (!pseudo.trim()) { setErreur("Entrez votre pseudo"); return; }
    setLoad(true); setErreur("");
    const sujetAleatoire = SUJETS_ALEATOIRES[Math.floor(Math.random() * SUJETS_ALEATOIRES.length)];
    const newCode = genererCode();
    const { data: salleData, error } = await supabase.from("salles").insert({
      code: newCode,
      matiere: sujetAleatoire.matiere,
      sujet: sujetAleatoire.sujet,
      niveau: "Intermediaire",
      createur_id: user?.id || null
    }).select().single();
    if (error) { setErreur("Erreur creation salle"); setLoad(false); return; }
    const { data: joueurData } = await supabase.from("salle_joueurs").insert({
      salle_id: salleData.id,
      user_id: user?.id || null,
      pseudo: pseudo.trim()
    }).select().single();
    setMonId(joueurData?.id || "");
    setSalle(salleData);
    setCode(newCode);
    setLoad(false);
    setPage("salle");
  }

  async function rejoindre() {
    if (!pseudo.trim()) { setErreur("Entrez votre pseudo"); return; }
    if (!codeRejoint.trim()) { setErreur("Entrez le code de la salle"); return; }
    setLoad(true); setErreur("");
    const { data: salleData, error } = await supabase.from("salles").select("*").eq("code", codeRejoint.toUpperCase()).single();
    if (error || !salleData) { setErreur("Salle introuvable"); setLoad(false); return; }
    const { data: joueurData } = await supabase.from("salle_joueurs").insert({
      salle_id: salleData.id,
      user_id: user?.id || null,
      pseudo: pseudo.trim()
    }).select().single();
    setMonId(joueurData?.id || "");
    setSalle(salleData);
    setCode(codeRejoint.toUpperCase());
    setLoad(false);
    setPage("salle");
  }

  async function demarrer() {
    if (!salle) return;
    setMsgs([]); setN(0); setScore(null);
    setLoad(true);
    const prompt = "Tu es un examinateur de " + salle.matiere + " pour le baccalaureat francais. Niveau : Intermediaire. Le sujet est : " + salle.sujet + ". Pose UNE seule question a la fois. Rebondis sur les reponses. Apres exactement 6 echanges, ecris uniquement : FIN_DE_SESSION";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Commence l examen." }], systemPrompt: prompt })
    });
    const data = await res.json();
    setMsgs([{ role: "assistant", content: data.content }]);
    setLoad(false);
    setPage("chat");
  }

  async function envoyer() {
    if (!rep.trim() || load) return;
    const newMsgs = [...msgs, { role: "user", content: rep }];
    setMsgs(newMsgs); setRep(""); setLoad(true);
    const nb = n + 1; setN(nb);
    const prompt = "Tu es un examinateur de " + salle.matiere + ". Sujet : " + salle.sujet + ". Apres 6 echanges ecris FIN_DE_SESSION.";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMsgs, systemPrompt: prompt })
    });
    const data = await res.json();
    if (data.content.includes("FIN_DE_SESSION") || nb >= 6) {
      const texte = data.content.replace("FIN_DE_SESSION", "").trim();
      if (texte) setMsgs([...newMsgs, { role: "assistant", content: texte }]);
      await calculerScore([...newMsgs, { role: "assistant", content: texte }], nb);
    } else {
      setMsgs([...newMsgs, { role: "assistant", content: data.content }]);
    }
    setLoad(false);
  }

  async function calculerScore(finalMsgs: any[], nb: number) {
    setGenBilan(true);
    const transcription = finalMsgs.map((m: any) => (m.role === "assistant" ? "Examinateur: " : "Eleve: ") + m.content).join("\n\n");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Session de " + salle.matiere + " sur " + salle.sujet + ":\n\n" + transcription + "\n\nDonne uniquement un JSON: {\"score\": 0-20}" }], systemPrompt: "Correcteur bienveillant. JSON uniquement." })
    });
    const data = await res.json();
    let sc = 12;
    try { sc = JSON.parse(data.content.replace(/```json|```/g, "").trim()).score; } catch {}
    setScore(sc);
    await supabase.from("salle_joueurs").update({ score: sc, termine: true }).eq("id", monId);
    setGenBilan(false);
    setPage("classement");
  }

  const c = "#6366f1";

  if (page === "accueil") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏆</div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Mode Competition</h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>Defiez vos amis sur le meme sujet et comparez vos scores !</p>
        </div>
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>Votre pseudo</label>
          <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Ex : Wilfried, Lucas..." style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "1rem" }} />
          <button onClick={creerSalle} disabled={load || !pseudo.trim()} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "10px", opacity: load ? 0.6 : 1 }}>
            🎮 Creer une salle
          </button>
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginBottom: "10px" }}>ou</div>
          <input value={codeRejoint} onChange={e => setCodeRejoint(e.target.value.toUpperCase())} placeholder="Code de la salle (ex: ABC123)" style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "2px" }} />
          <button onClick={rejoindre} disabled={load || !pseudo.trim() || !codeRejoint.trim()} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: load ? 0.6 : 1 }}>
            🚀 Rejoindre une salle
          </button>
          {erreur && <div style={{ marginTop: "10px", padding: "8px 12px", background: "#ef444420", border: "1px solid #ef444440", borderRadius: "8px", color: "#ef4444", fontSize: "13px" }}>{erreur}</div>}
        </div>
        <div style={{ textAlign: "center" }}>
          <a href="/" style={{ fontSize: "13px", color: "#475569", textDecoration: "none" }}>← Retour a l accueil</a>
        </div>
      </div>
    </main>
  );

  if (page === "salle") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎮</div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Salle de competition</h2>
          <div style={{ display: "inline-block", background: "#f59e0b20", border: "1px solid #f59e0b44", borderRadius: "12px", padding: "8px 20px", marginTop: "8px" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#f59e0b", letterSpacing: "4px" }}>{code}</span>
          </div>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>Partagez ce code avec vos amis</p>
        </div>

        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Sujet impose</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>{salle?.matiere}</div>
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>« {salle?.sujet} »</div>
        </div>

        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Joueurs ({joueurs.length})</div>
          {joueurs.map((j, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: j.pseudo === pseudo ? "#6366f120" : "#ffffff04", border: j.pseudo === pseudo ? "1px solid #6366f140" : "1px solid #ffffff08", borderRadius: "10px", marginBottom: "6px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#fff" }}>{j.pseudo[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{j.pseudo} {j.pseudo === pseudo ? "(vous)" : ""}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>{j.termine ? "Termine" : "En attente..."}</div>
              </div>
              {j.score !== null && <div style={{ fontSize: "18px", fontWeight: 800, color: j.score >= 16 ? "#22c55e" : j.score >= 13 ? "#6366f1" : "#f59e0b" }}>{j.score}/20</div>}
            </div>
          ))}
        </div>

        <button onClick={demarrer} disabled={load} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontSize: "16px", fontWeight: 700, cursor: "pointer", opacity: load ? 0.6 : 1 }}>
          {load ? "Preparation..." : "Je suis pret - Commencer mon oral !"}
        </button>
      </div>
    </main>
  );

  if (page === "chat") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "680px", display: "flex", flexDirection: "column", height: "92vh", background: "#0f0f1e", border: "1px solid #6366f133", borderRadius: "20px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ffffff08", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#6366f112" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", margin: 0 }}>Oral de competition</p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{salle?.matiere} - {salle?.sujet}</p>
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#6366f1" }}>Q {n}/6</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "12px" }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-start" : "flex-end" }}>
              <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: m.role === "assistant" ? "16px 16px 16px 4px" : "16px 16px 4px 16px", background: m.role === "assistant" ? "#1e293b" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "14px", lineHeight: 1.7, whiteSpace: "pre-line" }}>{m.content}</div>
            </div>
          ))}
          {(load || genBilan) && (
            <div style={{ display: "flex" }}>
              <div style={{ padding: "10px 14px", background: "#1e293b", borderRadius: "16px 16px 16px 4px", color: "#64748b", fontSize: "13px" }}>
                {genBilan ? "Calcul de votre score..." : "L examinateur reflechit..."}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #ffffff08", background: "#0a0a1a", display: "flex", gap: "8px" }}>
          <textarea value={rep} onChange={e => setRep(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }} placeholder="Tapez votre reponse..." rows={2} style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #ffffff10", background: "#ffffff08", color: "#fff", fontSize: "14px", resize: "none", fontFamily: "inherit", outline: "none" }} />
          <button onClick={envoyer} disabled={!rep.trim() || load} style={{ width: "42px", height: "42px", borderRadius: "10px", border: "none", background: rep.trim() && !load ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#ffffff10", color: "#fff", fontSize: "18px", cursor: "pointer" }}>↑</button>
        </div>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "52px", marginBottom: "8px" }}>🏆</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Classement final !</h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>{salle?.matiere} - {salle?.sujet}</p>
        </div>
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          {joueurs.sort((a, b) => (b.score || 0) - (a.score || 0)).map((j, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: j.pseudo === pseudo ? "#6366f115" : i === 0 ? "#f59e0b10" : "#ffffff04", border: j.pseudo === pseudo ? "1px solid #6366f130" : i === 0 ? "1px solid #f59e0b30" : "1px solid #ffffff08", borderRadius: "12px", marginBottom: "8px" }}>
              <div style={{ fontSize: "20px", width: "28px", textAlign: "center" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i + 1)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{j.pseudo} {j.pseudo === pseudo ? "(vous)" : ""}</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>{j.termine ? "Termine" : "En cours..."}</div>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: (j.score || 0) >= 16 ? "#22c55e" : (j.score || 0) >= 13 ? "#6366f1" : "#f59e0b" }}>{j.score !== null ? j.score + "/20" : "..."}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button onClick={() => setPage("salle")} style={{ padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Rejouer</button>
          <a href="/" style={{ padding: "13px", borderRadius: "12px", border: "1px solid #ffffff12", background: "transparent", color: "#94a3b8", fontSize: "14px", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>Accueil</a>
        </div>
      </div>
    </main>
  );
}
