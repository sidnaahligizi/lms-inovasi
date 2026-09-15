export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { turso } from '../../../lib/turso';

export async function POST(req) {
  try {
    const { action, args } = await req.json();

    // ==========================================
    // 1. MANAJEMEN USER & SEKOLAH
    // ==========================================
    if (action === 'adminBatchSaveUsers') {
        const usersArr = args[0];
        for (let u of usersArr) {
            const id = 'U' + Date.now() + Math.floor(Math.random() * 10000);
            await turso.execute({ 
                sql: "INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah, Kelas, TglLahir) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                args: [id, u.Nama || '-', u.Username || ('user'+id), u.Password || '123456', String(u.Role || 'siswa').toLowerCase(), u.Sekolah || '', u.Kelas || '', u.TglLahir || ''] 
            });
        }
        return NextResponse.json({ status: 'success', msg: `${usersArr.length} data siswa berhasil diupload!` });
    }

if (action === 'adminManageUser') {
      const mode = args[0]; const d = args[1];
      if (mode === 'save') {
        const id = d.id || ('U' + Date.now());
        
        // Mencegah Duplikasi NISN (Pastikan kolom NISN ada di database Turso Anda)
        if(d.nisn) {
            const cekDuplicate = await turso.execute({ sql: "SELECT ID FROM Users WHERE (NISN = ? OR nisn = ?) AND (ID != ? AND id != ?)", args: [d.nisn, d.nisn, id, id] });
            if(cekDuplicate.rows.length > 0) return NextResponse.json({ status: 'error', msg: 'NISN sudah terdaftar pada akun lain!' });
        }

        const cek = await turso.execute({ sql: "SELECT ID FROM Users WHERE ID = ? OR id = ?", args: [id, id] });
        if (cek.rows.length > 0) {
          // Update Query (Pastikan kolom-kolom baru ini dibuat di Turso)
          await turso.execute({ 
              sql: "UPDATE Users SET Nama=?, Username=?, Password=?, Role=?, Sekolah=?, Kelas=?, TglLahir=?, Foto=?, NIS=?, NISN=?, JenisKelamin=?, TempatLahir=?, NamaAyah=?, NamaIbu=?, NIK=?, NoKK=?, Alamat=?, RTRW=?, KodePos=?, DesaKelurahan=?, Kecamatan=?, KabupatenKota=?, NamaWali=? WHERE ID=? OR id=?", 
              args: [d.nama, d.username, d.password, d.role, d.sekolah, d.kelas, d.tglLahir, d.foto, d.nis, d.nisn, d.jk, d.tempatLahir, d.ayah, d.ibu, d.nik, d.nokk, d.alamat, d.rtrw, d.kodepos, d.desa, d.kecamatan, d.kabupaten, d.wali, id, id] 
          });
        } else {
          await turso.execute({ 
              sql: "INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah, Kelas, TglLahir, Foto, NIS, NISN, JenisKelamin, TempatLahir, NamaAyah, NamaIbu, NIK, NoKK, Alamat, RTRW, KodePos, DesaKelurahan, Kecamatan, KabupatenKota, NamaWali) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", 
              args: [id, d.nama, d.username, d.password, d.role, d.sekolah, d.kelas, d.tglLahir, d.foto, d.nis, d.nisn, d.jk, d.tempatLahir, d.ayah, d.ibu, d.nik, d.nokk, d.alamat, d.rtrw, d.kodepos, d.desa, d.kecamatan, d.kabupaten, d.wali] 
          });
        }
      } else if (mode === 'delete') {
        await turso.execute({ sql: "DELETE FROM Users WHERE ID = ? OR id = ?", args: [d.id, d.id] });
      }
      return NextResponse.json({ status: 'success', msg: 'Data User berhasil disimpan!' });
    }

    if (action === 'getUserList') {
      const [role, , sekolah] = args;
      let sql = "SELECT * FROM Users";
      let pArgs = [];
      // Jika guru, hanya tampilkan user (siswa & guru) di sekolahnya
      if (role === 'guru') {
          sql += " WHERE LOWER(TRIM(Sekolah)) = LOWER(TRIM(?)) OR LOWER(TRIM(sekolah)) = LOWER(TRIM(?))";
          pArgs.push(sekolah, sekolah);
      }
      const users = await turso.execute({ sql: sql, args: pArgs });
      return NextResponse.json({ status: 'success', data: users.rows });
    }

    // ==========================================
    // 2. MANAJEMEN ABSENSI (SISWA & GURU)
    // ==========================================
    if (action === 'adminSaveAbsenBatch') {
        const [records] = args; 
        for(let r of records) {
            const id = 'ABS' + Date.now() + Math.floor(Math.random() * 1000);
            await turso.execute({ sql: "INSERT INTO Attendance (AbsenID, SiswaID, Tanggal, Status) VALUES (?, ?, ?, ?)", args: [id, r.uid, r.tgl, r.status] });
        }
        return NextResponse.json({ status: 'success', msg: 'Absensi berhasil disimpan!' });
    }

    if (action === 'adminUpdateAbsen') {
        await turso.execute({ sql: "UPDATE Attendance SET Status = ? WHERE AbsenID = ? OR absenid = ?", args: [args[1], args[0], args[0]] });
        return NextResponse.json({ status: 'success' });
    }

    if (action === 'getAbsenRekap') {
        const [role, sekolah] = args;
        let sql = "SELECT a.AbsenID, a.absenid, a.Tanggal, a.tanggal, a.Status, a.status, u.Nama, u.nama, u.Kelas, u.kelas, u.Sekolah, u.sekolah, u.Role, u.role FROM Attendance a JOIN Users u ON a.SiswaID = u.ID OR a.siswaid = u.id";
        let pArgs = [];
        if (role === 'guru') { 
            sql += " WHERE LOWER(TRIM(u.Sekolah)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.sekolah)) = LOWER(TRIM(?))"; 
            pArgs.push(sekolah, sekolah); 
        }
        sql += " ORDER BY COALESCE(a.Tanggal, a.tanggal) DESC";
        const recap = await turso.execute({ sql, args: pArgs });
        return NextResponse.json({ status: 'success', data: recap.rows });
    }

    if (action === 'getSiswaAbsen') {
        const history = await turso.execute({ sql: "SELECT * FROM Attendance WHERE SiswaID = ? OR siswaid = ? ORDER BY COALESCE(Tanggal, tanggal) DESC", args: [args[0], args[0]] });
        return NextResponse.json({ status: 'success', data: history.rows });
    }

    if (action === 'submitAbsen') {
      const uid = args[0];
      const dateNow = new Date().toISOString().split('T')[0];
      await turso.execute({ sql: "INSERT INTO Attendance (AbsenID, SiswaID, Tanggal, Status) VALUES (?, ?, ?, 'Hadir')", args: ['ABS' + Date.now(), uid, dateNow] });
      return NextResponse.json({ status: 'success', msg: 'Berhasil melakukan absensi hari ini!' });
    }

    // ==========================================
    // 3. DASHBOARD & DATA UTAMA
    // ==========================================
    if (action === 'getDashboardData') {
      const [role, userId, , sekolah] = args; 
      let output = { logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq' };
      
      try {
          const notifs = await turso.execute("SELECT * FROM Notifications ORDER BY COALESCE(Tanggal, tanggal) DESC LIMIT 5");
          output.notifications = notifs.rows;
      } catch(e) { output.notifications = []; }

      if (role === 'admin' || role === 'guru') {
        let exams, materials;
        if (role === 'guru') {
            exams = await turso.execute({ sql: "SELECT * FROM Exams WHERE LOWER(COALESCE(Mapel, mapel)) != 'survey' AND (PembuatID = ? OR pembuatid = ?)", args: [userId, userId] });
            materials = await turso.execute({ sql: "SELECT * FROM Materials WHERE PembuatID = ? OR pembuatid = ?", args: [userId, userId] });
        } else {
            exams = await turso.execute("SELECT * FROM Exams WHERE LOWER(COALESCE(Mapel, mapel)) != 'survey'");
            materials = await turso.execute("SELECT * FROM Materials");
        }
        
        let sqlUsers = role === 'guru' ? "SELECT * FROM Users WHERE (Role = 'siswa' OR role = 'siswa') AND (LOWER(TRIM(Sekolah)) = LOWER(TRIM(?)) OR LOWER(TRIM(sekolah)) = LOWER(TRIM(?)))" : "SELECT * FROM Users WHERE Role = 'siswa' OR role = 'siswa'";
        let pArgsUsers = role === 'guru' ? [sekolah, sekolah] : [];
        let users = await turso.execute({ sql: sqlUsers, args: pArgsUsers });
            
        output.exams = exams.rows;
        output.materials = materials.rows;
        output.stats = { totalSiswa: users.rows.length, totalUjian: exams.rows.length, activeUjian: exams.rows.filter(e => (e.Status||e.status) === 'Aktif').length };

        const schoolRankQuery = await turso.execute(`SELECT COALESCE(u.Sekolah, u.sekolah) as Sekolah, AVG(COALESCE(r.TotalNilai, r.totalnilai)) as RataRata FROM Results r JOIN Users u ON r.SiswaID = u.ID OR r.siswaid = u.id JOIN Exams e ON r.ExamID = e.ExamID OR r.examid = e.examid WHERE LOWER(COALESCE(e.Mapel, e.mapel)) != 'survey' ${role === 'guru' ? "AND COALESCE(e.ShowStats, e.showstats) IN ('Yes', 'Aktif')" : ""} GROUP BY COALESCE(u.Sekolah, u.sekolah) ORDER BY RataRata DESC`);
        output.schoolRanks = schoolRankQuery.rows;

        if (role === 'guru') {
            const studentRankQuery = await turso.execute({
                sql: `SELECT COALESCE(u.Nama, u.nama) as Nama, COALESCE(u.Kelas, u.kelas) as Kelas, COALESCE(e.Mapel, e.mapel) as Mapel, AVG(COALESCE(r.TotalNilai, r.totalnilai)) as RataRata FROM Results r JOIN Users u ON r.SiswaID = u.ID OR r.siswaid = u.id JOIN Exams e ON r.ExamID = e.ExamID OR r.examid = e.examid WHERE (LOWER(TRIM(u.Sekolah)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.sekolah)) = LOWER(TRIM(?))) AND LOWER(COALESCE(e.Mapel, e.mapel)) != 'survey' AND COALESCE(e.ShowStats, e.showstats) IN ('Yes', 'Aktif') GROUP BY u.ID, u.id, COALESCE(e.Mapel, e.mapel) ORDER BY COALESCE(e.Mapel, e.mapel) ASC, RataRata DESC`, args: [sekolah, sekolah]
            });
            output.studentRanks = studentRankQuery.rows;
        }

      } else if (role === 'siswa') {
        const exams = await turso.execute("SELECT * FROM Exams WHERE LOWER(COALESCE(Mapel, mapel)) != 'survey'");
        output.availableExams = exams.rows.filter(e => (e.Status||e.status) === 'Aktif');
        const materials = await turso.execute("SELECT * FROM Materials");
        output.materials = materials.rows;
        
        const history = await turso.execute({ 
          sql: "SELECT COALESCE(r.ResultID, r.resultid) as ResultID, COALESCE(r.ExamID, r.examid) as ExamID, COALESCE(r.WaktuSubmit, r.waktusubmit) as WaktuSubmit, COALESCE(r.TotalNilai, r.totalnilai) as Nilai, COALESCE(e.Judul, e.judul) as Judul, COALESCE(e.AllowDownloadR, e.allowdownloadr) as AllowDownloadR, COALESCE(e.AllowDownloadQ, e.allowdownloadq) as AllowDownloadQ, COALESCE(e.ShowStats, e.showstats) as ShowStats, COALESCE(r.Pelanggaran, r.pelanggaran) as Pelanggaran FROM Results r JOIN Exams e ON (r.ExamID = e.ExamID OR r.examid = e.examid) WHERE (r.SiswaID = ? OR r.siswaid = ?) AND LOWER(COALESCE(e.Mapel, e.mapel)) != 'survey'", 
          args: [userId, userId] 
        });
        output.history = history.rows;

        try {
            const absenStatus = await turso.execute({ sql: "SELECT * FROM Attendance WHERE (SiswaID = ? OR siswaid = ?) AND COALESCE(Tanggal, tanggal) = date('now')", args: [userId, userId]});
            output.hasAbsen = absenStatus.rows.length > 0;
        } catch(e) { output.hasAbsen = false; }
      }
      return NextResponse.json({ status: 'success', data: output });
    }

    // ==========================================
    // 4. API UNTUK RAPORT (MENGGUNAKAN COALESCE AGAR KEBAL)
    // ==========================================
    if (action === 'getRaportData') {
        const [role, sekolah] = args;
        let sqlUsers = "SELECT ID, id, Nama, nama, Kelas, kelas, Sekolah, sekolah, Username, username FROM Users WHERE Role='siswa' OR role='siswa'";
        let pArgs = [];
        if (role === 'guru') { sqlUsers += " AND LOWER(TRIM(COALESCE(Sekolah, sekolah))) = LOWER(TRIM(?))"; pArgs.push(sekolah); }
        const users = await turso.execute({ sql: sqlUsers, args: pArgs });
        const results = await turso.execute("SELECT COALESCE(r.SiswaID, r.siswaid) as sID, COALESCE(r.TotalNilai, r.totalnilai) as tNilai, COALESCE(e.Mapel, e.mapel) as tMapel, COALESCE(e.Judul, e.judul) as tJudul FROM Results r JOIN Exams e ON (r.ExamID = e.ExamID OR r.examid = e.examid) WHERE LOWER(COALESCE(e.Mapel, e.mapel)) != 'survey'");
        const absen = await turso.execute("SELECT COALESCE(SiswaID, siswaid) as sID, COALESCE(Status, status) as sts, COUNT(*) as Jml FROM Attendance GROUP BY COALESCE(SiswaID, siswaid), COALESCE(Status, status)");

        return NextResponse.json({ status: 'success', data: { users: users.rows, results: results.rows, absen: absen.rows } });
    }

    // ==========================================
    // 5. MANAJEMEN MATERI & UJIAN
    // ==========================================
    if (action === 'adminSaveMaterial') {
      const d = args[0]; const id = d.matId || ('MAT' + Date.now()); const dateNow = new Date().toISOString().split('T')[0];
      const cek = await turso.execute({ sql: "SELECT MatID FROM Materials WHERE MatID = ? OR matid = ?", args: [id, id] });
      if (cek.rows.length > 0) { await turso.execute({ sql: "UPDATE Materials SET Judul=?, Mapel=?, TargetKelas=?, Tipe=?, Konten=? WHERE MatID=? OR matid=?", args: [d.judul, d.mapel, d.kelas, d.tipe, d.konten, id, id] }); } 
      else { await turso.execute({ sql: "INSERT INTO Materials (MatID, Mapel, TargetKelas, Judul, Tipe, Konten, Tanggal, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.mapel, d.kelas, d.judul, d.tipe, d.konten, dateNow, d.userId] }); }
      return NextResponse.json({ status: 'success', msg: 'Materi berhasil disimpan!' });
    }

    if (action === 'adminDeleteMaterial') {
      await turso.execute({ sql: "DELETE FROM Materials WHERE MatID = ? OR matid = ?", args: [args[0], args[0]] });
      return NextResponse.json({ status: 'success', msg: 'Materi dihapus!' });
    }

    if (action === 'adminSaveNotif') {
      const id = 'NOTIF' + Date.now();
      await turso.execute({ sql: "INSERT INTO Notifications (NotifID, Pesan, Tanggal, PembuatID) VALUES (?, ?, ?, ?)", args: [id, args[0], new Date().toISOString().split('T')[0], args[1]] });
      return NextResponse.json({ status: 'success' });
    }

    if (action === 'adminSaveExam') {
      const d = args[0]; 
      // JIKA EDIT, PASTIKAN MENGGUNAKAN ID LAMA. JIKA BARU, BUAT ID BARU.
      const id = (d.examId && d.examId.trim() !== '') ? d.examId : ('EX' + Date.now());
      const cek = await turso.execute({ sql: "SELECT * FROM Exams WHERE ExamID = ? OR examid = ?", args: [id, id] });
      if (cek.rows.length > 0) {
        await turso.execute({ sql: "UPDATE Exams SET Judul=?, Mapel=?, TargetKelas=?, Durasi=?, Token=?, StartDate=?, EndDate=?, LimitTries=?, ShowStats=?, RandomQ=?, AllowDownloadQ=?, AllowDownloadR=? WHERE ExamID=? OR examid=?", args: [d.judul, d.mapel, d.targetKelas, d.durasi, d.token || '', d.start, d.end, d.limit || 1, d.showStats, d.randomQ, d.dlSoal, d.dlHasil, id, id] });
      } else {
        await turso.execute({ sql: "INSERT INTO Exams (ExamID, Judul, Mapel, TargetKelas, Durasi, Token, StartDate, EndDate, LimitTries, ShowStats, RandomQ, AllowDownloadQ, AllowDownloadR, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.judul, d.mapel, d.targetKelas, d.durasi, d.token || '', d.start, d.end, d.limit || 1, d.showStats, d.randomQ, d.dlSoal, d.dlHasil, d.userId] });
      }
      return NextResponse.json({ status: 'success', msg: 'Jadwal Ujian berhasil disimpan!' });
    }

    if (action === 'adminDeleteExam') {
      await turso.execute({ sql: "DELETE FROM Exams WHERE ExamID = ? OR examid = ?", args: [args[0], args[0]] });
      return NextResponse.json({ status: 'success', msg: 'Jadwal dihapus!' });
    }

    if (action === 'getExamQuestions' || action === 'getSiswaSoal') {
      const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID = ? OR examid = ?", args: [args[0], args[0]] });
      if (action === 'getSiswaSoal') return NextResponse.json({ status: 'success', data: qs.rows });
      return NextResponse.json(qs.rows);
    }

    if (action === 'adminSaveSingleQuestion') {
      const eid = args[0]; const d = args[1]; const userId = args[2]; const id = d.id || ('Q' + Date.now());
      const cek = await turso.execute({ sql: "SELECT QID FROM Questions WHERE QID = ? OR qid = ?", args: [id, id] });
      if (cek.rows.length > 0) {
        await turso.execute({ sql: "UPDATE Questions SET Tipe=?, Pertanyaan=?, Options=?, Key=?, Skor=?, Nomor=? WHERE QID=? OR qid=?", args: [d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, id, id] });
      } else {
        await turso.execute({ sql: "INSERT INTO Questions (QID, ExamID, Tipe, Pertanyaan, Options, Key, Skor, Nomor, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, eid, d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, userId] });
      }
      return NextResponse.json({ status: 'success', id: id, msg: 'Soal tersimpan!' });
    }

    if (action === 'adminDeleteQuestion') {
      await turso.execute({ sql: "DELETE FROM Questions WHERE QID = ? OR qid = ?", args: [args[0], args[0]] });
      return NextResponse.json({ status: 'success' });
    }
if (action === 'adminUpdateResultScore') {
       await turso.execute({ sql: "UPDATE Results SET TotalNilai = ? WHERE ResultID = ? OR resultid = ?", args: [args[1], args[0], args[0]] });
       return NextResponse.json({ status: 'success', msg: 'Nilai berhasil diedit!' });
    }
    // ==========================================
    // 6. EKSEKUSI CBT & REKAP HASIL
    // ==========================================
    if (action === 'getExamPack') {
      const eid = args[0]; const uid = args[1];
      const history = await turso.execute({ sql: "SELECT * FROM Results WHERE (ExamID=? OR examid=?) AND (SiswaID=? OR siswaid=?)", args: [eid, eid, uid, uid]});
      if(history.rows.length > 0) return NextResponse.json({status: 'error', msg: 'Ujian sudah dikerjakan.'});
      const examInfo = await turso.execute({ sql: "SELECT * FROM Exams WHERE ExamID=? OR examid=?", args:[eid, eid] });
      const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID=? OR examid=?", args:[eid, eid] });
      const cleanQ = qs.rows.map(q => ({ QID: q.QID||q.qid, Tipe: q.Tipe||q.tipe, Pertanyaan: q.Pertanyaan||q.pertanyaan, Options: q.Options||q.options, Nomor: q.Nomor||q.nomor, Extra: [] }));
      return NextResponse.json({ status: 'success', data: cleanQ, duration: examInfo.rows[0].Durasi||examInfo.rows[0].durasi, judul: examInfo.rows[0].Judul||examInfo.rows[0].judul, token: examInfo.rows[0].Token||examInfo.rows[0].token });
    }

    if (action === 'submitExam') {
       const uid = args[0]; const eid = args[1]; const answers = args[2]; const violations = args[3];
       let rawTotalScore = 0; let detailLog = []; let maxPossibleTotalScore = 0;
       const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID=? OR examid=?", args:[eid, eid] });
       
       qs.rows.forEach(q => { maxPossibleTotalScore += Number(q.Skor||q.skor) || 0; });
       answers.forEach(ans => {
          const q = qs.rows.find(x => (x.QID||x.qid) === ans.qid);
          if(q) {
             const keys = JSON.parse((q.Key||q.key) || "[]"); let scoreEarned = 0; const maxSkor = Number(q.Skor||q.skor) || 0;
             const type = q.Tipe || q.tipe;
             if (type === 'PGK') {
                 if (Array.isArray(ans.answer)) {
                     const correct_selected = ans.answer.filter(val => keys.includes(val)).length;
                     const wrong_selected = ans.answer.filter(val => !keys.includes(val)).length;
                     if (keys.length > 0) { let partial = (correct_selected - wrong_selected) / keys.length; if (partial < 0) partial = 0; scoreEarned = partial * maxSkor; }
                 }
             } else if (type === 'PGKK') {
                 if (Array.isArray(ans.answer)) {
                     let correct_match = 0; ans.answer.forEach((val, idx) => { if (val && val === keys[idx]) correct_match++; });
                     if (keys.length > 0) { scoreEarned = (correct_match / keys.length) * maxSkor; }
                 }
             } else if (type === 'PGS') { if (keys.includes(ans.answer)) scoreEarned = maxSkor; } 
             else { if (Array.isArray(ans.answer)) { if (JSON.stringify(ans.answer) === JSON.stringify(keys)) scoreEarned = maxSkor; } else { if (keys.includes(ans.answer)) scoreEarned = maxSkor; } }
             scoreEarned = Math.round(scoreEarned * 100) / 100; rawTotalScore += scoreEarned; detailLog.push({ i: q.Nomor||q.nomor, s: scoreEarned, m: maxSkor, t: type, a: ans.answer });
          }
       });
       let finalScore100 = maxPossibleTotalScore > 0 ? (rawTotalScore / maxPossibleTotalScore) * 100 : 0;
       finalScore100 = Math.round(finalScore100 * 100) / 100;

       await turso.execute({ sql: "INSERT INTO Results (ResultID, SiswaID, ExamID, TotalNilai, Detail, Pelanggaran) VALUES (?, ?, ?, ?, ?, ?)", args: ['RES' + Date.now(), uid, eid, finalScore100, JSON.stringify(detailLog), violations > 0 ? `Pelanggaran: ${violations}x` : "-"] });
       return NextResponse.json({ status: 'success', msg: 'Berhasil dikirim', data: { score: finalScore100 } });
    }

    if (action === 'getRecapList') {
      const [role, , sekolah] = args;
      let sql = `SELECT COALESCE(r.ResultID, r.resultid) as ResultID, COALESCE(r.TotalNilai, r.totalnilai) as TotalNilai, COALESCE(r.WaktuSubmit, r.waktusubmit) as WaktuSubmit, COALESCE(r.Detail, r.detail) as Detail, COALESCE(u.Nama, u.nama) as NamaSiswa, COALESCE(u.Kelas, u.kelas) as KelasSiswa, COALESCE(u.Sekolah, u.sekolah) as SekolahSiswa, COALESCE(e.Judul, e.judul) as JudulUjian, COALESCE(e.Mapel, e.mapel) as Mapel, COALESCE(e.ShowStats, e.showstats) as ShowStats FROM Results r LEFT JOIN Users u ON (r.SiswaID = u.ID OR r.siswaid = u.id) LEFT JOIN Exams e ON (r.ExamID = e.ExamID OR r.examid = e.examid) WHERE 1=1`;
      let pArgs = [];
      if (role === 'guru') { sql += ` AND LOWER(TRIM(COALESCE(u.Sekolah, u.sekolah))) = LOWER(TRIM(?))`; pArgs.push(sekolah); }
      const results = await turso.execute({ sql: sql, args: pArgs });
      return NextResponse.json({ status: 'success', data: results.rows });
    }

    if (action === 'adminDeleteResult') {
       await turso.execute({ sql: "DELETE FROM Results WHERE ResultID=? OR resultid=?", args: [args[0], args[0]] });
       return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'success', data: [] });
  } catch (error) { return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 }); }
}
