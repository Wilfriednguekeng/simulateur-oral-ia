"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [load, setLoad] = useState(false);
  async function connexion() {
    if (!email.trim()) return;
    setLoad(true);
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setLoad(false);
    setSent(true);
  }
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎓</div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>Connexion</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Entrez votre email pour recevoir un lien magique</p>
        </div>
        {!sent ? (
          <div style={{ background: "#ffffff06", border: "1px solid #ffffff0f", borderRadius: "18px", padding: "1.5rem" }}>
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && connexion()} type="email" placeholder="votre@email.com" style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #ffffff12", background: "#ffffff06", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "12px" }} />
            <button onClick={connexion} disabled={load || !email.trim()} style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: load ? 0.6 : 1 }}>
              {load ? "Envoi..." : "Recevoir le lien de connexion"}
            </button>
            <p style={{ fontSize: "12px", color: "#475569", textAlign: "center", marginTop: "12px" }}>Pas de mot de passe - un lien vous sera envoye par email</p>
          </div>
        ) : (
          <div style={{ background: "#22c55e15", border: "1px solid #22c55e33", borderRadius: "18px", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📧</div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#22c55e", margin: "0 0 8px" }}>Email envoye !</h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>Verifiez votre boite mail et cliquez sur le lien.</p>
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <a href="/" style={{ fontSize: "13px", color: "#475569", textDecoration: "none" }}>← Continuer sans compte</a>
        </div>
      </div>
    </main>
  );
}
