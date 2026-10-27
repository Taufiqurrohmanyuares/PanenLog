import type { AuthError } from "@supabase/supabase-js";

/** Pesan galat Supabase Auth dalam bahasa yang mudah dipahami. */
export function authMessage(e: AuthError | { code?: string; message: string }): string {
  switch (e.code) {
    case "invalid_credentials":
      return "Email atau kata sandi salah. Coba lagi.";
    case "email_not_confirmed":
      return "Email belum dikonfirmasi. Buka tautan di email dari PanenLog, lalu masuk.";
    case "user_already_exists":
    case "email_exists":
      return "Email itu sudah terdaftar. Coba masuk.";
    case "weak_password":
      return "Kata sandi terlalu lemah. Pakai minimal 6 karakter dan campur huruf dengan angka.";
    case "same_password":
      return "Kata sandi baru harus berbeda dari yang lama.";
    case "validation_failed":
    case "email_address_invalid":
      return "Alamat email tidak valid. Periksa lagi.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
    case "provider_disabled":
    case "oauth_provider_not_supported":
      return "Masuk dengan Google belum diaktifkan di server.";
    case "reauthentication_needed":
      return "Untuk keamanan, keluar lalu masuk lagi sebelum mengganti kata sandi.";
    default:
      return "Terjadi kendala: " + e.message;
  }
}
