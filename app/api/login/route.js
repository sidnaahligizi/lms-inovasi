export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { masterTurso } from '../../../lib/turso';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password, tglLahir } = await req.json();

    // 1. Cek Super Admin
    try {
      const superResult = await masterTurso.execute({
        sql: "SELECT * FROM SuperAdmins WHERE Username = ? AND Password = ?",
        args: [username, password]
      });
      if (superResult.rows.length > 0) {
        const user = superResult.rows[0];
        const token = jwt.sign({ id: user.ID, role: 'superadmin', nama: user.Nama }, process.env.JWT_SECRET || 'rahasia_cbt', { expiresIn: '12h' });
        return NextResponse.json({
          status: 'success',
          data: { ID: user.ID, Nama: user.Nama, Username: user.Username, Role: 'superadmin', Sekolah: 'Semua Sekolah' },
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq'
        });
      }
    } catch (e) {}

    // 2. Cek Users Umum (Admin Sekolah/Guru/Siswa)
    try {
      const userResult = await masterTurso.execute({
        sql: "SELECT u.*, t.MaxSiswa FROM Users u LEFT JOIN Tenants t ON u.Sekolah = t.NamaSekolah WHERE u.Username = ? AND u.Password = ?",
        args: [username, password]
      });

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const role = String(user.Role).trim().toLowerCase();

        if (role === 'siswa' && user.TglLahir !== tglLahir) {
          return NextResponse.json({ status: 'error', msg: 'Tanggal Lahir salah untuk akun Anda!' });
        }

        const token = jwt.sign({ id: user.ID, role: role, nama: user.Nama }, process.env.JWT_SECRET || 'rahasia_cbt', { expiresIn: '12h' });
        return NextResponse.json({
          status: 'success',
          data: { ...user, Role: role },
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq'
        });
      }
    } catch (e) {}

    return NextResponse.json({ status: 'error', msg: 'Username atau Password salah!' });

  } catch (error) {
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
