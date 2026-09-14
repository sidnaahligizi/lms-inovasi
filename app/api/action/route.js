export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { turso } from '../../../lib/turso';

export async function POST(req) {
  try {
    const { action, args } = await req.json();

    // ==========================================
    // 1. FITUR LMS BARU (MATERI, NOTIF, ABSEN, RAPORT)
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

    if (action === 'getAbsenRekap') {
        const [role, sekolah] = args;
        let sql = "SELECT a.Tanggal, a.Status, u.Nama, u.Kelas, u.Sekolah FROM Attendance a JOIN Users u ON a.SiswaID = u.ID";
        let pArgs = [];
        if (role === 'guru') { 
            sql += " WHERE LOWER(TRIM(u.Sekolah)) = LOWER(TRIM(?))"; 
            pArgs.push(sekolah); 
        }
        sql += " ORDER BY a.Tanggal DESC";
        const recap = await turso.execute({ sql, args: pArgs });
        return NextResponse.json({ status: 'success', data: recap.rows });
    }

    if (action === 'getSiswaAbsen') {
        const history = await turso.execute({ sql: "SELECT * FROM Attendance WHERE SiswaID = ? ORDER BY Tanggal DESC", args: [args[0]] });
        return NextResponse.json({ status: 'success', data: history.rows });
    }

    if (action === 'getRaportData') {
        const [role, sekolah] = args;
        let sqlUsers = "SELECT ID, Nama, Kelas, Sekolah FROM Users WHERE Role='siswa'";
        let pArgs = [];
        if (role === 'guru') { 
            sqlUsers += " AND LOWER(TRIM(Sekolah)) = LOWER(TRIM(?))"; 
            pArgs.push(sekolah); 
        }
        const users = await turso.execute({ sql: sqlUsers, args: pArgs });
        const results = await turso.execute("SELECT r.SiswaID, r.TotalNilai, e.Mapel, e.Judul FROM Results r JOIN Exams e ON r.ExamID = e.ExamID WHERE e.Mapel != 'SURVEY'");
        const absen = await turso.execute("SELECT SiswaID, COUNT(*) as TotalHadir FROM Attendance GROUP BY SiswaID");

        return NextResponse.json({ status: 'success', data: { users: users.rows, results: results.rows, absen: absen.rows } });
    }

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

    if (action === 'adminSaveNotif') {
      const id = 'NOTIF' + Date.now();
      const dateNow = new Date().toISOString().split('T')[0];
      await turso.execute({ sql: "INSERT INTO Notifications (NotifID, Pesan, Tanggal, PembuatID) VALUES (?, ?, ?, ?)", args: [id, args[0], dateNow, args[1]] });
      return NextResponse.json({ status: 'success', msg: 'Notifikasi disiarkan!' });
    }

    if (action === 'submitAbsen') {
      const uid = args[0];
      const dateNow = new Date().toISOString().split('T')[0];
      await turso.execute({ sql: "INSERT INTO Attendance (AbsenID, SiswaID, Tanggal, Status) VALUES (?, ?, ?, 'Hadir')", args: ['ABS' + Date.now(), uid, dateNow] });
      return NextResponse.json({ status: 'success', msg: 'Berhasil melakukan absensi hari ini!' });
    }

    if (action === 'getDashboardData') {
      const [role, userId, , sekolah] = args; 
      let output = { logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq' };
      
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

    // ==========================================
    // 2. FITUR CBT LAMA (MANAJEMEN UJIAN & USER)
    // ==========================================
    if (action === 'getAdminData') {
      const [role, , , sekolah] = args;
      let exams, users;
      if (role === 'guru') {
        exams = await turso.execute("SELECT * FROM Exams");
        users = await turso.execute({ sql: "SELECT * FROM Users WHERE Role = 'siswa' AND LOWER(TRIM(Sekolah)) = LOWER(TRIM(?))", args: [sekolah] });
      } else {
        exams = await turso.execute("SELECT * FROM Exams");
        users = await turso.execute("SELECT * FROM Users WHERE Role = 'siswa'");
      }
      return NextResponse.json({ status: 'success', exams: exams.rows, users: users.rows, logo: 'https://lh3.googleusercontent.com/d/1SCvmdQxuqmX_f0gBaYt0Ob53Tws97Hnq' });
    }

    if (action === 'getUserList') {
      const [role, , sekolah] = args;
      let users;
      if (role === 'guru') users = await turso.execute({ sql: "SELECT * FROM Users WHERE Role = 'siswa' AND LOWER(TRIM(Sekolah)) = LOWER(TRIM(?))", args: [sekolah] });
      else users = await turso.execute("SELECT * FROM Users"); 
      return NextResponse.json({ status: 'success', data: users.rows });
    }

    if (action === 'adminManageUser') {
      const mode = args[0]; const d = args[1];
      if (mode === 'save') {
        const id = d.id || ('U' + Date.now());
        const cek = await turso.execute({ sql: "SELECT ID FROM Users WHERE ID = ?", args: [id] });
        if (cek.rows.length > 0) {
          await turso.execute({ sql: "UPDATE Users SET Nama=?, Username=?, Password=?, Role=?, Sekolah=?, Kelas=?, TglLahir=?, Foto=? WHERE ID=?", args: [d.nama, d.username, d.password, d.role, d.sekolah, d.kelas, d.tglLahir, d.foto, id] });
        } else {
          await turso.execute({ sql: "INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah, Kelas, TglLahir, Foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.nama, d.username, d.password, d.role, d.sekolah, d.kelas, d.tglLahir, d.foto] });
        }
      } else if (mode === 'delete') {
        await turso.execute({ sql: "DELETE FROM Users WHERE ID = ?", args: [d.id] });
      }
      return NextResponse.json({ status: 'success', msg: 'Data User berhasil disimpan!' });
    }

    if (action === 'adminSaveExam') {
      const d = args[0]; const id = d.examId || ('EX' + Date.now());
      const cek = await turso.execute({ sql: "SELECT ExamID FROM Exams WHERE ExamID = ?", args: [id] });
      if (cek.rows.length > 0) {
        await turso.execute({ sql: "UPDATE Exams SET Judul=?, Mapel=?, TargetKelas=?, Durasi=?, Token=?, StartDate=?, EndDate=?, LimitTries=?, ShowStats=?, RandomQ=?, AllowDownloadQ=?, AllowDownloadR=? WHERE ExamID=?", args: [d.judul, d.mapel, d.targetKelas, d.durasi, d.token || '', d.start, d.end, d.limit || 1, d.showStats, d.randomQ, d.dlSoal, d.dlHasil, id] });
      } else {
        await turso.execute({ sql: "INSERT INTO Exams (ExamID, Judul, Mapel, TargetKelas, Durasi, Token, StartDate, EndDate, LimitTries, ShowStats, RandomQ, AllowDownloadQ, AllowDownloadR, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.judul, d.mapel, d.targetKelas, d.durasi, d.token || '', d.start, d.end, d.limit || 1, d.showStats, d.randomQ, d.dlSoal, d.dlHasil, d.userId] });
      }
      return NextResponse.json({ status: 'success', msg: 'Jadwal Ujian berhasil dibuat!' });
    }

    if (action === 'adminDeleteExam') {
      await turso.execute({ sql: "DELETE FROM Exams WHERE ExamID = ?", args: [args[0]] });
      return NextResponse.json({ status: 'success', msg: 'Jadwal/Survey dihapus!' });
    }

    if (action === 'getExamQuestions' || action === 'getSiswaSoal') {
      const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID = ?", args: [args[0]] });
      if (action === 'getSiswaSoal') return NextResponse.json({ status: 'success', data: qs.rows });
      return NextResponse.json(qs.rows);
    }

    if (action === 'adminSaveSingleQuestion') {
      const eid = args[0]; const d = args[1]; const userId = args[2]; const id = d.id || ('Q' + Date.now());
      const cek = await turso.execute({ sql: "SELECT QID FROM Questions WHERE QID = ?", args: [id] });
      if (cek.rows.length > 0) {
        await turso.execute({ sql: "UPDATE Questions SET Tipe=?, Pertanyaan=?, Options=?, Key=?, Skor=?, Nomor=? WHERE QID=?", args: [d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, id] });
      } else {
        await turso.execute({ sql: "INSERT INTO Questions (QID, ExamID, Tipe, Pertanyaan, Options, Key, Skor, Nomor, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, eid, d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, userId] });
      }
      return NextResponse.json({ status: 'success', id: id, msg: 'Soal/Pernyataan tersimpan!' });
    }

    if (action === 'adminDeleteQuestion') {
      await turso.execute({ sql: "DELETE FROM Questions WHERE QID = ?", args: [args[0]] });
      return NextResponse.json({ status: 'success', msg: 'Soal dihapus!' });
    }

    if (action === 'adminBatchSaveQuestions') {
      const eid = args[0]; const qArr = args[1]; const userId = args[2];
      for(let q of qArr) {
         const id = 'Q' + Date.now() + Math.floor(Math.random()*1000);
         await turso.execute({ sql: "INSERT INTO Questions (QID, ExamID, Tipe, Pertanyaan, Options, Key, Skor, Nomor, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, eid, q.type, q.text, JSON.stringify(q.options), JSON.stringify(q.key), q.score, q.num, userId] });
      }
      return NextResponse.json({ status: 'success', msg: `${qArr.length} soal diupload!` });
    }

    if (action === 'adminSaveSurvey') {
      const d = args[0]; const id = d.id || ('SRV' + Date.now());
      const cek = await turso.execute({ sql: "SELECT ExamID FROM Exams WHERE ExamID = ?", args: [id] });
      if (cek.rows.length > 0) {
          await turso.execute({ sql: "UPDATE Exams SET Judul=?, TargetKelas=?, ShowStats=?, Token=? WHERE ExamID=?", args: [d.judul, d.desc, d.status, d.linkedExam, id] });
      } else {
          await turso.execute({ sql: "INSERT INTO Exams (ExamID, Judul, Mapel, TargetKelas, Durasi, Token, StartDate, EndDate, LimitTries, ShowStats, RandomQ, AllowDownloadQ, AllowDownloadR, PembuatID) VALUES (?, ?, 'SURVEY', ?, 0, ?, '', '', 1, ?, 'No', 'No', 'No', ?)", args: [id, d.judul, d.desc, d.linkedExam, d.status, d.userId] });
      }
      return NextResponse.json({ status: 'success', msg: 'Survey ditautkan & disimpan!' });
    }

    if (action === 'checkActiveSurvey') {
        const finishedExamId = args[0]; 
        const srv = await turso.execute({
            sql: "SELECT * FROM Exams WHERE Mapel='SURVEY' AND Token=? AND ShowStats='Aktif' LIMIT 1",
            args: [finishedExamId]
        });
        if(srv.rows.length > 0) {
            const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID = ?", args: [srv.rows[0].ExamID] });
            return NextResponse.json({ status: 'success', data: { header: srv.rows[0], qs: qs.rows } });
        }
        return NextResponse.json({ status: 'empty' });
    }

    if (action === 'submitSurveyResponse') {
        const uid = args[0]; const sid = args[1]; const answers = args[2];
        await turso.execute({ 
           sql: "INSERT INTO Results (ResultID, SiswaID, ExamID, TotalNilai, Detail, Pelanggaran) VALUES (?, ?, ?, 0, ?, 'Survey Response')", 
           args: ['SRES' + Date.now(), uid, sid, JSON.stringify(answers)] 
        });
        
        try { await turso.execute({ sql: "UPDATE Users SET Status='Survei Selesai', Terjawab=TotalSoal WHERE ID=?", args: [uid] }); } catch(e){}
        return NextResponse.json({ status: 'success', msg: 'Survey dikirim' });
    }

    if (action === 'getExamPack') {
      const eid = args[0]; const uid = args[1];
      const history = await turso.execute({ sql: "SELECT * FROM Results WHERE ExamID=? AND SiswaID=?", args: [eid, uid]});
      if(history.rows.length > 0) return NextResponse.json({status: 'error', msg: 'Ujian sudah dikerjakan.'});
      const examInfo = await turso.execute({ sql: "SELECT * FROM Exams WHERE ExamID=?", args:[eid] });
      const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID=?", args:[eid] });
      const cleanQ = qs.rows.map(q => ({ QID: q.QID, Tipe: q.Tipe, Pertanyaan: q.Pertanyaan, Options: q.Options, Nomor: q.Nomor, Extra: [] }));
      return NextResponse.json({ status: 'success', data: cleanQ, duration: examInfo.rows[0].Durasi, judul: examInfo.rows[0].Judul, token: examInfo.rows[0].Token });
    }

    if (action === 'submitExam') {
       const uid = args[0]; const eid = args[1]; const answers = args[2]; const violations = args[3];
       let rawTotalScore = 0; let detailLog = []; let maxPossibleTotalScore = 0;
       const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID=?", args:[eid] });
       
       qs.rows.forEach(q => { maxPossibleTotalScore += Number(q.Skor) || 0; });

       answers.forEach(ans => {
          const q = qs.rows.find(x => x.QID === ans.qid);
          if(q) {
             const keys = JSON.parse(q.Key || "[]"); let scoreEarned = 0; const maxSkor = Number(q.Skor) || 0;
             if (q.Tipe === 'PGK') {
                 if (Array.isArray(ans.answer)) {
                     const correct_selected = ans.answer.filter(val => keys.includes(val)).length;
                     const wrong_selected = ans.answer.filter(val => !keys.includes(val)).length;
                     if (keys.length > 0) { let partial = (correct_selected - wrong_selected) / keys.length; if (partial < 0) partial = 0; scoreEarned = partial * maxSkor; }
                 }
             } else if (q.Tipe === 'PGKK') {
                 if (Array.isArray(ans.answer)) {
                     let correct_match = 0;
                     ans.answer.forEach((val, idx) => { if (val && val === keys[idx]) correct_match++; });
                     if (keys.length > 0) { scoreEarned = (correct_match / keys.length) * maxSkor; }
                 }
             } else if (q.Tipe === 'PGS') {
                 if (keys.includes(ans.answer)) scoreEarned = maxSkor;
             } else {
                 if (Array.isArray(ans.answer)) { if (JSON.stringify(ans.answer) === JSON.stringify(keys)) scoreEarned = maxSkor; } 
                 else { if (keys.includes(ans.answer)) scoreEarned = maxSkor; }
             }
             
             scoreEarned = Math.round(scoreEarned * 100) / 100;
             rawTotalScore += scoreEarned;
             detailLog.push({ i: q.Nomor, s: scoreEarned, m: maxSkor, t: q.Tipe, a: ans.answer });
          }
       });

       let finalScore100 = maxPossibleTotalScore > 0 ? (rawTotalScore / maxPossibleTotalScore) * 100 : 0;
       finalScore100 = Math.round(finalScore100 * 100) / 100;

       await turso.execute({ 
           sql: "INSERT INTO Results (ResultID, SiswaID, ExamID, TotalNilai, Detail, Pelanggaran) VALUES (?, ?, ?, ?, ?, ?)", 
           args: ['RES' + Date.now(), uid, eid, finalScore100, JSON.stringify(detailLog), violations > 0 ? `Pelanggaran: ${violations}x` : "-"] 
       });
       
       try { await turso.execute({ sql: "UPDATE Users SET Status='Selesai Ujian TKA', Terjawab=0 WHERE ID=?", args: [uid] }); } catch(e){}
       return NextResponse.json({ status: 'success', msg: 'Berhasil dikirim', data: { score: finalScore100 } });
    }

    if (action === 'getRecapList') {
      const [role, , sekolah] = args;
      let sql = `
        SELECT r.ResultID, r.TotalNilai, r.WaktuSubmit, r.Detail, r.SiswaID, r.ExamID, r.Pelanggaran,
               u.Nama AS NamaSiswa, u.Kelas AS KelasSiswa, u.Sekolah AS SekolahSiswa,
               e.Judul AS JudulUjian, e.Mapel AS Mapel, e.PembuatID AS PembuatID, e.ShowStats AS ShowStats,
               (SELECT Nama FROM Users WHERE ID = e.PembuatID) AS PembuatNama
        FROM Results r LEFT JOIN Users u ON r.SiswaID = u.ID LEFT JOIN Exams e ON r.ExamID = e.ExamID WHERE 1=1
      `;
      let pArgs = [];
      if (role === 'guru') { sql += ` AND LOWER(TRIM(u.Sekolah)) = LOWER(TRIM(?))`; pArgs.push(sekolah); }
      const results = await turso.execute({ sql: sql, args: pArgs });
      return NextResponse.json({ status: 'success', data: results.rows });
    }

    if (action === 'getSiswaDetailHasil') {
      const rid = args[0];
      const results = await turso.execute({ sql: "SELECT r.TotalNilai, r.Detail, e.Judul, e.Mapel FROM Results r JOIN Exams e ON r.ExamID = e.ExamID WHERE r.ResultID = ?", args: [rid] });
      return NextResponse.json({ status: 'success', data: results.rows[0] });
    }

    if (action === 'adminUpdateResult') {
       await turso.execute({ sql: "UPDATE Results SET TotalNilai=?, Detail=? WHERE ResultID=?", args: [args[1], args[2], args[0]] });
       return NextResponse.json({ status: 'success', msg: 'Nilai dan Koreksi diperbarui.' });
    }
    
    if (action === 'adminDeleteResult') {
       await turso.execute({ sql: "DELETE FROM Results WHERE ResultID=?", args: [args[0]] });
       return NextResponse.json({ status: 'success', msg: 'Hasil Dihapus!' });
    }

    if (action === 'requestResetResult') {
       await turso.execute({ sql: "UPDATE Results SET Pelanggaran = 'Meminta Reset (Trobel)' WHERE ResultID=?", args: [args[0]] });
       return NextResponse.json({ status: 'success', msg: 'Berhasil dilaporkan' });
    }

    if (action === 'updateClientProgress') {
        const [examId, userId, terjawab, totalQ] = args;
        try { await turso.execute({ sql: "UPDATE Users SET Terjawab=?, TotalSoal=?, Status='Sedang Mengerjakan' WHERE ID=?", args: [terjawab, totalQ, userId] });
        } catch (e) { }
        return NextResponse.json({ status: 'success' });
    }

    if (action === 'getLiveMonitoring') {
       const [id, role, sekolah] = args;
       let sql = "SELECT * FROM Users WHERE Role='siswa'";
       let pArgs = [];
       if (role === 'guru') { sql += " AND LOWER(TRIM(Sekolah)) = LOWER(TRIM(?))"; pArgs.push(sekolah); }
       try {
           const users = await turso.execute({ sql: sql, args: pArgs });
           return NextResponse.json({ 
               status: 'success', 
               data: users.rows.map(u => ({ id: u.ID, nama: u.Nama || 'Tanpa Nama', kelas: u.Kelas || '-', terjawab: u.Terjawab != null ? u.Terjawab : 0, total: u.TotalSoal != null && u.TotalSoal > 0 ? u.TotalSoal : 10, status: u.Status || 'Offline' })) 
           });
       } catch (error) { return NextResponse.json({ status: 'success', data: [] }); }
    }

    if (action === 'sysResetCache' || action === 'autosaveAnswer') return NextResponse.json({ status: 'success' });
    
    return NextResponse.json({ status: 'success', data: [] });
  } catch (error) {
    return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 });
  }
}
