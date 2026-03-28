'use client';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-background">
      <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mb-4 border border-border">
        <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728m12.728 0L5.636 18.364" />
        </svg>
      </div>
      <h1 className="text-xl font-serif text-text mb-2">Sem conexão</h1>
      <p className="text-text-muted text-sm mb-6">Verifique sua conexão com a internet e tente novamente.</p>
      <button
        onClick={() => window.location.reload()}
        className="h-11 px-8 bg-primary text-white rounded-xl font-semibold text-sm"
      >
        Tentar novamente
      </button>
    </div>
  );
}
