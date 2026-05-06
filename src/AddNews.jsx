import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function AddNews() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Umum");
  const [imageFile, setImageFile] = useState(null); // Menyimpan file dari laptop
  const [isUploading, setIsUploading] = useState(false); // Indikator loading

  // TARUH KODE IMGBB KAMU DI SINI:
  const IMGBB_API_KEY = "483f1aac17b8cafa6d0fede491b3c4d0";

  const submitNews = async (e) => {
    e.preventDefault();
    if(title && content && imageFile) {
      setIsUploading(true);
      try {
        // 1. Upload Gambar ke ImgBB Dulu
        const formData = new FormData();
        formData.append("image", imageFile);

        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: "POST",
          body: formData,
        });
        const imgbbData = await imgbbResponse.json();
        
        // Dapatkan link gambar langsung dari server ImgBB
        const imageUrl = imgbbData.data.url; 

        // 2. Simpan Teks Berita + Link Gambar ke Firebase Firestore
        await addDoc(collection(db, "articles"), {
          title: title,
          content: content,
          category: category,
          imageUrl: imageUrl, // Pakai URL hasil upload ImgBB
          createdAt: serverTimestamp()
        });

        // Reset form
        setTitle(""); setContent(""); setCategory("Umum"); setImageFile(null);
        // Reset input file secara manual
        document.getElementById("fileInput").value = ""; 
        
        alert("Berita & Gambar Berhasil Dipublish!");
      } catch (error) {
        console.error("Error: ", error);
        alert("Gagal mempublish berita. Cek koneksi internetmu.");
      } finally {
        setIsUploading(false); // Matikan loading
      }
    } else {
      alert("Harap isi semua kolom dan pilih file gambarnya!");
    }
  };

  return (
    <div className="admin-panel">
      <h2 style={{ marginTop: 0 }}>📝 Tulis Berita Baru</h2>
      <form onSubmit={submitNews}>
        <input type="text" className="form-input" placeholder="Judul Berita" value={title} onChange={e => setTitle(e.target.value)} required />
        
        <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="Umum">Umum</option>
          <option value="Nasional">Nasional</option>
          <option value="Kampus">Kampus & Mahasiswa</option>
          <option value="Teknologi">Teknologi & IoT</option>
          <option value="Musik">Musik & Hiburan</option>
          <option value="Olahraga">Olahraga</option>
          <option value="Sepak Bola">Sepak Bola</option>
        </select>

        {/* INPUT FILE GAMBAR (JPG/PNG) */}
        <input 
          type="file" 
          id="fileInput"
          accept="image/*" 
          className="form-input" 
          onChange={e => setImageFile(e.target.files[0])} 
          required 
          style={{ background: "#f8f9fa" }}
        />

        <textarea className="form-input" placeholder="Isi berita..." value={content} onChange={e => setContent(e.target.value)} required rows="6" />

        <button type="submit" className="btn btn-login" style={{ width: "100%", opacity: isUploading ? 0.7 : 1 }} disabled={isUploading}>
          {isUploading ? "⏳ MENGUPLOAD GAMBAR & BERITA..." : "🚀 PUBLISH BERITA"}
        </button>
      </form>
    </div>
  );
}