import { useState } from 'react';
import Aviso from '../../components/ui/Aviso.jsx';
import { BotonTexto, Estado, Etiqueta, Panel, useAccion, useCarga } from '../../components/admin/ui.jsx';
import { IMAGENES_SITIO } from '../../data/contenido.js';
import { pesoTexto } from '../../lib/imagen.js';
import { leerImagenesSitio, restaurarImagenSitio, subirImagenSitio } from '../../services/admin.js';

/** Fotos del sitio que la administradora puede cambiar. Se convierten a WebP al subirlas. */
export default function AdminImagenes() {
  const { datos, error, cargando } = useCarga(leerImagenesSitio);
  return (
    <Estado cargando={cargando} error={error}>
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
        {IMAGENES_SITIO.map((imagen) => (
          <TarjetaImagen key={imagen.clave} imagen={imagen} inicial={datos?.[imagen.campo] ?? null} />
        ))}
      </div>
    </Estado>
  );
}

function TarjetaImagen({ imagen, inicial }) {
  const [url, setUrl] = useState(inicial);
  const [listo, setListo] = useState('');
  const { ocupado, error, accion } = useAccion();

  return (
    <Panel titulo={imagen.titulo} acciones={url ? <Etiqueta tono="info">Personalizada</Etiqueta> : <Etiqueta>Original</Etiqueta>}>
      <p className="text-[15px] text-ink-muted">{imagen.donde}</p>
      <div className="flex justify-center rounded-bloque bg-lila-suave p-5">
        <img
          src={url || imagen.original}
          alt={`${imagen.titulo} actual`}
          className={`w-full max-w-[240px] border-[8px] border-menta bg-lavanda object-cover object-[50%_35%] ${imagen.forma}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink px-4 text-[15px] font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2">
          {ocupado ? 'Procesando…' : 'Subir otra foto'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={ocupado}
            onChange={async (e) => {
              const archivo = e.target.files?.[0];
              e.target.value = '';
              if (!archivo) return;
              setListo('');
              await accion(async () => {
                const subida = await subirImagenSitio(imagen, archivo, url);
                setUrl(subida.url);
                setListo(`Listo: ya se ve en el sitio. Pesa ${pesoTexto(subida.bytes)} (la original pesaba ${pesoTexto(archivo.size)}).`);
              });
            }}
          />
        </label>
        {url && (
          <BotonTexto
            disabled={ocupado}
            onClick={() =>
              accion(async () => {
                await restaurarImagenSitio(imagen, url);
                setUrl(null);
                setListo('Listo: volvió la foto original.');
              })
            }
          >
            Volver a la original
          </BotonTexto>
        )}
      </div>
      <p className="text-sm text-ink-muted">Cualquier foto del celular o la compu. Se achica y se guarda en WebP para que la página cargue rápido.</p>
      {listo && <Aviso tono="ok">{listo}</Aviso>}
      {error && <Aviso tono="error">{error}</Aviso>}
    </Panel>
  );
}
