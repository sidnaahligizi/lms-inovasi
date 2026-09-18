import { NextResponse } from 'next/server';
import { masterTurso, getTenantClient } from '../../../lib/turso';

export async function POST(req) {
  try {
    const { namaSekolah, adminUsername, adminPassword } = await req.json();
    const tenantId = 'TN' + Date.now();
    const dbName = 'lms-tenant-' + tenantId.toLowerCase();
    
    // 1. OTOMATISASI CREATE DATABASE DI TURSO (Membutuhkan Turso Platform API Token)
    // Karena ini Next.js, Anda memerlukan Turso Group Auth Token di environment variables.
    const orgName = "nama-organisasi-turso-anda"; 
    const platformToken = process.env.TURSO_PLATFORM_TOKEN;

    const createDbRes = await fetch(`[https://api.turso.tech/v1/organizations/$](https://api.turso.tech/v1/organizations/$){orgName}/databases`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${platformToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dbName, group: "default" })
    });
    
    if (!createDbRes.ok) throw new Error("Gagal membuat database fisik di Turso.");
    
    // 2. Create Token untuk Database Baru
    const createTokenRes = await fetch(`[https://api.turso.tech/v1/organizations/$](https://api.turso.tech/v1/organizations/$){orgName}/databases/${dbName}/auth/tokens`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${platformToken}` }
    });
    const tokenData = await createTokenRes.json();
    
    const tenantDbUrl = `libsql://${dbName}-${orgName}.turso.io`;
    const tenantDbToken = tokenData.jwt;

    // 3. Simpan Profil Tenant ke Master DB (Paket Free: 1 Admin, 1 Guru, 5 Siswa)
    await masterTurso.execute({
      sql: `INSERT INTO Tenants (TenantID, NamaSekolah, Subdomain, AdminUsername, AdminPassword, Paket, MaxAdmin, MaxGuru, MaxSiswa, DbUrl, DbToken) 
            VALUES (?, ?, ?, ?, ?, 'Free', 1, 1, 5, ?, ?)`,
      args: [tenantId, namaSekolah, dbName, adminUsername, adminPassword, tenantDbUrl, tenantDbToken]
    });

    // 4. Inisialisasi Tabel di Database Tenant Baru & Masukkan Akun Admin
    const tenantDb = getTenantClient(tenantDbUrl, tenantDbToken);
    
    // Buat Tabel Users
    await tenantDb.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        ID TEXT PRIMARY KEY, Nama TEXT, Username TEXT, Password TEXT, Role TEXT, Sekolah TEXT,
        Kelas TEXT, TglLahir TEXT, Foto TEXT, NISN TEXT
      )
    `);
    
    // Buat Akun Admin Pertama
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
