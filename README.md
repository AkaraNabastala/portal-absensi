# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Konfigurasi deployment dan keamanan

- Atur `PORTAL_ALLOWED_ORIGINS` sebagai daftar origin frontend yang benar-benar digunakan, dipisahkan koma, misalnya `https://portal.example.id`. Jangan menggunakan wildcard untuk deployment produksi.
- Pada mode pengembangan, origin localhost diizinkan. Pada mode produksi, hanya origin yang terdaftar yang diizinkan. Permintaan server-ke-server tanpa header `Origin` tetap dapat digunakan untuk sinkronisasi.
- Akun siswa/wali hanya dapat login menggunakan PIN yang cocok dengan hash tersimpan. PIN bawaan `123456` dan `1234` tidak lagi diterima.
- Endpoint riwayat presensi siswa memeriksa hak akses berdasarkan role, identitas siswa, dan kelas yang menjadi kewenangan guru.

Setelah mengubah konfigurasi, jalankan build dan pengujian integrasi autentikasi serta sinkronisasi sebelum deployment.
