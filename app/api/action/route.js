export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { masterTurso } from '../../../lib/turso';

export async function POST(req) {
  try {
    const { action, args, sekolah, role, userId } = await req.json();

    // ==========================================
    // 1. MANAJEMEN SUPER ADMIN (Upgrade & Ekspor)
    // ==========================================
    if (action === 'superAdminGetTenants') {
        const tenants = await masterTurso.execute("SELECT * FROM Tenants ORDER BY NamaSekolah ASC");
        const usersCount = await masterTurso.execute("SELECT Sekolah, COUNT(ID) as JmlSiswa FROM Users WHERE Role='siswa' GROUP BY Sekolah");
        return NextResponse.json({ status: 'success', data: { tenants: tenants.rows, usage: usersCount.rows } });
    }

    if (action === 'superAdminUpgradeTenant') {
        const [tenantId, newPaket, newMaxSiswa] = args;
        await masterTurso.execute({
            sql: "UPDATE Tenants SET Paket = ?, MaxSiswa = ? WHERE TenantID = ?",
            args: [newPaket, newMaxSiswa, tenantId]
        });
        return NextResponse.json({ status: 'success', msg: 'Kapasitas Sekolah berhasil di-upgrade!' });
    }

    if (action === 'exportDatabase') {
        const [targetSchools] = args; 
        let sqlFilter = ""; let filterArgs = [];

        // Proteksi: Admin hanya bisa ekspor sekolahnya sendiri
        if (role === 'admin') {
            sqlFilter = "WHERE Sekolah = ?";
            filterArgs = [sekolah];
        } else if (role === 'superadmin') {
            if (targetSchools && targetSchools.length > 0) {
                const placeholders = targetSchools.map(() => '?').join(',');
                sqlFilter = `WHERE Sekolah IN (${placeholders})`;
                filterArgs = targetSchools;
            } else {
                return NextResponse.json({ status: 'error', msg: 'Pilih minimal 1 sekolah untuk diekspor.' });
            }
        } else {
            return NextResponse.json({ status: 'error', msg: 'Akses Ditolak.' });
        }

        const usersData = await masterTurso.execute({ sql: `SELECT * FROM Users ${sqlFilter}`, args: filterArgs });
        const examsData = await masterTurso.execute({ sql: `SELECT * FROM Exams ${sqlFilter}`, args: filterArgs });
        const resultsData = await masterTurso.execute({ 
            sql: `SELECT r.ResultID, r.TotalNilai, r.WaktuSubmit, u.Nama, u.Kelas, u.Sekolah, e.Judul, e.Mapel FROM Results r JOIN Users u ON r.SiswaID = u.ID JOIN Exams e ON r.ExamID = e.ExamID ${sqlFilter.replace('Sekolah', 'u.Sekolah')}`, 
            args: filterArgs 
        });

        return NextResponse.json({ status: 'success', data: { users: usersData.rows, exams: examsData.rows, results: resultsData.rows } });
    }

    // ==========================================
    // 2. PROTEKSI KUOTA SISWA SEKOLAH
    // ==========================================
    const checkQuota = async (newSiswaCount, targetSekolah) => {
        const countRes = await masterTurso.execute({ sql: "SELECT COUNT(*) as count FROM Users WHERE Sekolah = ? AND Role = 'siswa'", args: [targetSekolah] });
        const tenantRes = await masterTurso.execute({ sql: "SELECT MaxSiswa FROM Tenants WHERE NamaSekolah = ?", args: [targetSekolah] });
        
        if (tenantRes.rows.length === 0) return true; 
        const current = Number(countRes.rows[0].count);
        const limit = Number(tenantRes.rows[0].MaxSiswa);
        
        if (current + newSiswaCount > limit) {
            throw new Error(`Kapasitas penuh (Maks: ${limit} Siswa). Silakan hubungi pengembang untuk Upgrade Paket Institusi Anda.`);
        }
    };

    if (action === 'adminBatchSaveUsers') {
        const usersArr = args[0];
        const siswaBaru = usersArr.filter(u => String(u.Role || 'siswa').toLowerCase() === 'siswa').length;
        await checkQuota(siswaBaru, sekolah); 

        for (let u of usersArr) {
            const id = 'U' + Date.now() + Math.floor(Math.random() * 10000);
            await masterTurso.execute({ 
                sql: `INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah, Kelas, TglLahir, NISN) VALUES (?,?,?,?,?,?,?,?,?)`, 
                args: [id, u.Nama||'-', u.Username||('user'+id), u.Password||'123456', String(u.Role||'siswa').toLowerCase(), sekolah, u.Kelas||'-', u.TglLahir||'-', u.NISN||'-'] 
            });
        }
        return NextResponse.json({ status: 'success', msg: `${usersArr.length} data berhasil diupload!` });
    }

    if (action === 'adminManageUser') {
      const mode = args[0]; const d = args[1] || {};
      if (mode === 'save') {
        const id = d.id || ('U' + Date.now());
        const isSiswa = String(d.role||'siswa').toLowerCase() === 'siswa';

        if (!d.id && isSiswa) await checkQuota(1, sekolah);

        // Cek username bentrok
        const cekUsername = await masterTurso.execute({ sql: "SELECT ID FROM Users WHERE Username = ? AND ID != ?", args: [d.username, id] });
        if(cekUsername.rows.length > 0) return NextResponse.json({ status: 'error', msg: 'Username sudah digunakan oleh akun lain!' });

        const cek = await masterTurso.execute({ sql: "SELECT ID FROM Users WHERE ID = ?", args: [id] });
        
        if (cek.rows.length > 0) {
          await masterTurso.execute({ sql: `UPDATE Users SET Nama=?, Username=?, Password=?, Role=?, Kelas=?, TglLahir=?, NISN=? WHERE ID=?`, args: [d.nama, d.username, d.password, d.role, d.kelas, d.tglLahir, d.nisn, id] });
        } else {
          await masterTurso.execute({ sql: `INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah, Kelas, TglLahir, NISN) VALUES (?,?,?,?,?,?,?,?,?)`, args: [id, d.nama, d.username, d.password, d.role, sekolah, d.kelas, d.tglLahir, d.nisn] });
        }
      } else if (mode === 'delete') {
        await masterTurso.execute({ sql: "DELETE FROM Users WHERE ID = ?", args: [d.id] });
      }
      return NextResponse.json({ status: 'success', msg: 'Data User berhasil disimpan!' });
    }

    if (action === 'getUserList') {
      const users = await masterTurso.execute({ sql: "SELECT * FROM Users WHERE Sekolah = ?", args: [sekolah] });
      return NextResponse.json({ status: 'success', data: users.rows });
    }

    // ==========================================
    // 3. DATA UJIAN & ISOLASI DASHBOARD
    // ==========================================
    if (action === 'getDashboardData') {
      let output = { logo: 'https://lh3.googleusercontent.com/d/1aWHmp6kNKwTYkwEMqVg34_ofiWRkymFe' };
      
      const notifs = await masterTurso.execute({ sql: "SELECT * FROM Notifications WHERE Sekolah = ? ORDER BY Tanggal DESC LIMIT 5", args: [sekolah] });
      output.notifications = notifs.rows;

      if (role === 'admin' || role === 'guru') {
        const exams = await masterTurso.execute({ sql: "SELECT * FROM Exams WHERE Sekolah = ?", args: [sekolah] });
        const materials = await masterTurso.execute({ sql: "SELECT * FROM Materials WHERE Sekolah = ?", args: [sekolah] });
        const users = await masterTurso.execute({ sql: "SELECT * FROM Users WHERE Role = 'siswa' AND Sekolah = ?", args: [sekolah] });
        
        output.exams = exams.rows;
        output.materials = materials.rows;
        output.stats = { totalSiswa: users.rows.length, totalUjian: exams.rows.length, activeUjian: exams.rows.filter(e => e.Status === 'Aktif').length };
      } else if (role === 'siswa') {
        const exams = await masterTurso.execute({ sql: "SELECT * FROM Exams WHERE Sekolah = ? AND Status = 'Aktif'", args: [sekolah] });
        output.availableExams = exams.rows;
        const history = await masterTurso.execute({ sql: "SELECT r.*, e.Judul, e.ShowStats FROM Results r JOIN Exams e ON r.ExamID = e.ExamID WHERE r.SiswaID = ?", args: [userId] });
        output.history = history.rows;
      }
      return NextResponse.json({ status: 'success', data: output });
    }

    if (action === 'adminSaveExam') {
      const d = args[0]; const id = d.examId || ('EX' + Date.now());
      const cek = await masterTurso.execute({ sql: "SELECT ExamID FROM Exams WHERE ExamID = ?", args: [id] });
      if (cek.rows.length > 0) {
        await masterTurso.execute({ sql: "UPDATE Exams SET Judul=?, Mapel=?, TargetKelas=?, Durasi=?, StartDate=?, EndDate=?, ShowStats=? WHERE ExamID=?", args: [d.judul, d.mapel, d.targetKelas, d.durasi, d.start, d.end, d.showStats, id] });
      } else {
        await masterTurso.execute({ sql: "INSERT INTO Exams (ExamID, Judul, Mapel, TargetKelas, Durasi, StartDate, EndDate, ShowStats, PembuatID, Sekolah) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.judul, d.mapel, d.targetKelas, d.durasi, d.start, d.end, d.showStats, userId, sekolah] });
      }
      return NextResponse.json({ status: 'success', msg: 'Jadwal Ujian disimpan!' });
    }

    if (action === 'getExamQuestions' || action === 'getSiswaSoal') {
      const qs = await masterTurso.execute({ sql: "SELECT * FROM Questions WHERE ExamID = ?", args: [args[0]] });
      if (action === 'getSiswaSoal') return NextResponse.json({ status: 'success', data: qs.rows });
      return NextResponse.json(qs.rows);
    }

    if (action === 'adminSaveSingleQuestion') {
      const eid = args[0]; const d = args[1]; const id = d.id || ('Q' + Date.now());
      const cek = await masterTurso.execute({ sql: "SELECT QID FROM Questions WHERE QID = ?", args: [id] });
      if (cek.rows.length > 0) {
        await masterTurso.execute({ sql: "UPDATE Questions SET Tipe=?, Pertanyaan=?, Options=?, Key=?, Skor=?, Nomor=? WHERE QID=?", args: [d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, id] });
      } else {
        await masterTurso.execute({ sql: "INSERT INTO Questions (QID, ExamID, Tipe, Pertanyaan, Options, Key, Skor, Nomor, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, eid, d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, userId] });
      }
      return NextResponse.json({ status: 'success', id: id, msg: 'Soal tersimpan!' });
    }

    if (action === 'submitExam') {
       const [uid, eid, answers, violations] = args;
       let rawTotalScore = 0; let detailLog = []; let maxPossibleTotalScore = 0;
       const qs = await masterTurso.execute({ sql: "SELECT * FROM Questions WHERE ExamID=?", args:[eid] });
       
       qs.rows.forEach(q => { maxPossibleTotalScore += Number(q.Skor) || 0; });
       answers.forEach(ans => {
          const q = qs.rows.find(x => x.QID === ans.qid);
          if(q) {
             const keys = JSON.parse(q.Key || "[]"); let scoreEarned = 0; const maxSkor = Number(q.Skor) || 0;
             if (q.Tipe === 'PGS' && keys.includes(ans.answer)) scoreEarned = maxSkor;
             rawTotalScore += scoreEarned; detailLog.push({ i: q.Nomor, s: scoreEarned, m: maxSkor, t: q.Tipe, a: ans.answer });
          }
       });
       let finalScore100 = maxPossibleTotalScore > 0 ? (rawTotalScore / maxPossibleTotalScore) * 100 : 0;
       await masterTurso.execute({ sql: "INSERT INTO Results (ResultID, SiswaID, ExamID, TotalNilai, Detail, WaktuSubmit, Sekolah) VALUES (?, ?, ?, ?, ?, ?, ?)", args: ['RES' + Date.now(), uid, eid, finalScore100, JSON.stringify(detailLog), new Date().toISOString(), sekolah] });
       return NextResponse.json({ status: 'success', msg: 'Berhasil dikirim' });
    }

    if (action === 'getRecapList') {
      const results = await masterTurso.execute({ sql: `SELECT r.*, u.Nama as NamaSiswa, u.Kelas as KelasSiswa, e.Judul as JudulUjian, e.Mapel, e.ShowStats FROM Results r JOIN Users u ON r.SiswaID = u.ID JOIN Exams e ON r.ExamID = e.ExamID WHERE r.Sekolah = ?`, args: [sekolah] });
      return NextResponse.json({ status: 'success', data: results.rows });
    }

    if (action === 'adminDeleteResult') {
       await masterTurso.execute({ sql: "DELETE FROM Results WHERE ResultID=?", args: [args[0]] });
       return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'success', data: [] });
  } catch (error) { 
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 }); 
  }
}
