import { NextResponse } from 'next/server';
import { masterTurso, getTenantClient } from '../../../lib/turso';
export async function POST(req) {
  try {
    const { namaSekolah, adminUsername, adminPassword } = await req.json();

    // Validasi Ekstra untuk memastikan environment variable API Turso sudah diisi
    const orgName = process.env.TURSO_ORG_NAME; 
    const platformToken = process.env.TURSO_PLATFORM_TOKEN;

    if (!orgName || !platformToken) {
       throw new Error("Konfigurasi TURSO_ORG_NAME atau TURSO_PLATFORM_TOKEN belum diatur di server (.env). Pendaftaran SAAS tidak dapat memproses pembuatan database otomatis.");
    }

    const tenantId = 'TN' + Date.now();
    const dbName = `lms-${tenantId.toLowerCase()}`;
    
    // 1. Buat Database Fisik di Turso via REST API
    const createDbRes = await fetch(`https://api.turso.tech/v1/organizations/${orgName}/databases`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${platformToken}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ name: dbName, group: "default" })
    });
    
    if (!createDbRes.ok) {
       const errData = await createDbRes.json();
       throw new Error(errData.message || "Gagal membuat database fisik di Turso.");
    }
    
    // 2. Generate Token Autentikasi untuk Database Baru
    const createTokenRes = await fetch(`https://api.turso.tech/v1/organizations/${orgName}/databases/${dbName}/auth/tokens`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${platformToken}` }
    });

    if (!createTokenRes.ok) {
       throw new Error("Database terbuat, tetapi sistem gagal men-generate Token Auth.");
    }

    const tokenData = await createTokenRes.json();
    const tenantDbUrl = `libsql://${dbName}-${orgName}.turso.io`;
    const tenantDbToken = tokenData.jwt;

    // 3. Simpan Profil Tenant ke Master DB
    await masterTurso.execute({
      sql: `INSERT INTO Tenants (TenantID, NamaSekolah, Subdomain, AdminUsername, AdminPassword, Paket, MaxAdmin, MaxGuru, MaxSiswa, DbUrl, DbToken) 
            VALUES (?, ?, ?, ?, ?, 'Free', 1, 1, 5, ?, ?)`,
      args: [tenantId, namaSekolah, dbName, adminUsername, adminPassword, tenantDbUrl, tenantDbToken]
    });

    // 4. Inisialisasi Tabel di Database Tenant Baru (Sekolah Tersebut)
    const tenantDb = getTenantClient(tenantDbUrl, tenantDbToken);
    
    await tenantDb.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        ID TEXT PRIMARY KEY, Nama TEXT, Username TEXT, Password TEXT, Role TEXT, Sekolah TEXT,
        Kelas TEXT, TglLahir TEXT, Foto TEXT, NISN TEXT, jk TEXT, tempat_lahir TEXT, 
        ayah TEXT, ibu TEXT, nik TEXT, no_kk TEXT, alamat TEXT, rt_rw TEXT, kode_pos TEXT, 
        kelurahan TEXT, kecamatan TEXT, kabupaten TEXT, wali TEXT, akta_kelahiran TEXT, 
        agama TEXT, anak_ke TEXT, status_keluarga TEXT, telepon_siswa TEXT, diterima_kelas TEXT, 
        diterima_tanggal TEXT, diterima_semester TEXT, alamat_sekolah_asal TEXT, ijazah_tahun TEXT, 
        ijazah_nomor TEXT, skhun_tahun TEXT, skhun_nomor TEXT, alamat_ortu TEXT, telepon_ortu TEXT, 
        kerja_ayah TEXT, kerja_ibu TEXT, alamat_wali TEXT, kerja_wali TEXT, terjawab INTEGER, totalsoal INTEGER, status TEXT
      )
    `);

    // Membangun tabel sisa LMS
    await tenantDb.execute(`CREATE TABLE IF NOT EXISTS Exams (ExamID TEXT PRIMARY KEY, Judul TEXT, Mapel TEXT, TargetKelas TEXT, Durasi INTEGER, Status TEXT, Token TEXT, StartDate TEXT, EndDate TEXT, LimitTries INTEGER, ShowStats TEXT, RandomQ TEXT, PembuatID TEXT, AllowDownloadQ TEXT, AllowDownloadR TEXT)`);
    await tenantDb.execute(`CREATE TABLE IF NOT EXISTS Questions (QID TEXT PRIMARY KEY, ExamID TEXT, Tipe TEXT, Pertanyaan TEXT, Options TEXT, Key TEXT, Skor INTEGER, Nomor INTEGER, PembuatID TEXT)`);
    await tenantDb.execute(`CREATE TABLE IF NOT EXISTS Results (ResultID TEXT PRIMARY KEY, SiswaID TEXT, ExamID TEXT, TotalNilai TEXT, Detail TEXT, Pelanggaran TEXT, WaktuSubmit TEXT)`);
    await tenantDb.execute(`CREATE TABLE IF NOT EXISTS Attendance (AbsenID TEXT PRIMARY KEY, SiswaID TEXT, Tanggal TEXT, Status TEXT)`);
    await tenantDb.execute(`CREATE TABLE IF NOT EXISTS Notifications (NotifID TEXT PRIMARY KEY, Pesan TEXT, Tanggal TEXT, PembuatID TEXT)`);
    await tenantDb.execute(`CREATE TABLE IF NOT EXISTS Materials (MatID TEXT PRIMARY KEY, Mapel TEXT, TargetKelas TEXT, Judul TEXT, Tipe TEXT, Konten TEXT, Tanggal TEXT, PembuatID TEXT)`);
    
    // 5. Buat Akun Admin Pertama
    await tenantDb.execute({
      sql: `INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah) VALUES (?, ?, ?, ?, 'admin', ?)`,
      args: ['U' + Date.now(), 'Admin ' + namaSekolah, adminUsername, adminPassword, namaSekolah]
    });

    return NextResponse.json({ status: 'success', msg: 'Sekolah berhasil didaftarkan dan Database terisolasi berhasil dibuat.' });

  } catch (error) {
    console.error("Register SaaS Error:", error);
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
