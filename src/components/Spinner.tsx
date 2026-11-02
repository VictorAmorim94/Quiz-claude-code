export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
