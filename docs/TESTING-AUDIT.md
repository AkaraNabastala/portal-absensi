# Panduan Uji Coba Portal Absensi (Branch Audit)

> Gunakan salinan portal dan database uji. Jangan menjalankan tes pertama pada portal produksi atau database sekolah aktif.

## 1. Ambil branch perbaikan

Di Windows dengan Git dan Node.js:

```powershell
git clone https://github.com/AkaraNabastala/portal-absensi.git
cd portal-absensi
git fetch origin
git checkout audit-and-fixes-2026-10
```

Jika repositori sudah ada:
```powershell
git fetch origin
git checkout audit-and-fixes-2026-10
git pull
```

## 2. Siapkan environment uji

1. Buat cadangan folder database portal dan simpan di luar folder kerja.
2. Gunakan file `.env` lokal yang hanya berisi konfigurasi untuk lingkungan uji. Jangan commit file ini.
3. Gunakan data siswa/guru fiktif atau data yang sudah dianonimkan.
4. Jangan arahkan konfigurasi sync ke Nebula Presence atau portal produksi saat tes pertama.

## 3. Pasang dependensi dan periksa build

```powershell
npm install
npm run build
npm run lint
```

Jika lint gagal, simpan keluaran error untuk ditinjau; jangan mengabaikan error hanya karena build berhasil.

## 4. Jalankan portal uji

```powershell
npm run server
```

Buka alamat lokal yang ditampilkan oleh server (default port pada konfigurasi saat ini adalah 5000). Jika portal memerlukan konfigurasi khusus atau database awal, siapkan itu sebelum uji manual.

## 5. Uji hak akses guru dan orang tua

Gunakan akun uji yang telah disiapkan:

1. Tanpa login, coba buka endpoint daftar siswa kelas dan rekap absensi kelas. Permintaan harus ditolak dengan HTTP 401.
2. Login sebagai guru kelas A. Akses data kelas A harus berhasil.
3. Dengan sesi guru kelas A, coba mengakses kelas B. Permintaan harus ditolak dengan HTTP 403.
4. Coba melihat atau menyetujui permohonan izin dari kelas B. Permintaan harus ditolak.
5. Login sebagai orang tua/siswa uji. Coba akses data milik akun uji sendiri, lalu coba ID siswa uji lain. Akses ke siswa lain harus ditolak.
6. Pastikan akun admin tetap dapat mengakses fungsi administrasi yang memang menjadi haknya.

Jangan menguji dengan kata sandi default pada portal publik. Perbaikan untuk kredensial bawaan dan mekanisme onboarding masih memerlukan penanganan terpisah.

## 6. Catat hasil

Untuk setiap kasus, catat endpoint, role yang digunakan, kode HTTP, hasil yang diharapkan, hasil aktual, dan log yang relevan. Jangan membagikan cookie sesi, bearer token, PIN, kata sandi, atau data pribadi siswa.

**Penting:** Perubahan branch audit belum dinyatakan lulus pengujian runtime/integrasi. Tinjau hasil tes sebelum merge atau penerapan.
