/**
 * Helper API fetch client yang otomatis menyisipkan Bearer token autentikasi
 */
export async function authFetch(url, options = {}) {
    const token = localStorage.getItem('nebula_portal_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        // Sesi kedaluwarsa, hapus sesi lokal jika tidak berada di halaman login
        if (window.location.pathname !== '/login') {
            localStorage.removeItem('nebula_portal_token');
            localStorage.removeItem('nebula_presence_user');
            window.location.href = '/login';
        }
    }

    return response;
}
