import { createClient } from '@libsql/client';

// Membaca berbagai kemungkinan nama variabel yang Anda set di Vercel
const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_CONNECTION_URL || process.env.TURSO_MASTER_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_MASTER_AUTH_TOKEN;

// Menggunakan 1 koneksi terpusat. Jika kosong, gunakan URL dummy agar build sukses, 
// tetapi akan memberikan error yang jelas (bukan silent fail) saat dijalankan.
export const turso = createClient({
  url: url || 'libsql://database-tidak-ditemukan.turso.io',
  authToken: authToken || 'token-kosong',
});

// Ekspor alias agar file-file API lama yang belum diubah tidak langsung error
export const masterTurso = turso;
export function getTenantClient() { return turso; }
