export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { masterTurso } from '../../../lib/turso';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password, tglLahir } = await req.json();

    // 1. Cek di tabel Tenants (Khusus akun Admin Sekolah Baru)
    try {
      const tenantResult = await masterTurso.execute({
        sql: "SELECT * FROM Tenants WHERE AdminUsername = ? AND AdminPassword = ?",
        args: [username, password]
      });

      if (tenantResult.rows.length > 0) {
        const tenant = tenantResult.rows[0];
        // Normalisasi key
        const tId = tenant.TenantID || tenant.tenantid;
        const tSekolah = tenant.NamaSekolah || tenant.namasekolah;
        const tUser = tenant.AdminUsername || tenant.adminusername;
        const tUrl = tenant.DbUrl || tenant.dburl;
        const tToken = tenant.DbToken || tenant.dbtoken;

        const token = jwt.sign(
          { id: tId, role: 'admin', nama: 'Admin ' + tSekolah },
          process.env.JWT_SECRET || 'rahasia_super_aman_cbt_123',
          { expiresIn: '12h' }
        );

        return NextResponse.json({
          status: 'success',
          data: { ID: tId, Nama: 'Admin ' + tSekolah, Username: tUser, Role: 'admin', Sekolah: tSekolah },
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq',
          tenantDbUrl: tUrl,
          tenantDbToken: tToken
        });
      }
    } catch (e) {
      console.log("Pengecekan Tenants dilewati:", e.message);
    }

    // 2. Cek di tabel Users (Superadmin / Guru / Siswa / Admin Lama)
    try {
      const userResult = await masterTurso.execute({
        sql: `SELECT u.*, t.DbUrl, t.DbToken 
              FROM Users u 
              LEFT JOIN Tenants t ON u.Sekolah = t.NamaSekolah 
              WHERE u.Username = ? AND u.Password = ?`,
        args: [username, password]
      });

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        
        // NORMALISASI KEY (Mengatasi masalah sensitivitas huruf besar/kecil)
        const id = user.ID || user.id;
        const nama = user.Nama || user.nama;
        const roleAsli = user.Role || user.role;
        const role = String(roleAsli).trim().toLowerCase();
        const tglLahirDB = user.TglLahir || user.tgllahir;
        const dbUrl = user.DbUrl || user.dburl || '';
        const dbToken = user.DbToken || user.dbtoken || '';

        // Validasi Ekstra Tanggal Lahir (Hanya untuk Siswa)
        if (role === 'siswa' && tglLahirDB !== tglLahir) {
          return NextResponse.json({ status: 'error', msg: 'Tanggal Lahir salah untuk akun Anda!' });
        }

        const token = jwt.sign(
          { id: id, role: roleAsli, nama: nama },
          process.env.JWT_SECRET || 'rahasia_super_aman_cbt_123',
          { expiresIn: '12h' }
        );

        // Standarisasi format data yang akan dilempar ke LocalStorage
        const safeUserData = {
           ID: id,
           Nama: nama,
           Username: user.Username || user.username,
           Password: user.Password || user.password,
           Role: roleAsli,
           Sekolah: user.Sekolah || user.sekolah || '-',
           Kelas: user.Kelas || user.kelas || '-',
           TglLahir: tglLahirDB || '-',
           Foto: user.Foto || user.foto || 'https://via.placeholder.com/60'
        };

        return NextResponse.json({
          status: 'success',
          data: safeUserData,
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq',
          tenantDbUrl: dbUrl,
          tenantDbToken: dbToken
        });
      }
    } catch (e) {
      console.log("Pengecekan Users dilewati:", e.message);
    }

    return NextResponse.json({ status: 'error', msg: 'Username atau Password salah!' });

  } catch (error) {
    console.error("API Login Error:", error);
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
