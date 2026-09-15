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

      <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: "linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)", padding: '20px' }}>
        <div className="container shadow-lg rounded-4 overflow-hidden bg-white" style={{ maxWidth: '1100px' }}>
          <div className="row g-0">
            {/* Bagian Info (Kiri) */}
            <div className="col-lg-6 text-white p-5 d-flex flex-column justify-content-center" style={{ background: "linear-gradient(135deg, #064e3b 0%, #15803d 100%)" }}>
              <div className="text-center mb-4">
                 <img src="https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq" alt="Logo" width="100" className="bg-white rounded-circle p-2 shadow" />
              </div>
              <h2 className="fw-bold mb-3 text-center text-warning">Selamat Datang di Portal LMS</h2>
              <h4 className="mb-4 text-center">KKGMI Kota Surabaya 10</h4>
              <p className="lead fs-6 text-center mb-4 opacity-75">Sistem Pembelajaran Digital dan Ujian Berbasis Komputer (CBT) Terpadu untuk kemudahan akses pendidikan yang lebih baik.</p>
              
              <div className="bg-white text-dark p-4 rounded-4 shadow-sm mb-3">
                <h6 className="fw-bold text-success mb-2"><i className="fas fa-info-circle me-2"></i>Informasi Portal</h6>
                <ul className="mb-0 small text-muted list-unstyled" style={{ lineHeight: '1.8' }}>
                  <li><i className="fas fa-check text-success me-2"></i> Akses Modul & Materi Kapan Saja</li>
                  <li><i className="fas fa-check text-success me-2"></i> Pelaksanaan Ujian (CBT) Akurat</li>
                  <li><i className="fas fa-check text-success me-2"></i> Pantauan Nilai & Absensi Real-time</li>
                </ul>
              </div>
            </div>

            {/* Bagian Login (Kanan) */}
            <div className="col-lg-6 p-5 d-flex flex-column justify-content-center bg-light">
              <div className="text-center mb-4">
                <h3 className="fw-bold" style={{ color: '#064e3b' }}>MASUK AKUN</h3>
                <p className="text-muted small">Silakan gunakan identitas yang telah terdaftar</p>
              </div>
              <form onSubmit={handleLogin}>
                <div className="form-floating mb-3">
                  <input type="text" className="form-control border-secondary shadow-sm rounded-3" placeholder="User" required value={username} onChange={(e) => setUsername(e.target.value)} />
                  <label>Username / NISN</label>
                </div>
                <div className="form-floating mb-3 position-relative">
                  <input type={showPassword ? "text" : "password"} className="form-control border-secondary shadow-sm rounded-3" placeholder="Pass" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  <label>Password</label>
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} position-absolute top-50 end-0 translate-middle-y me-3 text-muted`} style={{ cursor: 'pointer', zIndex: 10 }} onClick={() => setShowPassword(!showPassword)}></i>
                </div>
                <div className="form-floating mb-4">
                  <input type="date" className="form-control border-secondary shadow-sm rounded-3" value={tglLahir} onChange={(e) => setTglLahir(e.target.value)} />
                  <label>Tanggal Lahir (Wajib bagi Siswa)</label>
                </div>
                <button type="submit" disabled={loading} className="btn w-100 py-3 fw-bold shadow-sm text-white rounded-3" style={{ background: '#d4af37', border: 'none', fontSize: '1.1rem' }}>
                  {loading ? <><i className="fas fa-spinner fa-spin me-2"></i>MEMPROSES...</> : <><i className="fas fa-sign-in-alt me-2"></i> MASUK SEKARANG</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
