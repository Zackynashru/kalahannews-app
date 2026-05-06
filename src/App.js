import React, { useState, useEffect } from "react";
import AddNews from "./AddNews";
import NewsList from "./NewsList";
import "./App.css";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// ==========================================
// 👑 DAFTAR EMAIL ADMIN KALAHANNEWS
// Ganti dengan email Google aslimu! Bisa nambah email teman juga.
// ==========================================
const ADMIN_EMAILS = [ "zackyjukik@gmail.com"]; 

function App() {
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");

  // LOGIKA RBAC: Mengecek apakah user yang login emailnya ada di daftar Admin
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (isDarkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  const login = async () => await signInWithPopup(auth, provider);
  const logout = async () => await signOut(auth);

  return (
    <div>
      <div className="header-container">
        <div className="logo">
          <span className="logo-blue">KALAHAN</span><span className="logo-red">NEWS</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="btn" style={{ background: isDarkMode ? "#f1c40f" : "#2c3e50", color: isDarkMode ? "#000" : "#fff", borderRadius: "20px" }}>
            {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Menampilkan Nama User dan Status Role-nya */}
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: isDarkMode ? "#ccc" : "#333" }}>
                Halo, {user.displayName?.split(" ")[0]} {isAdmin ? "👑(Admin)" : "👤(User)"}
              </span>
              <button onClick={logout} className="btn btn-logout">LOGOUT</button>
            </div>
          ) : (
            <button onClick={login} className="btn btn-login">LOGIN GOOGLE</button>
          )}
        </div>
      </div>

      <div className="navbar">
        <span onClick={() => setActiveCategory("")} style={{ color: activeCategory === "" ? "#e30613" : "white" }}>TERKINI</span>
        <span onClick={() => setActiveCategory("Nasional")} style={{ color: activeCategory === "Nasional" ? "#e30613" : "white" }}>NASIONAL</span>
        <span onClick={() => setActiveCategory("Olahraga")} style={{ color: activeCategory === "Olahraga" ? "#e30613" : "white" }}>OLAHRAGA</span>
        <span onClick={() => setActiveCategory("Sepak Bola")} style={{ color: activeCategory === "Sepak Bola" ? "#e30613" : "white" }}>SEPAK BOLA</span>
        <span onClick={() => setActiveCategory("Musik")} style={{ color: activeCategory === "Musik" ? "#e30613" : "white" }}>MUSIK</span>
        <span onClick={() => setActiveCategory("Teknologi")} style={{ color: activeCategory === "Teknologi" ? "#e30613" : "white" }}>TEKNOLOGI</span>
        <span onClick={() => setActiveCategory("Kampus")} style={{ color: activeCategory === "Kampus" ? "#e30613" : "white" }}>KAMPUS</span>
        {user && (
          <span onClick={() => setActiveCategory("Bookmark")} style={{ color: activeCategory === "Bookmark" ? "#a855f7" : "#a855f7", fontWeight: "900" }}>
            📌 TERSIMPAN
          </span>
        )}
      </div>

      <div className="container">
        {/* FITUR BARU: Form Tulis Berita HANYA muncul kalau yang login adalah ADMIN */}
        {isAdmin && (
          <div className="admin-panel">
            <AddNews />
          </div>
        )}
        
        {/* Mengirim status isAdmin ke NewsList */}
        <NewsList user={user} activeCategory={activeCategory} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

export default App;