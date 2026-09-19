export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { turso } from '../../../lib/turso';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password, tglLahir } = await req.json();

    // 1. Cek Tabel Super Admin
    try {
      const superResult = await turso.execute({ sql: "SELECT * FROM SuperAdmins WHERE Username = ? AND Password = ?", args: [username, password] });
      if (superResult.rows.length > 0) {
        const user = superResult.rows[0];
        const token = jwt.sign({ id: user.ID || user.id, role: 'superadmin', nama: user.Nama || user.nama }, process.env.JWT_SECRET || 'rahasia_cbt', { expiresIn: '12h' });
        return NextResponse.json({
          status: 'success',
          data: { ID: user.ID || user.id, Nama: user.Nama || user.nama, Username: user.Username || user.username, Role: 'superadmin', Sekolah: 'Pusat Sistem', Paket: 'Unlimited' },
          token: token,
          logo: 'https://lh3.googleusercontent.com/d/1aWHmp6kNKwTYkwEMqVg34_ofiWRkymFe'
        });
      }
    } catch (e) {}

    // 2. Cek Tabel Users (Admin Sekolah, Guru, Siswa)
    try {
      const userResult = await turso.execute({
        sql: "SELECT u.*, t.Paket, t.MaxSiswa, t.Logo FROM Users u LEFT JOIN Tenants t ON u.Sekolah = t.NamaSekolah WHERE u.Username = ? AND u.Password = ?",
        args: [username, password]
      });

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const roleAsli = user.Role || user.role;
        const role = String(roleAsli).trim().toLowerCase();
        const tglLahirDB = user.TglLahir || user.tgllahir;

        if (role === 'siswa' && tglLahirDB !== tglLahir) return NextResponse.json({ status: 'error', msg: 'Tanggal Lahir salah untuk akun Anda!' });

        const id = user.ID || user.id; const nama = user.Nama || user.nama;
        const token = jwt.sign({ id: id, role: roleAsli, nama: nama }, process.env.JWT_SECRET || 'rahasia_cbt', { expiresIn: '12h' });
        
        const logoDB = user.Logo || user.logo || 'https://lh3.googleusercontent.com/d/1aWHmp6kNKwTYkwEMqVg34_ofiWRkymFe';
        const paketDB = user.Paket || user.paket || 'Paket Uji Coba';

        return NextResponse.json({
          status: 'success',
          data: {
             ID: id, Nama: nama, Username: user.Username || user.username, Password: user.Password || user.password,
             Role: roleAsli, Sekolah: user.Sekolah || user.sekolah || '-', Kelas: user.Kelas || user.kelas || '-',
             TglLahir: tglLahirDB || '-', Paket: paketDB, Foto: user.Foto || user.foto || 'https://via.placeholder.com/60', LogoUrl: logoDB
          },
          token: token, logo: logoDB
        });
      }
    } catch (e) {}

    return NextResponse.json({ status: 'error', msg: 'Gagal Login: Username atau Password salah!' });
  } catch (error) { return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 }); }
}
