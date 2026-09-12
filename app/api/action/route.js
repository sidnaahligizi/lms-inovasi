export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { turso } from '../../../lib/turso';

export async function POST(req) {
  try {
    const { action, args } = await req.json();

    // 1. DASHBOARD DATA UTAMA
if (action === 'getDashboardData') {
      const [role, userId, , sekolah] = args; 
      let output = { logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq' };
      
      // Mengambil Data LMS
      try {
          const notifs = await turso.execute("SELECT * FROM Notifications ORDER BY Tanggal DESC LIMIT 5");
          output.notifications = notifs.rows;
          const materials = await turso.execute("SELECT * FROM Materials");
          output.materials = materials.rows;
      } catch(e) {
          output.notifications = []; output.materials = [];
      }

      if (role === 'admin' || role === 'guru') {
        let exams = await turso.execute("SELECT * FROM Exams WHERE Mapel != 'SURVEY'");
        let users = role === 'guru' 
            ? await turso.execute({ sql: "SELECT * FROM Users WHERE Role = 'siswa' AND LOWER(TRIM(Sekolah)) = LOWER(TRIM(?))", args: [sekolah] }) 
            : await turso.execute("SELECT * FROM Users WHERE Role = 'siswa'");
            
        output.exams = exams.rows;
        output.stats = { 
            totalSiswa: users.rows.length, 
            totalUjian: exams.rows.length, 
            activeUjian: exams.rows.filter(e => e.Status === 'Aktif').length 
        };

        // Mengambil Data CBT Lama (Peringkat & Survey)
        const schoolRankQuery = await turso.execute(`
            SELECT u.Sekolah, AVG(r.TotalNilai) as RataRata 
            FROM Results r JOIN Users u ON r.SiswaID = u.ID JOIN Exams e ON r.ExamID = e.ExamID
            WHERE e.Mapel != 'SURVEY' ${role === 'guru' ? "AND e.ShowStats IN ('Yes', 'Aktif')" : ""}
            GROUP BY u.Sekolah ORDER BY RataRata DESC
        `);
        output.schoolRanks = schoolRankQuery.rows;

        if (role === 'guru') {
            const studentRankQuery = await turso.execute({
                sql: `SELECT u.Nama, u.Kelas, e.Mapel, AVG(r.TotalNilai) as RataRata 
                      FROM Results r JOIN Users u ON r.SiswaID = u.ID JOIN Exams e ON r.ExamID = e.ExamID 
                      WHERE LOWER(TRIM(u.Sekolah)) = LOWER(TRIM(?)) AND e.Mapel != 'SURVEY' AND e.ShowStats IN ('Yes', 'Aktif')
                      GROUP BY u.ID, e.Mapel ORDER BY e.Mapel ASC, RataRata DESC`,
                args: [sekolah]
            });
            output.studentRanks = studentRankQuery.rows;
        }
        
        if (role === 'admin') {
            const surveys = await turso.execute("SELECT * FROM Exams WHERE Mapel = 'SURVEY'");
            output.surveys = surveys.rows;
        }

      } else if (role === 'siswa') {
        const exams = await turso.execute("SELECT * FROM Exams WHERE Mapel != 'SURVEY'");
        output.availableExams = exams.rows.filter(e => e.Status === 'Aktif');
        
        const history = await turso.execute({ 
          sql: "SELECT r.ResultID, r.ExamID, r.WaktuSubmit, r.TotalNilai as Nilai, e.Judul, e.AllowDownloadR, e.AllowDownloadQ, e.ShowStats, r.Pelanggaran FROM Results r JOIN Exams e ON r.ExamID = e.ExamID WHERE r.SiswaID = ? AND e.Mapel != 'SURVEY'", 
          args: [userId] 
        });
        output.history = history.rows;

        try {
            const absenStatus = await turso.execute({ sql: "SELECT * FROM Attendance WHERE SiswaID = ? AND Tanggal = date('now')", args: [userId]});
            output.hasAbsen = absenStatus.rows.length > 0;
        } catch(e) { output.hasAbsen = false; }
      }
      return NextResponse.json({ status: 'success', data: output });
    }

    // 2. LMS MANAJEMEN MATERI
    if (action === 'adminSaveMaterial') {
      const d = args[0]; 
      const id = d.matId || ('MAT' + Date.now());
      const dateNow = new Date().toISOString().split('T')[0];
      
      const cek = await turso.execute({ sql: "SELECT MatID FROM Materials WHERE MatID = ?", args: [id] });
      if (cek.rows.length > 0) {
        await turso.execute({ sql: "UPDATE Materials SET Judul=?, Mapel=?, TargetKelas=?, Tipe=?, Konten=? WHERE MatID=?", args: [d.judul, d.mapel, d.kelas, d.tipe, d.konten, id] });
      } else {
        await turso.execute({ sql: "INSERT INTO Materials (MatID, Mapel, TargetKelas, Judul, Tipe, Konten, Tanggal, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.mapel, d.kelas, d.judul, d.tipe, d.konten, dateNow, d.userId] });
      }
      return NextResponse.json({ status: 'success', msg: 'Materi berhasil disimpan!' });
    }

    if (action === 'adminDeleteMaterial') {
      await turso.execute({ sql: "DELETE FROM Materials WHERE MatID = ?", args: [args[0]] });
      return NextResponse.json({ status: 'success', msg: 'Materi dihapus!' });
    }

    // 3. LMS MANAJEMEN NOTIFIKASI
    if (action === 'adminSaveNotif') {
      const id = 'NOTIF' + Date.now();
      const dateNow = new Date().toISOString().split('T')[0];
      await turso.execute({ sql: "INSERT INTO Notifications (NotifID, Pesan, Tanggal, PembuatID) VALUES (?, ?, ?, ?)", args: [id, args[0], dateNow, args[1]] });
      return NextResponse.json({ status: 'success', msg: 'Notifikasi disiarkan!' });
    }

    // 4. LMS ABSENSI
    if (action === 'submitAbsen') {
      const uid = args[0];
      const dateNow = new Date().toISOString().split('T')[0];
      await turso.execute({ sql: "INSERT INTO Attendance (AbsenID, SiswaID, Tanggal, Status) VALUES (?, ?, ?, 'Hadir')", args: ['ABS' + Date.now(), uid, dateNow] });
      return NextResponse.json({ status: 'success', msg: 'Berhasil melakukan absensi hari ini!' });
    }

    if (action === 'getAbsenRekap') {
       const recap = await turso.execute("SELECT a.Tanggal, a.Status, u.Nama, u.Kelas, u.Sekolah FROM Attendance a JOIN Users u ON a.SiswaID = u.ID ORDER BY a.Tanggal DESC");
       return NextResponse.json({ status: 'success', data: recap.rows });
    }

    // -- BLOK CBT (UJIAN) LAMA TETAP DIPERTAHANKAN SEPERTI SEBELUMNYA --
    // Hanya memendekkan bagian ini untuk fokus pada LMS, sisipkan seluruh fungsi getExamQuestions, submitExam, dll persis seperti kode route-4.js Anda sebelumnya.
    
    return NextResponse.json({ status: 'success', data: [] });
  } catch (error) {
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}