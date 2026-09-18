import { createClient } from '@libsql/client';

// ========================================================
// 1. KONEKSI MASTER DATABASE (Dengan Build-Time Protection)
// ========================================================
let masterInstance = null;

function getMasterClient() {
  if (!masterInstance) {
    const url = process.env.TURSO_MASTER_DATABASE_URL;
    const authToken = process.env.TURSO_MASTER_AUTH_TOKEN;

    // Mencegah error 'URL_INVALID' saat proses build di Vercel
    if (!url) {
      return { 
        execute: async () => ({ rows: [] }), 
        batch: async () => ([]) 
      };
    }

    masterInstance = createClient({
      url: url,
      authToken: authToken,
    });
  }
  return masterInstance;
}

export const masterTurso = {
  execute: async (query, params = []) => {
    const db = getMasterClient();
    return await db.execute(
      typeof query === 'string' ? { sql: query, args: params } : query
    );
  },
  batch: async (queries) => {
    const db = getMasterClient();
    return await db.batch(queries);
  }
};

// ========================================================
// 2. KONEKSI TENANT DATABASE (Sesuai kebutuhan API Anda)
// ========================================================
export function getTenantClient(tenantUrl, tenantAuthToken) {
  // Perlindungan yang sama jika dipanggil otomatis oleh sistem saat build
  if (!tenantUrl) {
    return { 
      execute: async () => ({ rows: [] }), 
      batch: async () => ([]) 
    };
  }

  return createClient({
    url: tenantUrl,
    authToken: tenantAuthToken
  });
}
