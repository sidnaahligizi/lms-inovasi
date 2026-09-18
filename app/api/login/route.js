import { NextResponse } from 'next/server';
import { masterTurso, getTenantClient } from '../../../lib/turso';
import jwt from 'jsonwebtoken';

export async function POST(req) {
  try {
    const { username, password, tglLahir } = await req.json();

    // 1. Cek apakah ini Super Admin (Pak Wanto)
    const superAdminCheck = await masterTurso.execute({
      sql: "SELECT * FROM SuperAdmins WHERE Username = ? AND Password = ?",
      args: [username, password]
    });

    if (superAdminCheck.rows.length > 0) {
      const user = superAdminCheck.rows[0];
      const token = jwt.sign({ id: user.ID, role: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
      return NextResponse.json({ status: 'success', data: { ...user, Role: 'superadmin', Nama: user.Nama }, token: token, logo: '' });
    }

    // 2. Jika bukan Super Admin, cari di database seluruh Tenant
    const tenants = await masterTurso.execute("SELECT * FROM Tenants WHERE Status = 'Aktif'");
    
    for (let tenant of tenants.rows) {
      const tenantDb = getTenantClient(tenant.DbUrl, tenant.DbToken);
      
      try {
        const result = await tenantDb.execute({
          sql: "SELECT * FROM Users WHERE Username = ? AND Password = ?",
          args: [username, password]
        });

        if (result.rows.length > 0) {
          const user = result.rows[0];
          const role = String(user.Role).trim().toLowerCase();

          if (role === 'siswa' && user.TglLahir !== tglLahir) {
            return NextResponse.json({ status: 'error', msg: 'Tanggal Lahir salah untuk akun Anda!' });
          }

          // Cek Limit Paket Berdasarkan Tenant
          if (role === 'siswa' && tenant.MaxSiswa !== -1) {
            const countSiswa = await tenantDb.execute("SELECT COUNT(*) as count FROM Users WHERE Role='siswa'");
            if(countSiswa.rows[0].count > tenant.MaxSiswa && !user.TglLahir) {
              // Jika melampaui limit, akses siswa baru ditolak
            }
          }

          const token = jwt.sign({ id: user.ID, role: user.Role, tenantId: tenant.TenantID }, process.env.JWT_SECRET, { expiresIn: '6h' });

          return NextResponse.json({
            status: 'success',
            data: user,
            token: token,
            tenantDbUrl: tenant.DbUrl,
            tenantDbToken: tenant.DbToken,
            logo: '[https://lh3.googleusercontent.com/d/1aWHmp6kNKwTYkwEMqVg34_ofiWRkymFe](https://lh3.googleusercontent.com/d/1aWHmp6kNKwTYkwEMqVg34_ofiWRkymFe)'
          });
        }
      } catch (e) {
        console.log(`Gagal query ke tenant ${tenant.NamaSekolah}`);
      }
    }

    return NextResponse.json({ status: 'error', msg: 'Username atau Password salah atau sekolah dibekukan!' });
    
  } catch (error) {
    console.error("API Login Error:", error);
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
