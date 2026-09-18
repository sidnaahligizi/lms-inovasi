'use client';

import { useState, useEffect } from 'react';

export default function Page() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State untuk form SAAS
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regSekolah, setRegSekolah] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

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
        // Simpan juga informasi tenant
        user.tenantDbUrl = result.tenantDbUrl;
        user.tenantDbToken = result.tenantDbToken;
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaSekolah: regSekolah, adminUsername: regUsername, adminPassword: regPassword })
      });
      const result = await res.json();
      if (result.status === 'success') {
        alert('Pendaftaran Berhasil! Database mandiri sekolah Anda sedang disiapkan. Silakan login.');
        setIsRegisterMode(false);
      } else {
        alert('Gagal Mendaftar: ' + result.msg);
      }
    } catch (err) {
      alert('Terjadi kesalahan server saat mendaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <link href="[https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap](https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap)" rel="stylesheet" />
      <link href="[https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css)" rel="stylesheet" />
      <link href="[https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css](https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css)" rel="stylesheet" />

      <style>{`
        .wa-floating {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background-color: #25d366;
          color: white;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          box-shadow: 0px 4px 10px rgba(0,0,0,0.3);
          z-index: 1000;
          text-decoration: none;
          animation: pulse 1.5s infinite;
        }
        .wa-floating:hover { color: #fff; background-color: #1ebe57; }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        .pricing-box {
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 15px;
          margin-top: 20px;
          border: 1px solid rgba(255,255,255,0.2);
        }
      `}</style>

      {/* Tombol WhatsApp Mengambang */}
      <a href="[https://wa.me/6285895283075?text=Halo%20Pak%20Wanto,%20saya%20ingin%20upgrade%20akses%20LMS%20SAAS%20sekolah%20saya](https://wa.me/6285895283075?text=Halo%20Pak%20Wanto,%20saya%20ingin%20upgrade%20akses%20LMS%20SAAS%20sekolah%20saya)" className="wa-floating" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-whatsapp"></i>
      </a>

      <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: '100vh', backgroundColor: '#ffffff' }} className="d-flex flex-column flex-lg-row">
        
        {/* PANEL KIRI: INFORMASI LMS & SEKOLAH */}
        <div className="col-lg-7 d-flex flex-column justify-content-between p-4 p-md-5 text-white position-relative overflow-hidden" 
             style={{ background: 'linear-gradient(135deg, #064e3b 0%, #115e32 100%)' }}>
            
            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25" 
                 style={{ backgroundImage: 'radial-gradient(circle at top right, #d4af37 0%, transparent 40%), radial-gradient(circle at bottom left, #ffffff 0%, transparent 30%)', zIndex: 1 }}></div>

            <div className="position-relative" style={{ zIndex: 2 }}>
                <div className="d-flex align-items-center mb-4">
                    <div>
                        <h4 className="fw-bold mb-0 text-warning" style={{ letterSpacing: '1px' }}>LMS SAAS INOVASI</h4>
                        <p className="mb-0 fs-6 opacity-75">Platform Ujian & Belajar Digital Multi-Sekolah</p>
                    </div>
                </div>

                <h1 className="fw-bold mb-3" style={{ fontSize: '2.5rem', lineHeight: '1.2' }}>
                    Solusi Cerdas Digitalisasi <br/><span className="text-warning">Sekolah Anda</span>
                </h1>
                <p className="lead opacity-85 mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                    Sistem ujian CBT anti-kecurangan dan LMS mandiri untuk setiap sekolah. Daftar sekarang dan dapatkan Database Turso independen otomatis!
                </p>

                {/* Info Paket */}
                <div className="pricing-box">
                    <h5 className="text-warning fw-bold mb-3"><i className="fas fa-tags me-2"></i> Pilihan Paket Upgrade</h5>
                    <div className="row g-2 small">
                        <div className="col-md-6"><i className="fas fa-check-circle text-success me-2"></i><strong>Free:</strong> 1 Admin, 1 Guru, 5 Siswa</div>
                        <div className="col-md-6"><i className="fas fa-check-circle text-success me-2"></i><strong>Rp 150rb:</strong> 1 Admin, Guru Bebas, 50 Siswa</div>
                        <div className="col-md-6"><i className="fas fa-check-circle text-success me-2"></i><strong>Rp 275rb:</strong> 1 Admin, Guru Bebas, 100 Siswa</div>
                        <div className="col-md-6"><i className="fas fa-check-circle text-success me-2"></i><strong>Rp 350rb:</strong> 1 Admin, Guru Bebas, 200 Siswa</div>
                    </div>
                    <p className="mt-3 mb-0 small opacity-75"><em>*Tersedia juga paket 300, 500, 1000, hingga 5000 siswa. Hubungi pengembang (Pak Wanto) via WhatsApp untuk aktivasi upgrade.</em></p>
                </div>
            </div>
            
            <div className="mt-5 mt-lg-auto pt-4 border-top border-light border-opacity-25 position-relative" style={{ zIndex: 2 }}>
                <p className="small mb-0 opacity-75"><i className="fas fa-shield-alt me-2"></i>Database Terisolasi per Sekolah | Hak Cipta &copy; {new Date().getFullYear()}</p>
            </div>
        </div>

        {/* PANEL KANAN: FORM LOGIN / DAFTAR */}
        <div className="col-lg-5 d-flex align-items-center justify-content-center p-4 p-md-5 bg-white position-relative">
            <div className="w-100" style={{ maxWidth: '420px' }}>
                
                {/* Toggle Login/Daftar */}
                <div className="d-flex bg-light rounded-pill p-1 mb-4 shadow-sm">
                    <button className={`btn w-50 rounded-pill fw-bold ${!isRegisterMode ? 'btn-primary shadow' : 'btn-light text-muted'}`} onClick={() => setIsRegisterMode(false)}>Masuk</button>
                    <button className={`btn w-50 rounded-pill fw-bold ${isRegisterMode ? 'btn-success shadow' : 'btn-light text-muted'}`} onClick={() => setIsRegisterMode(true)}>Daftar Free</button>
                </div>

                {!isRegisterMode ? (
                    // FORM LOGIN
                    <form onSubmit={handleLogin}>
                        <div className="text-center mb-4">
                            <h3 className="fw-bold text-dark mb-2">Masuk Sistem</h3>
                            <p className="text-muted small">Login untuk Admin, Guru, atau Siswa.</p>
                        </div>
                        <div className="form-floating mb-3">
                            <input type="text" className="form-control bg-light border-0 shadow-sm" placeholder="Username" style={{ borderRadius: '12px' }} required value={username} onChange={(e) => setUsername(e.target.value)} />
                            <label className="text-muted"><i className="fas fa-user me-2"></i>Username / NISN</label>
                        </div>
                        <div className="form-floating mb-4 position-relative">
                            <input type={showPassword ? "text" : "password"} className="form-control bg-light border-0 shadow-sm" placeholder="Password" style={{ borderRadius: '12px' }} required value={password} onChange={(e) => setPassword(e.target.value)} />
                            <label className="text-muted"><i className="fas fa-lock me-2"></i>Password</label>
                            <button type="button" className="btn position-absolute top-50 end-0 translate-middle-y me-2 text-muted border-0 bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                        <button type="submit" disabled={loading} className="btn w-100 py-3 fw-bold shadow text-white" style={{ background: '#064e3b', borderRadius: '12px', fontSize: '1.1rem' }}>
                            {loading ? <><i className="fas fa-spinner fa-spin me-2"></i> MEMPROSES...</> : <><i className="fas fa-sign-in-alt me-2"></i> MASUK SEKARANG</>}
                        </button>
                    </form>
                ) : (
                    // FORM DAFTAR SAAS
                    <form onSubmit={handleRegister}>
                        <div className="text-center mb-4">
                            <h3 className="fw-bold text-success mb-2">Daftar Sekolah Baru</h3>
                            <p className="text-muted small">Dapatkan akses Free (1 Admin, 1 Guru, 5 Siswa). Database otomatis dibuat terpisah.</p>
                        </div>
                        <div className="form-floating mb-3">
                            <input type="text" className="form-control bg-light border-0 shadow-sm" placeholder="Nama Sekolah" style={{ borderRadius: '12px' }} required value={regSekolah} onChange={(e) => setRegSekolah(e.target.value)} />
                            <label className="text-muted"><i className="fas fa-school me-2"></i>Nama Instansi / Sekolah</label>
                        </div>
                        <div className="form-floating mb-3">
                            <input type="text" className="form-control bg-light border-0 shadow-sm" placeholder="Username Admin" style={{ borderRadius: '12px' }} required value={regUsername} onChange={(e) => setRegUsername(e.target.value)} />
                            <label className="text-muted"><i className="fas fa-user-shield me-2"></i>Username Admin Utama</label>
                        </div>
                        <div className="form-floating mb-4">
                            <input type="password" className="form-control bg-light border-0 shadow-sm" placeholder="Password" style={{ borderRadius: '12px' }} required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                            <label className="text-muted"><i className="fas fa-key me-2"></i>Password Admin</label>
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-success w-100 py-3 fw-bold shadow" style={{ borderRadius: '12px', fontSize: '1.1rem' }}>
                            {loading ? <><i className="fas fa-spinner fa-spin me-2"></i> MENGONFIGURASI DATABASE...</> : <><i className="fas fa-rocket me-2"></i> DAFTAR & BUAT DATABASE</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
      </div>
    </>
  );
}
