export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { turso } from '../../../lib/turso';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password, tglLahir } = await req.json();

    // 1. Bypass & Cek Super Admin Pasti Berhasil
    if (username === 'superadmin1' && password === 'passwordsuper123') {
        const token = jwt.sign({ id: 'SA-001', role: 'superadmin', nama: 'Pusat Sistem' }, process.env.JWT_SECRET || 'rahasia_cbt', { expiresIn: '12h' });
        return NextResponse.json({
          status: 'success',
          data: { ID: 'SA-001', Nama: 'Pusat Sistem', Username: 'superadmin1', Role: 'superadmin', Sekolah: 'Semua Sekolah' },
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq'
        });
    }

    // 2. Cek Tabel Users (Admin Sekolah, Guru, Siswa)
    try {
      const userResult = await turso.execute({
        sql: "SELECT u.*, t.MaxSiswa, t.DbUrl as CustomLogo, t.DbToken as CustomName FROM Users u LEFT JOIN Tenants t ON u.Sekolah = t.NamaSekolah WHERE u.Username = ? AND u.Password = ?",
        args: [username, password]
      });

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const roleAsli = user.Role || user.role;
        const role = String(roleAsli).trim().toLowerCase();
        const tglLahirDB = user.TglLahir || user.tgllahir;

        if (role === 'siswa' && tglLahirDB !== tglLahir) {
          return NextResponse.json({ status: 'error', msg: 'Tanggal Lahir salah untuk akun Anda!' });
        }

        const id = user.ID || user.id;
        const nama = user.Nama || user.nama;
        const token = jwt.sign({ id: id, role: roleAsli, nama: nama }, process.env.JWT_SECRET || 'rahasia_cbt', { expiresIn: '12h' });

        const defaultLogo = 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq';
        const customLogo = user.CustomLogo || user.customlogo;
        const customName = user.CustomName || user.customname;

        return NextResponse.json({
          status: 'success',
          data: {
             ID: id, Nama: nama, Username: user.Username || user.username, Password: user.Password || user.password,
             Role: roleAsli, Sekolah: user.Sekolah || user.sekolah || '-', Kelas: user.Kelas || user.kelas || '-',
             TglLahir: tglLahirDB || '-', Foto: user.Foto || user.foto || 'https://via.placeholder.com/60',
             LmsName: customName || 'LMS BELAJAR INOVASI'
          },
          token: token,
          logo: customLogo || defaultLogo
        });
      }
    } catch (e) {}

    return NextResponse.json({ status: 'error', msg: 'Gagal Login: Username atau Password salah!' });

  } catch (error) {
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
