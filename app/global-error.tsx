"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uz">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Xatolik yuz berdi</h1>
          <p style={{ color: "#6b7280", marginBottom: 16 }}>Tizimda kutilmagan xatolik. Iltimos, qayta urinib ko&apos;ring.</p>
          <button
            onClick={() => reset()}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#111827", color: "white", cursor: "pointer" }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
