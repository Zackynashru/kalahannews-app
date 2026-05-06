import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

// MENERIMA PROPS isAdmin DARI APP.JS
export default function NewsList({ user, activeCategory, isAdmin }) {
  const [news, setNews] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); 
  const [activeNews, setActiveNews] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(`${(totalScroll / windowHeight) * 100}`);
    }
    if (viewMode === "read") window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "read") {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setAiSummary(null);
    }
  }, [viewMode]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000); 
  };

  const timeAgo = (firebaseTimestamp) => {
    if (!firebaseTimestamp) return "Baru saja";
    const seconds = Math.floor((new Date() - firebaseTimestamp.toDate()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun yang lalu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bulan yang lalu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari yang lalu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam yang lalu";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " menit yang lalu";
    return "Baru saja";
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    if (window.confirm("Yakin hapus berita ini?")) {
      await deleteDoc(doc(db, "articles", id));
      showToast("Berita berhasil dihapus!", "success");
    }
  };

  const handleRead = async (n) => {
    setActiveNews(n);
    setViewMode("read");
    setScrollProgress(0); 
    window.scrollTo(0, 0); 
    await updateDoc(doc(db, "articles", n.id), { views: (n.views || 0) + 1 });
  };

  const handleEdit = (e, n) => {
    e.stopPropagation();
    setActiveNews(n);
    setEditForm({ title: n.title, content: n.content, category: n.category || "Umum", imageUrl: n.imageUrl || "" });
    setViewMode("edit");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "articles", activeNews.id), editForm);
    showToast("Berita berhasil diperbarui!", "success");
    setViewMode("grid");
  };

  const handleAISummary = (text) => {
    setIsSummarizing(true);
    setTimeout(() => {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      setAiSummary(sentences.length > 2 ? `${sentences[0]} Singkatnya, ${sentences[sentences.length - 1].toLowerCase()}` : text);
      setIsSummarizing(false);
      showToast("Ringkasan AI berhasil dibuat!", "success");
    }, 1500);
  };

  const toggleBookmark = async (e, n) => {
    e.stopPropagation();
    if (!user) return showToast("Wajib Login untuk menyimpan berita!", "error");
    
    const isBookmarked = n.bookmarks && n.bookmarks.includes(user.uid);
    const articleRef = doc(db, "articles", n.id);
    
    if (isBookmarked) {
      await updateDoc(articleRef, { bookmarks: arrayRemove(user.uid) });
      showToast("Dihapus dari daftar simpanan", "success");
    } else {
      await updateDoc(articleRef, { bookmarks: arrayUnion(user.uid) });
      showToast("Berita berhasil disimpan! 📌", "success");
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!user) return showToast("Login dulu untuk komentar!", "error");
    if (!commentInput.trim()) return;

    await updateDoc(doc(db, "articles", activeNews.id), {
      comments: arrayUnion({ uid: user.uid, name: user.displayName, text: commentInput, timestamp: new Date().toISOString() })
    });
    setCommentInput(""); 
    showToast("Komentar terkirim! 💬", "success");
  };

  const handleShare = async (title) => {
    if (navigator.share) {
      try { await navigator.share({ title, text: `Baca: "${title}"\n`, url: window.location.href }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(`Berita: ${title} - ${window.location.href}`);
      showToast("Link disalin ke clipboard! 🔗", "success");
    }
  };

  const toggleSpeech = (text) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const filteredNews = news.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || (n.category && n.category.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeCategory === "Bookmark") return matchSearch && user && n.bookmarks && n.bookmarks.includes(user.uid);
    return matchSearch && (activeCategory === "" || n.category === activeCategory);
  });

  const isFiltering = searchTerm !== "" || activeCategory !== "";
  const trendingNews = [...news].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
  const latestForTicker = news.slice(0, 3);

  return (
    <div>
      {toast.show && (
        <div className={`toast-container ${toast.type}`}>
          {toast.type === "success" ? "✅" : "⚠️"} {toast.message}
        </div>
      )}

      {viewMode === "read" && activeNews ? (() => {
        const currentNewsData = news.find(n => n.id === activeNews.id) || activeNews;
        const isBookmarked = user && currentNewsData.bookmarks && currentNewsData.bookmarks.includes(user.uid);
        const relatedNews = news.filter(n => n.category === currentNewsData.category && n.id !== currentNewsData.id).slice(0, 3);

        return (
          <div className="article-read">
            <div className="scroll-progress-container"><div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }}></div></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <button onClick={() => setViewMode("grid")} className="btn btn-logout">⬅ KEMBALI</button>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => handleAISummary(currentNewsData.content)} className="btn" style={{ background: "#a855f7", color: "white" }}>
                  {isSummarizing ? "⏳" : "🤖 RINGKAS"}
                </button>
                <button onClick={() => toggleSpeech(currentNewsData.content)} className="btn" style={{ background: isSpeaking ? "#e30613" : "#3498db", color: "white" }}>
                  {isSpeaking ? "⏹️ STOP" : "🔊 SUARA"}
                </button>
                {/* Tombol Simpan bisa diklik oleh SEMUA user */}
                <button onClick={(e) => toggleBookmark(e, currentNewsData)} className="btn" style={{ background: isBookmarked ? "#f39c12" : "#ccc", color: "#000" }}>
                  {isBookmarked ? "📌 TERSIMPAN" : "🔖 SIMPAN"}
                </button>
                <button onClick={() => handleShare(currentNewsData.title)} className="btn btn-login" style={{ background: "#27ae60" }}>
                  🔗 BAGIKAN
                </button>
              </div>
            </div>
            
            <div className="badge-kategori" style={{ position: "static", display: "inline-block", marginBottom: "15px" }}>{currentNewsData.category || "UMUM"}</div>
            <h1 style={{ fontSize: "2.5rem", margin: "0 0 10px 0", fontWeight: "900" }}>{currentNewsData.title}</h1>
            
            <div style={{ display: "flex", gap: "15px", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: "15px", marginBottom: "20px" }}>
              <small style={{ color: "gray", fontWeight: "bold" }}>📅 {timeAgo(currentNewsData.createdAt)}</small>
              <small style={{ color: "#e30613", fontWeight: "bold" }}>⏱️ {Math.ceil((currentNewsData.content ? currentNewsData.content.trim().split(/\s+/).length : 0) / 200)} menit</small>
              <small style={{ color: "#2980b9", fontWeight: "bold" }}>👁️ {currentNewsData.views || 0} kali dibaca</small>
            </div>

            {aiSummary && <div className="ai-summary-box"><h4 className="ai-summary-title">🤖 Ringkasan AI</h4><p style={{ margin: 0, fontStyle: "italic" }}>{aiSummary}</p></div>}
            <img src={currentNewsData.imageUrl} alt="Ilustrasi" />
            <div className="article-content">{currentNewsData.content}</div>

            <div className="comment-section">
              <h2 style={{ margin: "0 0 20px 0" }}>💬 Komentar ({currentNewsData.comments?.length || 0})</h2>
              {/* Kolom komentar bisa diakses oleh SEMUA user */}
              {user ? (
                <form onSubmit={submitComment} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
                  <input type="text" className="form-input" style={{ marginBottom: 0 }} placeholder="Tulis pendapatmu..." value={commentInput} onChange={e => setCommentInput(e.target.value)} required />
                  <button type="submit" className="btn btn-login">KIRIM</button>
                </form>
              ) : <p style={{ color: "gray", fontStyle: "italic", marginBottom: "30px" }}>Silakan login untuk komentar.</p>}
              
              {currentNewsData.comments?.map((c, idx) => (
                <div key={idx} className="comment-card">
                  <div className="comment-header">{c.name} <span style={{ color: "gray", fontSize: "0.75rem", fontWeight: "normal", marginLeft: "10px" }}>
                    {(() => {
                       const secs = Math.floor((new Date() - new Date(c.timestamp)) / 1000);
                       if (secs < 60) return "Baru saja";
                       if (secs < 3600) return Math.floor(secs/60) + " mnt yg lalu";
                       if (secs < 86400) return Math.floor(secs/3600) + " jam yg lalu";
                       return Math.floor(secs/86400) + " hr yg lalu";
                    })()}
                  </span></div>
                  <div>{c.text}</div>
                </div>
              ))}
            </div>
            
            {relatedNews.length > 0 && (
              <div className="related-section">
                <h3 style={{ borderLeft: "5px solid #e30613", paddingLeft: "10px", textTransform: "uppercase" }}>BACA JUGA</h3>
                <div className="more-news-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", marginTop: "15px" }}>
                  {relatedNews.map(rn => (
                    <div key={rn.id} className="news-card more-news-card" onClick={() => handleRead(rn)} style={{ height: "180px" }}>
                      <img src={rn.imageUrl} alt="Related" />
                      <div className="news-info"><h4 className="news-title" style={{ fontSize: "1rem" }}>{rn.title}</h4></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })() : viewMode === "edit" && isAdmin ? ( // Proteksi ganda di mode Edit
        <div className="admin-panel">
          <h2 style={{ marginTop: 0 }}>✏️ Edit Berita</h2>
          <form onSubmit={handleUpdate}>
            <input type="text" className="form-input" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required />
            <select className="form-input" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
              <option value="Umum">Umum</option><option value="Nasional">Nasional</option><option value="Kampus">Kampus & Mahasiswa</option><option value="Teknologi">Teknologi & IoT</option><option value="Musik">Musik & Hiburan</option><option value="Olahraga">Olahraga</option><option value="Sepak Bola">Sepak Bola</option>
            </select>
            <input type="url" className="form-input" value={editForm.imageUrl} onChange={e => setEditForm({...editForm, imageUrl: e.target.value})} required />
            <textarea className="form-input" value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} rows="10" required />
            <div style={{ display: "flex", gap: "10px" }}><button type="submit" className="btn btn-login">💾 SIMPAN PERUBAHAN</button><button type="button" onClick={() => setViewMode("grid")} className="btn btn-logout">BATAL</button></div>
          </form>
        </div>
      ) : (
        <>
          {/* RENDER HALAMAN UTAMA */}
          {!isFiltering && latestForTicker.length > 0 && (
            <div className="ticker-wrap"><div className="ticker-label">BREAKING NEWS</div><div className="ticker-move">{latestForTicker.map(n => <div key={n.id} className="ticker-item" onClick={() => handleRead(n)}>⚡ {n.title}</div>)}</div></div>
          )}

          <div className="search-container"><input type="text" className="search-input" placeholder="🔍 Cari judul atau kategori berita..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

          {isFiltering ? (
            <div>
              <h2 className="section-title">{searchTerm !== "" ? `Pencarian: "${searchTerm}"` : activeCategory === "Bookmark" ? "📌 Berita Tersimpan" : `Kategori: ${activeCategory.toUpperCase()}`}</h2>
              {filteredNews.length === 0 && <p style={{ color: "gray" }}>Belum ada berita di sini.</p>}
              <div className="more-news-grid">
                {filteredNews.map(n => (
                  <div key={n.id} className="news-card more-news-card" onClick={() => handleRead(n)} style={{ position: "relative" }}>
                    <button onClick={(e) => toggleBookmark(e, n)} className="btn-bookmark">{n.bookmarks?.includes(user?.uid) ? "📌" : "🔖"}</button>
                    <div className="badge-kategori">{n.category || "UMUM"}</div>
                    <img src={n.imageUrl} alt="News" />
                    <div className="news-info"><h3 className="news-title" style={{ fontSize: "1.1rem" }}>{n.title}</h3></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="news-grid">
                {news[0] && (
                  <div className="news-card main-news" onClick={() => handleRead(news[0])} style={{ position: "relative" }}>
                    <button onClick={(e) => toggleBookmark(e, news[0])} className="btn-bookmark">{news[0].bookmarks?.includes(user?.uid) ? "📌" : "🔖"}</button>
                    <div className="badge-kategori">{news[0].category || "NASIONAL"}</div>
                    <img src={news[0].imageUrl} alt="Main" />
                    <div className="news-info">
                      <h1 className="news-title">{news[0].title}</h1>
                      <p style={{ color: "#ccc", margin: "5px 0 0 0", fontSize: "0.85rem" }}>🕒 {timeAgo(news[0].createdAt)} • 💬 {news[0].comments?.length || 0} Komen</p>
                      
                      {/* TOMBOL EDIT/HAPUS HANYA UNTUK ADMIN */}
                      {isAdmin && (
                        <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                          <button onClick={(e) => handleEdit(e, news[0])} className="btn btn-edit">EDIT</button>
                          <button onClick={(e) => handleDelete(e, news[0].id)} className="btn btn-red">HAPUS</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {news.slice(1, 5).map(n => (
                  <div key={n.id} className="news-card side-news" onClick={() => handleRead(n)} style={{ position: "relative" }}>
                    <button onClick={(e) => toggleBookmark(e, n)} className="btn-bookmark">{n.bookmarks?.includes(user?.uid) ? "📌" : "🔖"}</button>
                    <div className="badge-kategori">{n.category || "INFO"}</div>
                    <img src={n.imageUrl} alt="Side" />
                    <div className="news-info">
                      <h3 className="news-title">{n.title}</h3>
                      
                      {/* TOMBOL EDIT/HAPUS HANYA UNTUK ADMIN */}
                      {isAdmin && (
                        <div style={{ marginTop: "10px", display: "flex", gap: "5px" }}>
                          <button onClick={(e) => handleEdit(e, n)} className="btn btn-edit" style={{ padding: "4px 8px", fontSize: "11px" }}>EDIT</button>
                          <button onClick={(e) => handleDelete(e, n.id)} className="btn btn-red" style={{ padding: "4px 8px", fontSize: "11px" }}>HAPUS</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {trendingNews.length > 0 && (
                <div className="trending-section">
                  <h2 style={{ marginTop: 0, borderLeft: "5px solid #f39c12", paddingLeft: "10px" }}>🔥 BERITA TERPOPULER</h2>
                  {trendingNews.map((n, index) => (
                    <div key={n.id} className="trending-item" onClick={() => handleRead(n)}>
                      <div className="trending-number">{index + 1}</div>
                      <div>
                        <span className="badge-kategori" style={{ position: "relative", marginBottom: "5px", background: "#f39c12" }}>{n.category}</span>
                        <h3 className="trending-title">{n.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}