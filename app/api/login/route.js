export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { masterTurso } from '../../../lib/turso';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password, tglLahir } = await req.json();

    // 1. Cek di tabel SuperAdmins terlebih dahulu
    const superResult = await masterTurso.execute({
      sql: "SELECT * FROM SuperAdmins WHERE Username = ? AND Password = ?",
      args: [username, password]
    });

    if (superResult.rows.length > 0) {
      const user = superResult.rows[0];
      const token = jwt.sign(
        { id: user.ID, role: 'admin', nama: user.Nama }, // Role diset 'admin' agar bisa akses dashboard
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

    // 2. Jika bukan SuperAdmin, cek di tabel Users (Admin Institusi / Guru / Siswa)
    const result = await masterTurso.execute({
      sql: "SELECT * FROM Users WHERE Username = ? AND Password = ?",
      args: [username, password]
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
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
        logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq'
      });
    }

    return NextResponse.json({ status: 'error', msg: 'Username atau Password salah!' });
    
  } catch (error) {
    console.error("API Login Error:", error);
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
