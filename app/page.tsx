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
        alert('Pendaftaran Berhasil! Ruang LMS untuk sekolah Anda sudah siap. Silakan Masuk.');
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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />

      <style>{`
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        
        .wa-floating-btn {
          position: fixed;
          bottom: 30px;
          right: 30px;
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: white;
          border-radius: 50px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 15px;
          box-shadow: 0 10px 20px rgba(37, 211, 102, 0.4);
          z-index: 1000;
          text-decoration: none;
          transition: all 0.3s ease;
          border: 2px solid #fff;
        }
        .wa-floating-btn:hover {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 15px 25px rgba(37, 211, 102, 0.6);
          color: #fff;
        }
        .wa-floating-btn i { font-size: 22px; animation: wiggle 2s linear infinite; }
        
        @keyframes wiggle {
          0%, 7% { transform: rotateZ(0); }
          15% { transform: rotateZ(-15deg); }
          20% { transform: rotateZ(10deg); }
          25% { transform: rotateZ(-10deg); }
          30% { transform: rotateZ(6deg); }
          35% { transform: rotateZ(-4deg); }
          40%, 100% { transform: rotateZ(0); }
        }

        .pricing-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 18px;
          transition: transform 0.3s ease, background 0.3s ease;
        }
        .pricing-card:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
        }
      `}</style>

      <a href="https://wa.me/6285895283075?text=Halo%20Pak%20Wanto,%20saya%20tertarik%20upgrade%20paket%20LMS%20SAAS%20untuk%20sekolah%20saya" className="wa-floating-btn" target="_blank" rel="noopener noreferrer">
        <i className="fab fa-whatsapp"></i>
        <span>Konsultasi Upgrade</span>
      </a>

      <div className="d-flex flex-column flex-lg-row" style={{ minHeight: '100vh' }}>
        
        {/* PANEL KIRI: PROPOSISI NILAI & HARGA PAKET */}
        <div className="col-lg-7 d-flex flex-column p-4 p-md-5 text-white position-relative" 
             style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            
            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25" 
                 style={{ backgroundImage: 'radial-gradient(circle at top right, #38bdf8 0%, transparent 40%), radial-gradient(circle at bottom left, #818cf8 0%, transparent 30%)', zIndex: 1 }}></div>

            <div className="position-relative d-flex flex-column h-100" style={{ zIndex: 2 }}>
                
                <div className="mb-auto">
                    <div className="d-flex align-items-center mb-4">
                        <div className="bg-primary bg-opacity-25 p-2 rounded me-3 text-info">
                            <i className="fas fa-cloud fs-4"></i>
                        </div>
                        <div>
                            <h5 className="fw-bold mb-0 text-white" style={{ letterSpacing: '1px' }}>LMS SAAS INOVASI</h5>
                            <p className="mb-0 small text-info">Infrastruktur Multi-Tenant Independen</p>
                        </div>
                    </div>

                    <h1 className="fw-bold mb-3" style={{ fontSize: '2.5rem', lineHeight: '1.2' }}>
                        Tingkatkan Kualitas <br/><span className="text-info">Pendidikan Digital</span>
                    </h1>
                    <p className="lead opacity-75 mb-4" style={{ fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '600px' }}>
                        Platform CBT dan Manajemen Belajar terpusat dengan keamanan data penuh. Mulai dari paket uji coba bebas biaya, hingga skala ribuan siswa.
                    </p>

                    <h5 className="fw-bold text-white mb-3 mt-4"><i className="fas fa-gem me-2 text-info"></i> Skala Paket Institusi</h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="pricing-card h-100">
                                <h6 className="fw-bold text-info mb-1">Paket Uji Coba</h6>
                                <h4 className="fw-bold mb-2">Gratis</h4>
                                <ul className="list-unstyled small opacity-85 mb-0">
                                    <li><i className="fas fa-check text-success me-2"></i>1 Administrator & Guru</li>
                                    <li><i className="fas fa-check text-success me-2"></i>Maksimum 5 Siswa</li>
                                    <li className="text-muted text-decoration-line-through"><i className="fas fa-times me-2"></i>Logo & Nama LMS Custom</li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="pricing-card h-100 border-info">
                                <h6 className="fw-bold text-info mb-1">Paket Basic 50</h6>
                                <h4 className="fw-bold mb-2">Rp 150.000<span className="fs-6 opacity-50 fw-normal">/sekolah</span></h4>
                                <ul className="list-unstyled small opacity-85 mb-0">
                                    <li><i className="fas fa-check text-success me-2"></i>Admin & Guru Bebas</li>
                                    <li><i className="fas fa-check text-success me-2"></i>Kapasitas 50 Siswa</li>
                                    <li><i className="fas fa-check text-success me-2"></i><b>Logo & Nama LMS Custom</b></li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="pricing-card h-100">
                                <h6 className="fw-bold text-info mb-1">Paket Standar 100</h6>
                                <h4 className="fw-bold mb-2">Rp 275.000<span className="fs-6 opacity-50 fw-normal">/sekolah</span></h4>
                                <ul className="list-unstyled small opacity-85 mb-0">
                                    <li><i className="fas fa-check text-success me-2"></i>Admin & Guru Bebas</li>
                                    <li><i className="fas fa-check text-success me-2"></i>Kapasitas 100 Siswa</li>
                                    <li><i className="fas fa-check text-success me-2"></i><b>Logo & Nama LMS Custom</b></li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="pricing-card h-100">
                                <h6 className="fw-bold text-info mb-1">Paket Premium 200</h6>
                                <h4 className="fw-bold mb-2">Rp 350.000<span className="fs-6 opacity-50 fw-normal">/sekolah</span></h4>
                                <ul className="list-unstyled small opacity-85 mb-0">
                                    <li><i className="fas fa-check text-success me-2"></i>Admin & Guru Bebas</li>
                                    <li><i className="fas fa-check text-success me-2"></i>Kapasitas 200 Siswa</li>
                                    <li><i className="fas fa-check text-success me-2"></i><b>Logo & Nama LMS Custom</b></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 small opacity-75">
                        <i className="fas fa-info-circle me-2"></i>Tersedia eskalasi kuota: <strong>300, 500, 1000, hingga 5000+ Siswa</strong>.
                    </div>
                </div>
                
                <div className="mt-4 border-top border-secondary border-opacity-50 pt-3 text-muted small">
                    Sistem Belajar TKA Inovatif | Dikembangkan oleh <strong>Pak Wanto</strong> &copy; {new Date().getFullYear()}
                </div>
            </div>
        </div>

        {/* PANEL KANAN: DYNAMIC AUTHENTICATION */}
        <div className="col-lg-5 d-flex align-items-center justify-content-center p-4 p-md-5 bg-white shadow-lg z-3">
            <div className="w-100" style={{ maxWidth: '400px' }}>
                
                {/* Switcher Login / Daftar */}
                <div className="d-flex bg-light p-1 rounded-pill mb-5 border">
                    <button className={`btn w-50 rounded-pill fw-bold ${!isRegisterMode ? 'btn-primary shadow-sm' : 'btn-light text-secondary border-0'}`} 
                            onClick={() => setIsRegisterMode(false)}>
                        <i className="fas fa-sign-in-alt me-2"></i>Masuk
                    </button>
                    <button className={`btn w-50 rounded-pill fw-bold ${isRegisterMode ? 'btn-dark shadow-sm' : 'btn-light text-secondary border-0'}`} 
                            onClick={() => setIsRegisterMode(true)}>
                        <i className="fas fa-user-plus me-2"></i>Daftar Uji Coba
                    </button>
                </div>

                {!isRegisterMode ? (
                    // FORM LOGIN
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <h3 className="fw-bold text-dark mb-1">Selamat Datang Kembali</h3>
                            <p className="text-secondary small">Masukkan kredensial yang terdaftar di sekolah Anda.</p>
                        </div>
                        <div className="form-floating mb-3">
                            <input type="text" className="form-control bg-light border-0" placeholder="Username" style={{ borderRadius: '10px' }} required value={username} onChange={(e) => setUsername(e.target.value)} />
                            <label className="text-secondary"><i className="fas fa-user me-2"></i>Username / NISN</label>
                        </div>
                        <div className="form-floating mb-4 position-relative">
                            <input type={showPassword ? "text" : "password"} className="form-control bg-light border-0" placeholder="Password" style={{ borderRadius: '10px' }} required value={password} onChange={(e) => setPassword(e.target.value)} />
                            <label className="text-secondary"><i className="fas fa-lock me-2"></i>Kata Sandi</label>
                            <button type="button" className="btn position-absolute top-50 end-0 translate-middle-y me-2 text-secondary border-0 bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary w-100 py-3 fw-bold shadow-sm" style={{ borderRadius: '10px', fontSize: '1.05rem' }}>
                            {loading ? <><i className="fas fa-circle-notch fa-spin me-2"></i> MENGOTENTIKASI...</> : 'MASUK KE DASHBOARD'}
                        </button>
                    </form>
                ) : (
                    // FORM DAFTAR SAAS
                    <form onSubmit={handleRegister}>
                        <div className="mb-4">
                            <h3 className="fw-bold text-dark mb-1">Registrasi Institusi</h3>
                            <p className="text-secondary small">Daftarkan sekolah Anda dan dapatkan 1 akun Admin Utama.</p>
                        </div>
                        <div className="form-floating mb-3">
                            <input type="text" className="form-control bg-light border-0" placeholder="Nama Sekolah" style={{ borderRadius: '10px' }} required value={regSekolah} onChange={(e) => setRegSekolah(e.target.value)} />
                            <label className="text-secondary"><i className="fas fa-school me-2"></i>Nama Resmi Institusi</label>
                        </div>
                        <div className="form-floating mb-3">
                            <input type="text" className="form-control bg-light border-0" placeholder="Username Admin" style={{ borderRadius: '10px' }} required value={regUsername} onChange={(e) => setRegUsername(e.target.value)} />
                            <label className="text-secondary"><i className="fas fa-user-shield me-2"></i>Username Akun Admin</label>
                        </div>
                        <div className="form-floating mb-4">
                            <input type="password" className="form-control bg-light border-0" placeholder="Password" style={{ borderRadius: '10px' }} required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                            <label className="text-secondary"><i className="fas fa-key me-2"></i>Kata Sandi Akun Admin</label>
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-dark w-100 py-3 fw-bold shadow-sm" style={{ borderRadius: '10px', fontSize: '1.05rem' }}>
                            {loading ? <><i className="fas fa-circle-notch fa-spin me-2"></i> MEMPROSES PENDAFTARAN...</> : 'PROSES PENDAFTARAN'}
                        </button>
                    </form>
                )}
            </div>
        </div>
      </div>
    </>
  );
}
