export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { turso } from '../../../lib/turso';

export async function POST(req) {
  try {
    const payload = await req.json();
    const { action, args, sekolah, role, userId } = payload;

    // --- SUPER ADMIN ---
    if (action === 'superAdminGetTenants') {
        const tenants = await turso.execute("SELECT * FROM Tenants ORDER BY NamaSekolah ASC");
        const usersCount = await turso.execute("SELECT Sekolah, sekolah, COUNT(ID) as JmlSiswa FROM Users WHERE Role='siswa' OR role='siswa' GROUP BY COALESCE(Sekolah, sekolah)");
        return NextResponse.json({ status: 'success', data: { tenants: tenants.rows, usage: usersCount.rows } });
    }

    if (action === 'superAdminUpgradeTenant') {
        const [tenantId, newPaket, newMaxSiswa] = args;
        await turso.execute({ sql: "UPDATE Tenants SET Paket = ?, MaxSiswa = ? WHERE TenantID = ? OR tenantid = ?", args: [newPaket, newMaxSiswa, tenantId, tenantId] });
        return NextResponse.json({ status: 'success', msg: 'Kapasitas Sekolah berhasil di-upgrade!' });
    }

    // --- EXPORT DATABASE ---
    if (action === 'exportDatabase') {
        const [targetSchools] = args; 
        let sqlFilter = ""; let filterArgs = [];

        if (role === 'admin') { sqlFilter = "WHERE Sekolah = ? OR sekolah = ?"; filterArgs = [sekolah, sekolah]; } 
        else if (role === 'superadmin') {
            if (targetSchools && targetSchools.length > 0) {
                const placeholders = targetSchools.map(() => '?').join(',');
                sqlFilter = `WHERE Sekolah IN (${placeholders}) OR sekolah IN (${placeholders})`; filterArgs = [...targetSchools, ...targetSchools];
            } else return NextResponse.json({ status: 'error', msg: 'Pilih minimal 1 sekolah.' });
        } else return NextResponse.json({ status: 'error', msg: 'Akses Ditolak.' });

        const usersData = await turso.execute({ sql: `SELECT * FROM Users ${sqlFilter}`, args: filterArgs });
        const examsData = await turso.execute({ sql: `SELECT * FROM Exams ${sqlFilter}`, args: filterArgs });
        const resultsData = await turso.execute({ sql: `SELECT r.ResultID, r.TotalNilai, r.WaktuSubmit, u.Nama, u.Kelas, u.Sekolah, e.Judul, e.Mapel FROM Results r JOIN Users u ON (r.SiswaID = u.ID OR r.siswaid = u.id) JOIN Exams e ON (r.ExamID = e.ExamID OR r.examid = e.examid) ${sqlFilter.replace(/Sekolah/g, 'u.Sekolah').replace(/sekolah/g, 'u.sekolah')}`, args: filterArgs });

        return NextResponse.json({ status: 'success', data: { users: usersData.rows, exams: examsData.rows, results: resultsData.rows } });
    }

    // --- MANAJEMEN USER & KUOTA ---
    const checkQuota = async (newSiswaCount, targetSekolah) => {
        const countRes = await turso.execute({ sql: "SELECT COUNT(*) as count FROM Users WHERE (Sekolah = ? OR sekolah = ?) AND (Role = 'siswa' OR role = 'siswa')", args: [targetSekolah, targetSekolah] });
        const tenantRes = await turso.execute({ sql: "SELECT MaxSiswa, maxsiswa FROM Tenants WHERE NamaSekolah = ? OR namasekolah = ?", args: [targetSekolah, targetSekolah] });
        if (tenantRes.rows.length === 0) return true; 
        const current = Number(countRes.rows[0].count || countRes.rows[0].COUNT || 0);
        const limit = Number(tenantRes.rows[0].MaxSiswa || tenantRes.rows[0].maxsiswa || 0);
        if (current + newSiswaCount > limit) throw new Error(`Kapasitas Penuh (Maks: ${limit} Siswa). Silakan hubungi pengembang untuk Upgrade Paket.`);
    };

    if (action === 'adminBatchSaveUsers') {
        const usersArr = args[0]; const siswaBaru = usersArr.filter(u => String(u.Role || 'siswa').toLowerCase() === 'siswa').length;
        await checkQuota(siswaBaru, sekolah); 
        for (let u of usersArr) {
            const id = 'U' + Date.now() + Math.floor(Math.random() * 10000);
            await turso.execute({ sql: `INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah, Kelas, TglLahir, NISN) VALUES (?,?,?,?,?,?,?,?,?)`, args: [id, u.Nama||'-', u.Username||('user'+id), u.Password||'123456', String(u.Role||'siswa').toLowerCase(), sekolah, u.Kelas||'-', u.TglLahir||'-', u.NISN||'-'] });
        }
        return NextResponse.json({ status: 'success', msg: `${usersArr.length} data berhasil diupload!` });
    }

    if (action === 'adminManageUser') {
      const mode = args[0]; const d = args[1] || {};
      if (mode === 'save') {
        const id = d.id || ('U' + Date.now()); const isSiswa = String(d.role||'siswa').toLowerCase() === 'siswa';
        if (!d.id && isSiswa) await checkQuota(1, sekolah);
        const cekUsername = await turso.execute({ sql: "SELECT ID FROM Users WHERE Username = ? AND ID != ? AND id != ?", args: [d.username, id, id] });
        if(cekUsername.rows.length > 0) return NextResponse.json({ status: 'error', msg: 'Username sudah digunakan oleh akun lain!' });
        const cek = await turso.execute({ sql: "SELECT ID FROM Users WHERE ID = ? OR id = ?", args: [id, id] });
        if (cek.rows.length > 0) await turso.execute({ sql: `UPDATE Users SET Nama=?, Username=?, Password=?, Role=?, Kelas=?, TglLahir=?, NISN=?, Foto=? WHERE ID=? OR id=?`, args: [d.nama, d.username, d.password, d.role, d.kelas, d.tglLahir, d.nisn, d.foto, id, id] });
        else await turso.execute({ sql: `INSERT INTO Users (ID, Nama, Username, Password, Role, Sekolah, Kelas, TglLahir, NISN, Foto) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: [id, d.nama, d.username, d.password, d.role, sekolah, d.kelas, d.tglLahir, d.nisn, d.foto] });
      } else if (mode === 'delete') await turso.execute({ sql: "DELETE FROM Users WHERE ID = ? OR id = ?", args: [d.id, d.id] });
      return NextResponse.json({ status: 'success', msg: 'Data User berhasil disimpan!' });
    }

    if (action === 'getUserList') {
      const users = await turso.execute({ sql: "SELECT * FROM Users WHERE Sekolah = ? OR sekolah = ?", args: [sekolah, sekolah] });
      return NextResponse.json({ status: 'success', data: users.rows });
    }

    // --- UBAH LOGO SEKOLAH ---
    if (action === 'updateTenantLogo') {
        const [newLogoUrl] = args;
        await turso.execute({ sql: "UPDATE Tenants SET Logo = ? WHERE NamaSekolah = ? OR namasekolah = ?", args: [newLogoUrl, sekolah, sekolah] });
        return NextResponse.json({ status: 'success' });
    }

    // --- DASHBOARD, NOTIF, MATERI ---
    if (action === 'getDashboardData') {
      let output = {};
      const notifs = await turso.execute({ sql: "SELECT * FROM Notifications WHERE Sekolah = ? OR sekolah = ? ORDER BY COALESCE(Tanggal, tanggal) DESC LIMIT 5", args: [sekolah, sekolah] });
      output.notifications = notifs.rows;

      if (role === 'admin' || role === 'guru') {
        const exams = await turso.execute({ sql: "SELECT * FROM Exams WHERE Sekolah = ? OR sekolah = ?", args: [sekolah, sekolah] });
        const materials = await turso.execute({ sql: "SELECT * FROM Materials WHERE Sekolah = ? OR sekolah = ?", args: [sekolah, sekolah] });
        const users = await turso.execute({ sql: "SELECT * FROM Users WHERE (Role = 'siswa' OR role = 'siswa') AND (Sekolah = ? OR sekolah = ?)", args: [sekolah, sekolah] });
        output.exams = exams.rows; output.materials = materials.rows;
        output.stats = { totalSiswa: users.rows.length, totalUjian: exams.rows.length, activeUjian: exams.rows.filter(e => (e.Status||e.status) === 'Aktif').length };
      } else if (role === 'siswa') {
        const exams = await turso.execute({ sql: "SELECT * FROM Exams WHERE (Sekolah = ? OR sekolah = ?) AND (Status = 'Aktif' OR status = 'Aktif')", args: [sekolah, sekolah] });
        output.availableExams = exams.rows;
        const history = await turso.execute({ sql: "SELECT r.*, e.Judul, e.judul, e.ShowStats, e.showstats FROM Results r JOIN Exams e ON (r.ExamID = e.ExamID OR r.examid = e.examid) WHERE r.SiswaID = ? OR r.siswaid = ?", args: [userId, userId] });
        output.history = history.rows;
      }
      return NextResponse.json({ status: 'success', data: output });
    }

    if (action === 'adminSaveMaterial') {
      const d = args[0]; const id = d.matId || ('MAT' + Date.now()); const dateNow = new Date().toISOString().split('T')[0];
      const cek = await turso.execute({ sql: "SELECT MatID FROM Materials WHERE MatID = ? OR matid = ?", args: [id, id] });
      if (cek.rows.length > 0) await turso.execute({ sql: "UPDATE Materials SET Judul=?, Mapel=?, TargetKelas=?, Tipe=?, Konten=? WHERE MatID=? OR matid=?", args: [d.judul, d.mapel, d.kelas, d.tipe, d.konten, id, id] });
      else await turso.execute({ sql: "INSERT INTO Materials (MatID, Mapel, TargetKelas, Judul, Tipe, Konten, Tanggal, PembuatID, Sekolah) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.mapel, d.kelas, d.judul, d.tipe, d.konten, dateNow, userId, sekolah] });
      return NextResponse.json({ status: 'success', msg: 'Materi berhasil disimpan!' });
    }
    if (action === 'adminDeleteMaterial') {
      await turso.execute({ sql: "DELETE FROM Materials WHERE MatID = ? OR matid = ?", args: [args[0], args[0]] });
      return NextResponse.json({ status: 'success', msg: 'Materi dihapus!' });
    }
    if (action === 'adminSaveNotif') {
      let finalPesan = args[0] + (args[2] ? '|||LAMPIRAN|||' + args[2] : '');
      await turso.execute({ sql: "INSERT INTO Notifications (NotifID, Pesan, Tanggal, PembuatID, Sekolah) VALUES (?, ?, ?, ?, ?)", args: ['NOTIF' + Date.now(), finalPesan, new Date().toISOString().split('T')[0], userId, sekolah] });
      return NextResponse.json({ status: 'success' });
    }
    if (action === 'adminDeleteNotif') {
      await turso.execute({ sql: "DELETE FROM Notifications WHERE NotifID = ? OR notifid = ?", args: [args[0], args[0]] });
      return NextResponse.json({ status: 'success' });
    }

    // --- UJIAN & CBT ---
    if (action === 'adminSaveExam') {
      const d = args[0]; const id = d.examId || ('EX' + Date.now());
      const cek = await turso.execute({ sql: "SELECT ExamID FROM Exams WHERE ExamID = ? OR examid = ?", args: [id, id] });
      if (cek.rows.length > 0) await turso.execute({ sql: "UPDATE Exams SET Judul=?, Mapel=?, TargetKelas=?, Durasi=?, StartDate=?, EndDate=?, ShowStats=? WHERE ExamID=? OR examid=?", args: [d.judul, d.mapel, d.targetKelas, d.durasi, d.start, d.end, d.showStats, id, id] });
      else await turso.execute({ sql: "INSERT INTO Exams (ExamID, Judul, Mapel, TargetKelas, Durasi, StartDate, EndDate, ShowStats, PembuatID, Sekolah) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, d.judul, d.mapel, d.targetKelas, d.durasi, d.start, d.end, d.showStats, userId, sekolah] });
      return NextResponse.json({ status: 'success', msg: 'Jadwal Ujian disimpan!' });
    }
    if (action === 'getExamQuestions' || action === 'getSiswaSoal') {
      const qs = await turso.execute({ sql: "SELECT * FROM Questions WHERE ExamID = ? OR examid = ?", args: [args[0], args[0]] });
      return NextResponse.json(action === 'getSiswaSoal' ? { status: 'success', data: qs.rows } : qs.rows);
    }
    if (action === 'adminSaveSingleQuestion') {
      const eid = args[0]; const d = args[1]; const id = d.id || ('Q' + Date.now());
      const cek = await turso.execute({ sql: "SELECT QID FROM Questions WHERE QID = ? OR qid = ?", args: [id, id] });
      if (cek.rows.length > 0) await turso.execute({ sql: "UPDATE Questions SET Tipe=?, Pertanyaan=?, Options=?, Key=?, Skor=?, Nomor=? WHERE QID=? OR qid=?", args: [d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, id, id] });
      else await turso.execute({ sql: "INSERT INTO Questions (QID, ExamID, Tipe, Pertanyaan, Options, Key, Skor, Nomor, PembuatID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, eid, d.type, d.text, JSON.stringify(d.options), JSON.stringify(d.key), d.score, d.num, userId] });
      return NextResponse.json({ status: 'success', id: id, msg: 'Soal tersimpan!' });
    }
    if (action === 'adminDeleteQuestion') {
      await turso.execute({ sql: "DELETE FROM Questions WHERE QID = ? OR qid = ?", args: [args[0], args[0]] });
      return NextResponse.json({ status: 'success' });
    }
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
             if (q.Tipe === 'PGS' && keys.includes(ans.answer)) scoreEarned = maxSkor;
             rawTotalScore += scoreEarned; detailLog.push({ i: q.Nomor||q.nomor, s: scoreEarned, m: maxSkor, t: q.Tipe, a: ans.answer });
          }
       });
       let finalScore100 = maxPossibleTotalScore > 0 ? (rawTotalScore / maxPossibleTotalScore) * 100 : 0;
       await turso.execute({ sql: "INSERT INTO Results (ResultID, SiswaID, ExamID, TotalNilai, Detail, Pelanggaran, WaktuSubmit, Sekolah) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: ['RES' + Date.now(), uid, eid, finalScore100, JSON.stringify(detailLog), violations > 0 ? `Pelanggaran: ${violations}x` : "-", new Date().toISOString(), sekolah] });
       return NextResponse.json({ status: 'success', msg: 'Berhasil dikirim' });
    }

    // --- REKAP, RAPORT & ABSEN ---
    if (action === 'getRecapList') {
      const results = await turso.execute({ sql: `SELECT r.*, u.Nama as NamaSiswa, u.Kelas as KelasSiswa, e.Judul as JudulUjian, e.Mapel, e.ShowStats FROM Results r JOIN Users u ON (r.SiswaID = u.ID OR r.siswaid = u.id) JOIN Exams e ON (r.ExamID = e.ExamID OR r.examid = e.examid) WHERE r.Sekolah = ? OR r.sekolah = ?`, args: [sekolah, sekolah] });
      return NextResponse.json({ status: 'success', data: results.rows });
    }
    if (action === 'adminDeleteResult') {
       await turso.execute({ sql: "DELETE FROM Results WHERE ResultID=? OR resultid=?", args: [args[0], args[0]] });
       return NextResponse.json({ status: 'success' });
    }
    if (action === 'getRaportData') {
        const users = await turso.execute({ sql: "SELECT * FROM Users WHERE (Role='siswa' OR role='siswa') AND (Sekolah = ? OR sekolah = ?)", args: [sekolah, sekolah] });
        const results = await turso.execute({sql: "SELECT COALESCE(r.SiswaID, r.siswaid) as sID, COALESCE(r.TotalNilai, r.totalnilai) as tNilai, COALESCE(e.Mapel, e.mapel) as tMapel, COALESCE(e.Judul, e.judul) as tJudul FROM Results r JOIN Exams e ON (r.ExamID = e.ExamID OR r.examid = e.examid) WHERE LOWER(COALESCE(e.Mapel, e.mapel)) != 'survey' AND (r.Sekolah = ? OR r.sekolah = ?)", args: [sekolah, sekolah]});
        const absen = await turso.execute({sql: "SELECT COALESCE(SiswaID, siswaid) as sID, COALESCE(Status, status) as sts, COUNT(*) as Jml FROM Attendance WHERE Sekolah = ? OR sekolah = ? GROUP BY COALESCE(SiswaID, siswaid), COALESCE(Status, status)", args: [sekolah, sekolah]});
        return NextResponse.json({ status: 'success', data: { users: users.rows, results: results.rows, absen: absen.rows } });
    }
    if (action === 'adminSaveAbsenBatch') {
        const [records] = args; 
        for(let r of records) await turso.execute({ sql: "INSERT INTO Attendance (AbsenID, SiswaID, Tanggal, Status, Sekolah) VALUES (?, ?, ?, ?, ?)", args: ['ABS' + Date.now() + Math.floor(Math.random() * 1000), r.uid, r.tgl, r.status, sekolah] });
        return NextResponse.json({ status: 'success', msg: 'Absensi berhasil disimpan!' });
    }
    if (action === 'adminUpdateAbsen') {
        await turso.execute({ sql: "UPDATE Attendance SET Status = ? WHERE AbsenID = ? OR absenid = ?", args: [args[1], args[0], args[0]] });
        return NextResponse.json({ status: 'success' });
    }
    if (action === 'getAbsenRekap') {
        const recap = await turso.execute({ sql: "SELECT a.AbsenID, a.absenid, a.Tanggal, a.tanggal, a.Status, a.status, u.Nama, u.nama, u.Kelas, u.kelas, u.Sekolah, u.sekolah, u.Role, u.role FROM Attendance a JOIN Users u ON (a.SiswaID = u.ID OR a.siswaid = u.id) WHERE u.Sekolah = ? OR u.sekolah = ? ORDER BY COALESCE(a.Tanggal, a.tanggal) DESC", args: [sekolah, sekolah] });
        return NextResponse.json({ status: 'success', data: recap.rows });
    }
    if (action === 'getSiswaAbsen') {
        const history = await turso.execute({ sql: "SELECT * FROM Attendance WHERE SiswaID = ? OR siswaid = ? ORDER BY COALESCE(Tanggal, tanggal) DESC", args: [userId, userId] });
        return NextResponse.json({ status: 'success', data: history.rows });
    }
    if (action === 'submitAbsen') {
      await turso.execute({ sql: "INSERT INTO Attendance (AbsenID, SiswaID, Tanggal, Status, Sekolah) VALUES (?, ?, ?, 'Hadir', ?)", args: ['ABS' + Date.now(), userId, new Date().toISOString().split('T')[0], sekolah] });
      return NextResponse.json({ status: 'success', msg: 'Berhasil melakukan absensi hari ini!' });
    }

    return NextResponse.json({ status: 'success', data: [] });
  } catch (error) { return NextResponse.json({ status: 'error', msg: error.message }, { status: 500 }); }
}
