"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const SUJETS = [
  { matiere: "Philosophie", sujet: "La liberte" },
  { matiere: "Philosophie", sujet: "Le bonheur" },
  { matiere: "Histoire-Geo", sujet: "La Revolution francaise" },
  { matiere: "SES", sujet: "La mondialisation" },
  { matiere: "Francais", sujet: "Le roman realiste" },
  { matiere: "Informatique", sujet: "L intelligence artificielle" },
];

export default function Defi() {
  const [page, setPage] = useState("accueil");
  const [user, setUser] = useState<any>(null);
  const [pseudo, setPseudo] = useState("");
  const [defiId, setDefiId] = useState("");
  const [defi, setDefi] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [rep, setRep] = useState("");
  const [load, setLoad] = useState(false);
  const [n, setN] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [adversaire, setAdversaire] = useState<any>(null);
  const [lienPartage, setLienPartage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      if (data.session?.user) {
        setPseudo(data.session.user.email?.split("@")[0] || "");
      }
    });
  }, []);

  async function creerDefi() {
    if (!pseudo.trim()) return;
    setLoad(true);
    const sujet = SUJETS[Math.floor(Math.random() * SUJETS.length)];
    const { data, error } = await supabase.from("defis").insert({
      createur_pseudo: pseudo,
      createur_id: user?.id || null,
      matiere: sujet.matiere,
      sujet: sujet.sujet,
      statut: "attente"
    }).select().single();

    if (error) {
      // Table defis n existe pas encore - utiliser localStorage
      const id = Math.random().toString(36).substring(2, 10).toUpperCase();
      const defiData = { id, pseudo, ...sujet, statut: "attente", score_createur: null, score_adversaire: null };
      localStorage.setItem("defi_" + id, JSON.stringify(defiData));
      setDefi(defiData);
      setDefiId(id);
      const url = window.location.origin + "/defi?id=" + id;
      setLienPartage(url);
      setPage("attente");
    } else {
      setDefi(data);
      setDefiId(data.id);
      const url = window.location.origin + "/defi?id=" + data.id;
      setLienPartage(url);
      setPage("attente");
    }
    setLoad(false);
  }

  async function rejoindreDefi() {
    if (!pseudo.trim() || !defiId.trim()) return;
    setLoad(true);
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("id") || defiId;

    // Essayer Supabase d abord
    const { data } = await supabase.from("defis").select("*").eq("id", idFromUrl).single();
    if (data) {
      setDefi(data);
      setPage("oral");
    } else {
      // Fallback localStorage
      const stored = localStorage.getItem("defi_" + idFromUrl);
      if (stored) {
        setDefi(JSON.parse(stored));
        setPage("oral");
      } else {
        alert("Defi introuvable !");
      }
    }
    setLoad(false);
  }

  async function demarrerOral() {
    setMsgs([]); setN(0); setLoad(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Commence l examen." }],
        systemPrompt: "Tu es un examinateur de " + defi.matiere + ". Sujet : " + defi.sujet + ". Pose UNE question a la fois. Apres 6 echanges ecris FIN_DE_SESSION."
      })
    });
    const d = await res.json();
    setMsgs([{ role: "assistant", content: d.content }]);
    setPage("chat");
    setLoad(false);
  }

  async function envoyer() {
    if (!rep.trim() || load) return;
    const newMsgs = [...msgs, { role: "user", content: rep }];
    setMsgs(newMsgs); setRep(""); setLoad(true);
    const nb = n + 1; setN(nb);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: newMsgs,
        systemPrompt: "Examinateur de " + defi.matiere + " sur " + defi.sujet + ". Apres 6 echanges ecris FIN_DE_SESSION."
      })
    });
    const d = await res.json();
    if (d.content.includes("FIN_DE_SESSION") || nb >= 6) {
      await calculerScore([...newMsgs, { role: "assistant", content: d.content.replace("FIN_DE_SESSION", "").trim() }]);
    } else {
      setMsgs([...newMsgs, { role: "assistant", content: d.content }]);
    }
    setLoad(false);
  }

  async function calculerScore(finalMsgs: any[]) {
    setLoad(true);
    const transcription = finalMsgs.map((m: any) => (m.role === "assistant" ? "Examinateur: " : "Eleve: ") + m.content).join("\n\n");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Evalue cet oral de " + defi.matiere + " sur " + defi.sujet + ":\n\n" + transcription + "\n\nJSON uniquement: {\"score\": 0-20}" }],
        systemPrompt: "Correcteur bienveillant. JSON valide uniquement."
      })
    });
    const d = await res.json();
    let sc = 12;
    try { sc = JSON.parse(d.content.replace(/```json|```/g, "").trim()).score; } catch {}
    setScore(sc);

    // Sauvegarder le score
    const isCreateur = pseudo === defi.createur_pseudo;
    const update = isCreateur ? { score_createur: sc } : { score_adversaire: sc, adversaire_pseudo: pseudo };
    await supabase.from("defis").update(update).eq("id", defi.id);

    setLoad(false);
    setPage("resultat");
  }

  function copierLien() {
    navigator.clipboard?.writeText(lienPartage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) { setDefiId(id); setPage("rejoindre"); }
  }, []);

  if (page === "accueil") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚔️</div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Defis entre amis</h1>
          <p style={{ fontSize: "14px", color: "#64748b" }}>Creez un defi, partagez le lien et comparez vos scores !</p>
        </div>
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>Votre pseudo</label>
          <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Ex : Wilfried" style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "1rem" }} />
          <button onClick={creerDefi} disabled={load || !pseudo.trim()} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "10px", opacity: load ? 0.6 : 1 }}>
            ⚔️ Creer un defi
          </button>
          <div style={{ textAlign: "center", color: "#475569", fontSize: "13px", marginBottom: "10px" }}>ou</div>
          <input value={defiId} onChange={e => setDefiId(e.target.value)} placeholder="Coller le lien ou l ID du defi" style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px" }} />
          <button onClick={rejoindreDefi} disabled={load || !pseudo.trim() || !defiId.trim()} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: load ? 0.6 : 1 }}>
            🚀 Rejoindre le defi
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <a href="/" style={{ fontSize: "13px", color: "#475569", textDecoration: "none" }}>← Retour a l accueil</a>
        </div>
      </div>
    </main>
  );

  if (page === "rejoindre") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚔️</div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Vous avez ete defie !</h2>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "1.5rem" }}>Entrez votre pseudo pour accepter le defi</p>
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem" }}>
          <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Votre pseudo" style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "12px" }} />
          <button onClick={rejoindreDefi} disabled={load || !pseudo.trim()} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
            Accepter le defi ⚔️
          </button>
        </div>
      </div>
    </main>
  );

  if (page === "attente") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚔️</div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Defi cree !</h2>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "1.5rem" }}>Partagez ce lien a votre ami pour qu il releve le defi</p>
        <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", borderRadius: "14px", padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "14px", color: "#f59e0b", fontWeight: 600, marginBottom: "8px" }}>Sujet du defi</div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>{defi?.matiere}</div>
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>« {defi?.sujet} »</div>
        </div>
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "14px", padding: "1rem", marginBottom: "1rem", wordBreak: "break-all", fontSize: "13px", color: "#64748b" }}>
          {lienPartage}
        </div>
        <button onClick={copierLien} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: copied ? "#22c55e" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "10px" }}>
          {copied ? "✅ Lien copie !" : "📋 Copier le lien"}
        </button>
        <button onClick={demarrerOral} disabled={load} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
          {load ? "Preparation..." : "Commencer mon oral en premier →"}
        </button>
      </div>
    </main>
  );

  if (page === "oral") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚔️</div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Defi accepte !</h2>
        <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", borderRadius: "14px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "14px", color: "#f59e0b", fontWeight: 600, marginBottom: "8px" }}>Votre sujet</div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>{defi?.matiere}</div>
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>« {defi?.sujet} »</div>
        </div>
        <button onClick={demarrerOral} disabled={load} style={{ width: "100%", padding: "15px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
          {load ? "Preparation..." : "Je releve le defi ! ⚔️"}
        </button>
      </div>
    </main>
  );

  if (page === "chat") return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "680px", display: "flex", flexDirection: "column", height: "92vh", background: "#0f0f1e", border: "1px solid #f59e0b33", borderRadius: "20px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #ffffff08", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f59e0b12" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", margin: 0 }}>⚔️ Defi — {defi?.matiere}</p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>« {defi?.sujet} »</p>
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#f59e0b" }}>Q {n}/6</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "12px" }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-start" : "flex-end" }}>
              <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: m.role === "assistant" ? "16px 16px 16px 4px" : "16px 16px 4px 16px", background: m.role === "assistant" ? "#1e293b" : "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: "14px", lineHeight: 1.7, whiteSpace: "pre-line" }}>{m.content}</div>
            </div>
          ))}
          {load && <div style={{ padding: "10px 14px", background: "#1e293b", borderRadius: "16px 16px 16px 4px", color: "#64748b", fontSize: "13px", alignSelf: "flex-start" }}>L examinateur reflechit...</div>}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid #ffffff08", background: "#0a0a1a", display: "flex", gap: "8px" }}>
          <textarea value={rep} onChange={e => setRep(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }} placeholder="Tapez votre reponse..." rows={2} style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid #ffffff10", background: "#ffffff08", color: "#fff", fontSize: "14px", resize: "none", fontFamily: "inherit", outline: "none" }} />
          <button onClick={envoyer} disabled={!rep.trim() || load} style={{ width: "42px", height: "42px", borderRadius: "10px", border: "none", background: rep.trim() && !load ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "#ffffff10", color: "#fff", fontSize: "18px", cursor: "pointer" }}>↑</button>
        </div>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "52px", marginBottom: "8px" }}>{(score || 0) >= 16 ? "🏆" : (score || 0) >= 13 ? "🎯" : "💪"}</div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>Votre score !</h2>
          <p style={{ fontSize: "13px", color: "#64748b" }}>{defi?.matiere} — {defi?.sujet}</p>
        </div>
        <div style={{ background: "#ffffff06", border: "1px solid #f59e0b33", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "56px", fontWeight: 800, color: (score || 0) >= 16 ? "#22c55e" : (score || 0) >= 13 ? "#6366f1" : "#f59e0b" }}>{score}<span style={{ fontSize: "22px", color: "#475569" }}>/20</span></div>
          <div style={{ fontSize: "14px", color: "#64748b", marginTop: "8px" }}>Partagez votre score avec votre adversaire !</div>
          <button onClick={() => {
            const txt = "J ai obtenu " + score + "/20 sur le defi oral de " + defi?.matiere + " (" + defi?.sujet + ") ! Peux-tu faire mieux ? " + lienPartage;
            navigator.clipboard?.writeText(txt);
            alert("Score copie !");
          }} style={{ marginTop: "1rem", padding: "10px 20px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            📤 Partager mon score
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button onClick={() => { setPage("attente"); setMsgs([]); setN(0); setScore(null); }} style={{ padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Rejouer</button>
          <a href="/" style={{ padding: "13px", borderRadius: "12px", border: "1px solid #ffffff12", background: "transparent", color: "#94a3b8", fontSize: "14px", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>Accueil</a>
        </div>
      </div>
    </main>
  );
}
