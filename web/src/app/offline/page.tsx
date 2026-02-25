export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-4">
      <svg className="w-16 h-16 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M15.362 5.071A9 9 0 0121 12h-2.25A6.75 6.75 0 009.31 7.198M8.294 8.236A4.5 4.5 0 003 12h2.25a2.25 2.25 0 013.352-1.97M12 18.75l-3-3m0 0l-3-3m3 3h12" />
      </svg>
      <h1 className="text-xl font-bold text-text">Sem conexão</h1>
      <p className="text-text-secondary text-sm text-center">
        Você está offline. Verifique sua conexão e tente novamente.
      </p>
    </div>
  );
}
