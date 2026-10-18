/** Tarjeta centrada para formularios cortos (ingresar, crear cuenta, contraseña). */
export default function PanelFormulario({ titulo, bajada, children }) {
  return (
    <div className="container-page flex justify-center py-10 sm:py-16 lg:pb-24">
      <div className="flex w-full max-w-[460px] flex-col gap-6 rounded-card border border-borde bg-card p-6 sm:p-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(30px,4vw,40px)] leading-tight">{titulo}</h1>
          {bajada && <p className="text-ink-muted">{bajada}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
