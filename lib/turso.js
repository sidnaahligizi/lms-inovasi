import { createClient } from '@libsql/client';

// Koneksi ke Database Master (SaaS Control Plane)
export const masterTurso = createClient({
  url: process.env.TURSO_MASTER_DATABASE_URL,
  authToken: process.env.TURSO_MASTER_AUTH_TOKEN,
});

// Fungsi untuk membuat koneksi dinamis ke database Tenant (Sekolah)
export const getTenantClient = (dbUrl, dbToken) => {
  return createClient({
    url: dbUrl,
    authToken: dbToken,
  });
};
