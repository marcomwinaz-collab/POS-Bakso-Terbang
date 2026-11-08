export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-16 pb-4 sm:px-6 lg:pt-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
