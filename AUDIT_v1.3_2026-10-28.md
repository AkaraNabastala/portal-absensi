# AUDIT v1.3 — Portal Absensi

- Tanggal: 28 Oktober 2026
- Versi dokumen: v1.3
- Branch: main
- Commit terakhir: 0ce85a1 Fix teacher biodata and academic menus

> Dokumen ini merangkum pekerjaan yang dilaporkan. Status keberhasilan perlu dibuktikan dengan pengujian aktual.

## 1. Ruang Lingkup
Build frontend, runtime server, autentikasi, otorisasi, biodata guru dan siswa, database, sinkronisasi dengan Nebula Presence, serta integritas repositori.

## 2. Perbaikan Biodata Guru
Dilaporkan bahwa frontend akun TEACHER diarahkan ke endpoint `/api/teacher/personal-details/:teacherId` untuk mengatasi permintaan endpoint biodata siswa yang menghasilkan HTTP 403.

Verifikasi: guru hanya dapat mengakses data yang diizinkan; backend memeriksa identitas dan peran; akses siswa tetap dibatasi.

## 3. Build dan Runtime
Build frontend dilaporkan berhasil menggunakan Node.js 24 melalui NVM, dengan waktu sekitar 1,28 detik. Skrip `start_server.sh` juga dilaporkan dibuat.

Verifikasi: ulangi build dari kode terkini, periksa exit code, runtime backend, log startup, port, dan respons HTTP.

## 4. Database dan Sinkronisasi
Pemeriksaan tabel guru, anggota, dan database Portal dilaporkan telah dilakukan. Pastikan database yang diperiksa adalah database aktif, relasi guru/kelas/mata pelajaran valid, data tetap utuh, dan sinkronisasi ulang tidak membuat duplikasi.

## 5. Aktivitas yang Dilaporkan
- Pemeriksaan lokasi repositori, isi direktori, status Git, dan commit.
- Pemeriksaan endpoint biodata dan kode frontend `App.jsx`.
- Pemeriksaan `canAccessDivision`, skema tabel guru dan anggota.
- Pemeriksaan database dan riwayat perubahan frontend.
- Build frontend dengan Node.js 24.
- Pembuatan `start_server.sh` dan smoke test server.

Perintah yang gagal atau dihentikan tidak boleh dianggap lulus tanpa pengujian pengganti yang berhasil.

## 6. Keamanan
Jangan memasukkan nilai rahasia `.env` ke laporan. Pastikan `.env` dan database tidak ikut di-commit. Rotasi rahasia yang pernah terekspos dan uji otorisasi endpoint biodata pada backend.

## 7. Kriteria Audit Selesai
1. Build terbaru berhasil.
2. Server berjalan dengan runtime yang sesuai.
3. Endpoint biodata guru dan siswa lolos uji otorisasi.
4. Data anggota, kelas, dan jadwal konsisten.
5. Sinkronisasi sesuai dengan Nebula Presence.
6. Database dan backup diperiksa.
7. Pengujian gagal/dihentikan telah dianalisis.
8. Tidak ada rahasia atau database sensitif terunggah.

## 8. Kesimpulan
Ini adalah catatan audit v1.3, bukan bukti bahwa semua masalah telah selesai. Status akhir harus didasarkan pada log pengujian terbaru, pemeriksaan database, dan pengujian akses.

---
Akhir dokumen — AUDIT v1.3 Portal Absensi
