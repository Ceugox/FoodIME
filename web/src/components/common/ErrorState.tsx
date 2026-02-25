interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Algo deu errado', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-scale-in">
      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center shadow-warm">
        <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L3.072 16.5C2.302 18.333 3.264 19 4.804 19z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-text-secondary font-medium">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light shadow-warm hover:shadow-glow transition-all"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
