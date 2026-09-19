export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { masterTurso } from '../../../lib/turso';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password, tglLahir } = await req.json();

    // 1. Cek di tabel SuperAdmins (Master DB)
    try {
      const superResult = await masterTurso.execute({
        sql: "SELECT * FROM SuperAdmins WHERE Username = ? AND Password = ?",
        args: [username, password]
      });

      if (superResult.rows.length > 0) {
        const user = superResult.rows[0];
        const token = jwt.sign(
          { id: user.ID, role: 'admin', nama: user.Nama },
          process.env.JWT_SECRET || 'rahasia_super_aman_cbt_123',
          { expiresIn: '12h' }
        );

        return NextResponse.json({
          status: 'success',
          data: { ...user, Role: 'admin' },
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq'
        });
      }
    } catch (e) {
      console.log("Pengecekan SuperAdmins dilewati:", e.message);
    }

    // 2. Cek di tabel Tenants (Untuk Admin Institusi Baru di Master DB)
    try {
      const tenantResult = await masterTurso.execute({
        sql: "SELECT * FROM Tenants WHERE AdminUsername = ? AND AdminPassword = ?",
        args: [username, password]
      });

      if (tenantResult.rows.length > 0) {
        const tenant = tenantResult.rows[0];
        const token = jwt.sign(
          { id: tenant.TenantID, role: 'admin', nama: 'Admin ' + tenant.NamaSekolah },
          process.env.JWT_SECRET || 'rahasia_super_aman_cbt_123',
          { expiresIn: '12h' }
        );

        return NextResponse.json({
          status: 'success',
          data: {
            ID: tenant.TenantID,
            Nama: 'Admin ' + tenant.NamaSekolah,
            Username: tenant.AdminUsername,
            Role: 'admin',
            Sekolah: tenant.NamaSekolah
          },
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq',
          tenantDbUrl: tenant.DbUrl,
          tenantDbToken: tenant.DbToken
        });
      }
    } catch (e) {
      console.log("Pengecekan Tenants dilewati:", e.message);
    }

    // 3. Cek di tabel Users (Untuk Guru/Siswa/Admin Legacy di Master DB)
    try {
      // Gabungkan dengan tabel Tenants untuk mendapatkan URL Database Anak
      const userResult = await masterTurso.execute({
        sql: `SELECT u.*, t.DbUrl, t.DbToken 
              FROM Users u 
              LEFT JOIN Tenants t ON u.Sekolah = t.NamaSekolah 
              WHERE u.Username = ? AND u.Password = ?`,
        args: [username, password]
      });

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const role = String(user.Role).trim().toLowerCase();

        // Cek Tanggal Lahir HANYA jika yang login adalah siswa
        if (role === 'siswa' && user.TglLahir !== tglLahir) {
          return NextResponse.json({ status: 'error', msg: 'Tanggal Lahir salah untuk akun Anda!' });
        }

        const token = jwt.sign(
          { id: user.ID, role: user.Role, nama: user.Nama },
          process.env.JWT_SECRET || 'rahasia_super_aman_cbt_123',
          { expiresIn: '12h' }
        );

        return NextResponse.json({
          status: 'success',
          data: user,
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq',
          tenantDbUrl: user.DbUrl || '',
          tenantDbToken: user.DbToken || ''
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
