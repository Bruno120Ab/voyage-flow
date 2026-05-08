export const renderClientName = (name: string) => {
  const upperName = name.toUpperCase();

  const isCliente = upperName.includes("PS");
  const isAgencia = upperName.includes("NH - GUICHE");

  return (
    <div className="flex items-center gap-2 min-w-0">
      <p
        className={`text-sm leading-tight truncate font-medium ${
          isCliente
            ? "text-emerald-600"
            : isAgencia
            ? "text-sky-600"
            : "text-foreground"
        }`}
      >
        {name}
      </p>

      <div className="flex items-center gap-1 shrink-0">
        {isCliente && (
          <span className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Cliente
          </span>
        )}

        {isAgencia && (
          <span className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20">
            Agência
          </span>
        )}

        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          Zap
        </span>
      </div>
    </div>
  );
};