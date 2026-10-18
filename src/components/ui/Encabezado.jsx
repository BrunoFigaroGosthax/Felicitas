// Título de sección: eyebrow + h2 (+ bajada opcional).
export default function Encabezado({ eyebrow, titulo, bajada, as: Tag = 'h2', className = '' }) {
  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${className}`}>
      {eyebrow && <p className="eyebrow text-menta-deep">{eyebrow}</p>}
      <Tag className="text-[clamp(30px,3.6vw,44px)] leading-[1.08]">{titulo}</Tag>
      {bajada && <p className="text-lg text-ink-muted">{bajada}</p>}
    </div>
  );
}
