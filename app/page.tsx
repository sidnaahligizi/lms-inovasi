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
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />

      <div style={{ fontFamily: "'Poppins', sans-serif", minHeight: '100vh', backgroundColor: '#ffffff' }} className="d-flex flex-column flex-lg-row">
        
        {/* PANEL KIRI: INFORMASI LMS & SEKOLAH (Tampilan Penuh) */}
        <div className="col-lg-7 d-flex flex-column justify-content-between p-4 p-md-5 text-white position-relative overflow-hidden" 
             style={{ background: 'linear-gradient(135deg, #064e3b 0%, #115e32 100%)' }}>
            
            {/* Ornamen Latar Belakang (Estetika) */}
            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25" 
                 style={{ backgroundImage: 'radial-gradient(circle at top right, #d4af37 0%, transparent 40%), radial-gradient(circle at bottom left, #ffffff 0%, transparent 30%)', zIndex: 1 }}></div>

            <div className="position-relative" style={{ zIndex: 2 }}>
                {/* Header Logo & Judul */}
                <div className="d-flex align-items-center mb-5">
                    <img src="https://lh3.googleusercontent.com/d/1aWHmp6kNKwTYkwEMqVg34_ofiWRkymFe" alt="Logo KKGMI" className="bg-white rounded-circle p-1 shadow-lg me-3" width="80" height="80" style={{ objectFit: 'contain' }} />
                    <div>
                        <h4 className="fw-bold mb-0 text-warning" style={{ letterSpacing: '1px' }}>PORTAL LMS & CBT</h4>
                        <p className="mb-0 fs-6 opacity-75">LMS BELAJAR INOVASI</p>
                    </div>
                </div>

                {/* Deskripsi Utama */}
                <h1 className="fw-bold mb-4" style={{ fontSize: '3rem', lineHeight: '1.2' }}>
                    Sistem Belajar Digital <br/><span className="text-warning">LMS BELAJAR INOVASI</span>
                </h1>
                <p className="lead opacity-75 mb-5 w-lg-85" style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
                    Platform pendidikan terpadu yang dirancang khusus untuk memfasilitasi proses belajar mengajar secara interaktif, pelaksanaan ujian berbasis komputer yang jujur dan akurat, serta pemantauan rekam jejak akademik peserta didik.
                </p>

                {/* Grid Fitur & Keunggulan */}
                <div className="row g-4 mt-2">
                    <div className="col-md-6">
                        <div className="d-flex align-items-start">
                            <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" style={{ width: '45px', height: '45px' }}>
                                <i className="fas fa-book-open fs-5"></i>
                            </div>
                            <div className="ms-3">
                                <h6 className="fw-bold mb-1">Materi & Modul Digital</h6>
                                <p className="small opacity-75 mb-0">Akses bahan ajar, video, dan ringkasan kapan saja di mana saja.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="d-flex align-items-start">
                            <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" style={{ width: '45px', height: '45px' }}>
                                <i className="fas fa-laptop-code fs-5"></i>
                            </div>
                            <div className="ms-3">
                                <h6 className="fw-bold mb-1">Computer Based Test (CBT)</h6>
                                <p className="small opacity-75 mb-0">Sistem ujian online anti-kecurangan dengan evaluasi otomatis.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="d-flex align-items-start">
                            <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" style={{ width: '45px', height: '45px' }}>
                                <i className="fas fa-chart-line fs-5"></i>
                            </div>
                            <div className="ms-3">
                                <h6 className="fw-bold mb-1">Rekap Nilai Real-time</h6>
                                <p className="small opacity-75 mb-0">Pantau perkembangan akademik dan unduh raport secara langsung.</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="d-flex align-items-start">
                            <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" style={{ width: '45px', height: '45px' }}>
                                <i className="fas fa-clipboard-user fs-5"></i>
                            </div>
                            <div className="ms-3">
                                <h6 className="fw-bold mb-1">Presensi Terintegrasi</h6>
                                <p className="small opacity-75 mb-0">Manajemen kehadiran harian yang terhubung dengan laporan akademik.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Kiri */}
            <div className="mt-5 mt-lg-auto pt-4 border-top border-light border-opacity-25 position-relative" style={{ zIndex: 2 }}>
                <p className="small mb-0 opacity-75"><i className="fas fa-shield-alt me-2"></i>Sistem Terenkripsi & Aman | Hak Cipta &copy; {new Date().getFullYear()} LMS BELAJAR INOVASI</p>
            </div>
        </div>

        {/* PANEL KANAN: FORM LOGIN */}
        <div className="col-lg-5 d-flex align-items-center justify-content-center p-4 p-md-5 bg-white position-relative">
            <div className="w-100" style={{ maxWidth: '420px' }}>
                <div className="text-center mb-5">
                    <h2 className="fw-bold text-dark mb-2">Masuk Akun</h2>
                    <p className="text-muted">Silakan gunakan identitas yang telah terdaftar di sekolah.</p>
                </div>

                <form onSubmit={handleLogin}>
                    {/* Input Username */}
                    <div className="form-floating mb-3">
                        <input type="text" className="form-control bg-light border-0 shadow-sm" placeholder="Username / NISN" style={{ borderRadius: '12px' }} required value={username} onChange={(e) => setUsername(e.target.value)} />
                        <label className="text-muted"><i className="fas fa-user me-2"></i>Username / NISN</label>
                    </div>
                    
                    {/* Input Password */}
                    <div className="form-floating mb-4 position-relative">
                        <input type={showPassword ? "text" : "password"} className="form-control bg-light border-0 shadow-sm" placeholder="Password" style={{ borderRadius: '12px' }} required value={password} onChange={(e) => setPassword(e.target.value)} />
                        <label className="text-muted"><i className="fas fa-lock me-2"></i>Password</label>
                        <button type="button" className="btn position-absolute top-50 end-0 translate-middle-y me-2 text-muted border-0 bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>

                    {/* Tombol Login */}
                    <button type="submit" disabled={loading} className="btn w-100 py-3 fw-bold shadow text-white" 
                            style={{ background: '#d4af37', borderRadius: '12px', fontSize: '1.1rem', transition: 'all 0.3s' }}>
                        {loading ? (
                            <><i className="fas fa-spinner fa-spin me-2"></i> MEMPROSES...</>
                        ) : (
                            <><i className="fas fa-sign-in-alt me-2"></i> MASUK SEKARANG</>
                        )}
                    </button>
                </form>

                {/* Bantuan */}
                <div className="text-center mt-4">
                    <p className="small text-muted mb-0">Lupa password atau gagal login? <br/><a href="#" className="text-success fw-bold text-decoration-none">Hubungi Admin Sekolah / Wali Kelas</a></p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}
