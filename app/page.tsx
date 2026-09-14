'use client';

import { useState, useEffect } from 'react';

export default function Page() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('cbt_user');
    if (savedUser) window.location.href = '/index.html';
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, tglLahir })
      });
      const result = await res.json();
      if (result.status === 'success') {
        const user = result.data;
        user.LogoUrl = result.logo;
        localStorage.setItem('cbt_user', JSON.stringify(user));
        window.location.href = '/index.html';
      } else {
        alert('Gagal Login: ' + result.msg);
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan atau server tidak merespons.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />

      <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #d4af37 100%)", padding: '20px' }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          <div className="row g-4 align-items-center">
            <div className="col-lg-7 text-white pe-lg-4 mb-4 mb-lg-0">
              <h2 className="fw-bold mb-3">Portal LMS & CBT KKGMI</h2>
              <p className="lead mb-4">Sistem Pembelajaran dan Ujian Berbasis Komputer resmi KKGMI Kota Surabaya 10.</p>
              
              <div className="bg-white text-dark p-4 rounded-4 shadow-sm mb-4" style={{ opacity: 0.95 }}>
                <h5 className="fw-bold text-success mb-3"><i className="fas fa-list-check me-2"></i>Fitur Pembelajaran</h5>
                <ol className="mb-0 small text-muted" style={{ paddingLeft: '1.2rem', lineHeight: '1.7' }}>
                  <li><strong>Materi Belajar:</strong> Akses modul PDF, catatan teks, dan video YouTube yang diunggah Guru.</li>
                  <li><strong>Absensi Harian:</strong> Jangan lupa melakukan absensi di menu yang tersedia.</li>
                  <li><strong>Notifikasi:</strong> Cek dashboard utama untuk info terbaru dari sekolah/guru.</li>
                </ol>
              </div>
            </div>

            <div className="col-lg-5">
              <div style={{ background: 'white', borderRadius: '20px', padding: '40px', display: 'flex', flexDirection: 'column' }}>
                <div className="text-center mb-4">
                  <h4 className="fw-bold" style={{ color: '#064e3b' }}>MASUK PORTAL</h4>
                </div>
                <form onSubmit={handleLogin}>
                  <div className="form-floating mb-3">
                    <input type="text" className="form-control bg-light border-0" placeholder="User" required value={username} onChange={(e) => setUsername(e.target.value)} />
                    <label>Username</label>
                  </div>
                  <div className="form-floating mb-3 position-relative">
                    <input type={showPassword ? "text" : "password"} className="form-control bg-light border-0" placeholder="Pass" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    <label>Password</label>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} position-absolute top-50 end-0 translate-middle-y me-3 text-muted`} style={{ cursor: 'pointer', zIndex: 10 }} onClick={() => setShowPassword(!showPassword)}></i>
                  </div>
                  <div className="form-floating mb-4">
                    <input type="date" className="form-control bg-light border-0" value={tglLahir} onChange={(e) => setTglLahir(e.target.value)} />
                    <label>Tanggal Lahir (Siswa Wajib Isi)</label>
                  </div>
                  <button type="submit" disabled={loading} className="btn w-100 py-3 fw-bold shadow-sm text-white" style={{ background: 'linear-gradient(90deg, #064e3b 0%, #15803d 100%)', border: 'none', borderRadius: '10px' }}>
                    {loading ? 'MEMPROSES...' : 'MASUK SEKARANG'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
