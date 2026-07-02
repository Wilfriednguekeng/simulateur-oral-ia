"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const NIVEAUX_PROGRESSION = [
  { niveau: 1, label: "Debutant", emoji: "🌱", min: 0, max: 5, couleur: "#22c55e", desc: "Vous commencez votre preparation" },
  { niveau: 2, label: "Apprenti", emoji: "📗", min: 6, max: 15, couleur: "#3b82f6", desc: "Vous progressez bien !" },
  { niveau: 3, label: "Intermediaire", emoji: "📘", min: 16, max: 30, couleur: "#6366f1", desc: "Vous maitrisez les bases" },
  { niveau: 4, label: "Avance", emoji: "📙", min: 31, max: 50, couleur: "#f59e0b", desc: "Votre niveau est solide" },
  { niveau: 5, label: "Expert", emoji: "🏆", min: 51, max: 999, couleur: "#ef4444", desc: "Vous etes pret pour le bac !" },
];

const BADGES = [
  { id: "first", emoji: "🎯", label: "Premiere session", desc: "Completer sa premiere session", condition: (s: any[]) => s.length >= 1 },
  { id: "five", emoji: "🔥", label: "En feu", desc: "5 sessions completees", condition: (s: any[]) => s.length >= 5 },
  { id: "ten", emoji: "💪", label: "Assidu", desc: "10 sessions completees", condition: (s: any[]) => s.length >= 10 },
  { id: "perfect", emoji: "⭐", label: "Parfait", desc: "Obtenir 20/20", condition: (s: any[]) => s.some((x: any) => x.score >= 20) },
  { id: "ace", emoji: "🎓", label: "As de l oral", desc: "Obtenir 18+ trois fois", condition: (s: any[]) => s.filter((x: any) => x.score >= 18).length >= 3 },
  { id: "polyglot", emoji: "🌍", label: "Curieux", desc: "Essayer 3 matieres differentes", condition: (s: any[]) => new Set(s.map((x: any) => x.matiere)).size >= 3 },
  { id: "champion", emoji: "🏆", label: "Champion", desc: "Moyenne superieure a 15", condition: (s: any[]) => s.length >= 5 && s.reduce((a: number, x: any) => a + x.score, 0) / s.length >= 15 },
  { id: "marathoner", emoji: "🏃", label: "Marathonien", desc: "50 sessions completees", condition: (s: any[]) => s.length >= 50 },
];

export default function Profil() {
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [load, setLoad] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      if (data.session?.user) chargerSessions();
      else setLoad(false);
    });
  }, []);

  async function chargerSessions() {
    const { data } = await supabase.from("sessions").select("*").order("created_at", { ascending: false });
    if (data) setSessions(data);
    setLoad(false);
  }

  const totalSessions = sessions.length;
  const moyScore = totalSessions > 0 ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / totalSessions) : 0;
  const meilleurScore = totalSessions > 0 ? Math.max(...sessions.map(s => s.score)) : 0;
  const niveauActuel = NIVEAUX_PROGRESSION.find(n => totalSessions >= n.min && totalSessions <= n.max) || NIVEAUX_PROGRESSION[0];
  const niveauSuivant = NIVEAUX_PROGRESSION[niveauActuel.niveau] || null;
  const progressionNiveau = niveauSuivant ? Math.round(((totalSessions - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100) : 100;
  const badgesDebloques = BADGES.filter(b => b.condition(sessions));
  const badgesVerrouilles = BADGES.filter(b => !b.condition(sessions));
  const matieresFavorites = Object.entries(sessions.reduce((acc: any, s) => { acc[s.matiere] = (acc[s.matiere] || 0) + 1; return acc; }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);

  if (load) return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ color: "#64748b", fontSize: "16px" }}>Chargement...</div>
    </main>
  );

  if (!user) return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Connexion requise</h2>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "1.5rem" }}>Connectez-vous pour voir votre profil et suivre votre progression.</p>
        <a href="/login" style={{ padding: "13px 24px", borderRadius: "12px", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", fontSize: "15px", fontWeight: 700, textDecoration: "none" }}>Se connecter</a>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", fontFamily: "system-ui,sans-serif", color: "#fff", padding: "1rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", paddingTop: "2rem" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0 }}>Mon Profil</h1>
          <a href="/" style={{ fontSize: "13px", color: "#475569", textDecoration: "none" }}>← Accueil</a>
        </div>

        {/* Niveau */}
        <div style={{ background: niveauActuel.couleur + "15", border: "1px solid " + niveauActuel.couleur + "33", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "1rem" }}>
            <div style={{ fontSize: "52px" }}>{niveauActuel.emoji}</div>
            <div>
              <div style={{ fontSize: "12px", color: niveauActuel.couleur, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Niveau {niveauActuel.niveau}</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#fff" }}>{niveauActuel.label}</div>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>{niveauActuel.desc}</div>
            </div>
          </div>
          {niveauSuivant && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                <span>Progression vers {niveauSuivant.label}</span>
                <span>{totalSessions}/{niveauSuivant.min} sessions</span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "#ffffff10", borderRadius: "4px" }}>
                <div style={{ width: progressionNiveau + "%", height: "100%", background: "linear-gradient(90deg," + niveauActuel.couleur + "," + (niveauSuivant?.couleur || niveauActuel.couleur) + ")", borderRadius: "4px", transition: "width 0.5s" }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginBottom: "1rem" }}>
          {[
            { v: totalSessions, l: "Sessions", e: "🎯" },
            { v: moyScore + "/20", l: "Moyenne", e: "📊" },
            { v: meilleurScore + "/20", l: "Record", e: "🏆" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "14px", padding: "14px", textAlign: "center" }}>
              <div style={{ fontSize: "22px", marginBottom: "4px" }}>{s.e}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>{s.v}</div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Matieres favorites */}
        {matieresFavorites.length > 0 && (
          <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>📚 Matieres les plus pratiquees</div>
            {matieresFavorites.map(([mat, count]: any, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < matieresFavorites.length - 1 ? "1px solid #ffffff08" : "none" }}>
                <span style={{ fontSize: "14px", color: "#e2e8f0" }}>{mat}</span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>{count} session{count > 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}

        {/* Badges debloques */}
        <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>🏅 Badges ({badgesDebloques.length}/{BADGES.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "8px" }}>
            {badgesDebloques.map(b => (
              <div key={b.id} style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", marginBottom: "4px" }}>{b.emoji}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#f59e0b" }}>{b.label}</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{b.desc}</div>
              </div>
            ))}
            {badgesVerrouilles.map(b => (
              <div key={b.id} style={{ background: "#ffffff04", border: "1px solid #ffffff08", borderRadius: "12px", padding: "12px", textAlign: "center", opacity: 0.5 }}>
                <div style={{ fontSize: "28px", marginBottom: "4px", filter: "grayscale(1)" }}>{b.emoji}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>{b.label}</div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Historique recent */}
        {sessions.length > 0 && (
          <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>📋 Sessions recentes</div>
            {sessions.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 4 ? "1px solid #ffffff08" : "none" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>{s.matiere} — {s.sujet}</div>
                  <div style={{ fontSize: "11px", color: "#475569" }}>{new Date(s.created_at).toLocaleDateString("fr-FR")} · {s.questions} questions · {s.niveau}</div>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: s.score >= 16 ? "#22c55e" : s.score >= 13 ? "#6366f1" : s.score >= 10 ? "#f59e0b" : "#ef4444" }}>{s.score}/20</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
