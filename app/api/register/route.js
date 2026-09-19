export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { turso } from '../../../lib/turso';

export async function POST(req) {
  try {
    const { namaSekolah, adminUsername, adminPassword } = await req.json();

    // 1. Pastikan Semua Kerangka Tabel Siap
    await turso.execute(`CREATE TABLE IF NOT EXISTS SuperAdmins (ID TEXT PRIMARY KEY, Username TEXT UNIQUE, Password TEXT, Nama TEXT)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Tenants (TenantID TEXT PRIMARY KEY, NamaSekolah TEXT, Subdomain TEXT, AdminUsername TEXT, AdminPassword TEXT, Paket TEXT, MaxAdmin INTEGER, MaxGuru INTEGER, MaxSiswa INTEGER)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Users (ID TEXT PRIMARY KEY, Nama TEXT, Username TEXT, Password TEXT, Role TEXT, Sekolah TEXT, Kelas TEXT, TglLahir TEXT, Foto TEXT, NISN TEXT, jk TEXT, tempat_lahir TEXT, ayah TEXT, ibu TEXT, nik TEXT, no_kk TEXT, alamat TEXT, rt_rw TEXT, kode_pos TEXT, kelurahan TEXT, kecamatan TEXT, kabupaten TEXT, wali TEXT, akta_kelahiran TEXT, agama TEXT, anak_ke TEXT, status_keluarga TEXT, telepon_siswa TEXT, diterima_kelas TEXT, diterima_tanggal TEXT, diterima_semester TEXT, alamat_sekolah_asal TEXT, ijazah_tahun TEXT, ijazah_nomor TEXT, skhun_tahun TEXT, skhun_nomor TEXT, alamat_ortu TEXT, telepon_ortu TEXT, kerja_ayah TEXT, kerja_ibu TEXT, alamat_wali TEXT, kerja_wali TEXT, terjawab INTEGER, totalsoal INTEGER, status TEXT)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Exams (ExamID TEXT PRIMARY KEY, Judul TEXT, Mapel TEXT, TargetKelas TEXT, Durasi INTEGER, Status TEXT, Token TEXT, StartDate TEXT, EndDate TEXT, LimitTries INTEGER, ShowStats TEXT, RandomQ TEXT, PembuatID TEXT, AllowDownloadQ TEXT, AllowDownloadR TEXT, Sekolah TEXT)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Questions (QID TEXT PRIMARY KEY, ExamID TEXT, Tipe TEXT, Pertanyaan TEXT, Options TEXT, Key TEXT, Skor INTEGER, Nomor INTEGER, PembuatID TEXT)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Results (ResultID TEXT PRIMARY KEY, SiswaID TEXT, ExamID TEXT, TotalNilai TEXT, Detail TEXT, Pelanggaran TEXT, WaktuSubmit TEXT, Sekolah TEXT)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Attendance (AbsenID TEXT PRIMARY KEY, SiswaID TEXT, Tanggal TEXT, Status TEXT, Sekolah TEXT)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Notifications (NotifID TEXT PRIMARY KEY, Pesan TEXT, Tanggal TEXT, PembuatID TEXT, Sekolah TEXT)`);
    await turso.execute(`CREATE TABLE IF NOT EXISTS Materials (MatID TEXT PRIMARY KEY, Mapel TEXT, TargetKelas TEXT, Judul TEXT, Tipe TEXT, Konten TEXT, Tanggal TEXT, PembuatID TEXT, Sekolah TEXT)`);

    // Tambahkan Akun Super Admin Otomatis jika tabel kosong
    const cekSuper = await turso.execute("SELECT * FROM SuperAdmins");
    if (cekSuper.rows.length === 0) {
        await turso.execute({
            sql: "INSERT INTO SuperAdmins (ID, Username, Password, Nama) VALUES (?, ?, ?, ?)",
            args: ['SA-001', 'superadmin', 'passwordsuper123', 'Super Administrator']
        });
    }

    // 2. Cegah Username Duplikat
    const cekUser = await turso.execute({
      sql: "SELECT Username FROM Users WHERE Username = ? UNION SELECT Username FROM SuperAdmins WHERE Username = ?",
      args: [adminUsername, adminUsername]
    });
    if (cekUser.rows.length > 0) return NextResponse.json({ status: 'error', msg: 'Username sudah digunakan. Silakan ganti.' });

    // 3. Cegah Sekolah Duplikat
    const cekSekolah = await turso.execute({ sql: "SELECT NamaSekolah FROM Tenants WHERE NamaSekolah = ?", args: [namaSekolah] });
    if (cekSekolah.rows.length > 0) return NextResponse.json({ status: 'error', msg: 'Nama Sekolah ini sudah terdaftar.' });

    const tenantId = 'TN' + Date.now();

    // 4. Input Data Sekolah
    await turso.execute({
      sql: `INSERT INTO Tenants (TenantID, NamaSekolah, AdminUsername, AdminPassword, Paket, MaxAdmin, MaxGuru, MaxSiswa) VALUES (?, ?, ?, ?, 'Paket Uji Coba', 1, 1, 5)`,
      args: [tenantId, namaSekolah, adminUsername, adminPassword]
    });

    // 5. Input Data Admin Sekolah
    await turso.execute({
      sql: `INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah) VALUES (?, ?, ?, ?, 'admin', ?)`,
      args: ['U' + Date.now(), 'Admin ' + namaSekolah, adminUsername, adminPassword, namaSekolah]
    });

    return NextResponse.json({ status: 'success', msg: 'Sekolah berhasil didaftarkan. Silakan login.' });

  } catch (error) {
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
