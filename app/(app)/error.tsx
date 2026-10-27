"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <div className="sheet" style={{ marginTop: 0, borderRadius: 0 }}>
        <div className="card1">
          <h2>Catatan belum bisa dimuat</h2>
          <p className="sub">Periksa sambungan internet, lalu coba lagi. Catatan Anda aman di server.</p>
          <p className="sub" style={{ opacity: 0.7 }}>
            {error.message}
          </p>
          <button type="button" className="bt p" onClick={reset}>
            Coba lagi
          </button>
        </div>
      </div>
    </div>
  );
}
