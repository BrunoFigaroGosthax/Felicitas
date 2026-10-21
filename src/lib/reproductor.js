// Control del reproductor embebido de Bunny Stream con el protocolo Player.js (mensajes postMessage).
// Spec: https://github.com/embedly/player.js/blob/master/SPEC.rst
// Sin librerías: alcanza con suscribirse a eventos y mandar "setCurrentTime".
import { useEffect, useRef } from 'react';

const VERSION = '0.0.11';
export const EVENTOS = ['timeupdate', 'pause', 'ended'];

/** Arma el mensaje Player.js que se manda al iframe. */
export const mensaje = (method, value) => JSON.stringify({ context: 'player.js', version: VERSION, method, value, listener: `${method}-${value}` });

/** Lee un mensaje recibido del iframe; null si no es de Player.js. */
export function leerMensaje(data) {
  let d = data;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch {
      return null;
    }
  }
  return d && d.context === 'player.js' && d.event ? d : null;
}

/**
 * Conecta un <iframe> del reproductor: retoma en `inicio` (segundos) y avisa el avance.
 * Requiere que el reproductor de Bunny acepte Player.js (lo hace por defecto); se verifica al conectar Bunny.
 * on: { onTiempo(segundos, duracion), onPausa(), onFin() } — se pueden cambiar sin volver a conectar.
 */
export function useReproductor(iframeRef, src, inicio, on) {
  const callbacks = useRef(on);
  callbacks.current = on;
  // El minuto inicial se lee cuando el reproductor está listo (puede llegar después que el video).
  const inicioRef = useRef(inicio);
  inicioRef.current = inicio;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !src) return;
    const origen = new URL(src).origin;
    let retomado = false;

    const enviar = (method, value) => iframe.contentWindow?.postMessage(mensaje(method, value), origen);
    const suscribir = () => EVENTOS.forEach((ev) => enviar('addEventListener', ev));

    function alRecibir(e) {
      if (e.origin !== origen || e.source !== iframe.contentWindow) return;
      const d = leerMensaje(e.data);
      if (!d) return;
      if (d.event === 'ready') {
        suscribir();
        if (!retomado && inicioRef.current > 5) {
          enviar('setCurrentTime', inicioRef.current);
          retomado = true;
        }
      } else if (d.event === 'timeupdate' && d.value) {
        callbacks.current.onTiempo?.(Number(d.value.seconds) || 0, Number(d.value.duration) || 0);
      } else if (d.event === 'pause') {
        callbacks.current.onPausa?.();
      } else if (d.event === 'ended') {
        callbacks.current.onFin?.();
      }
    }

    window.addEventListener('message', alRecibir);
    iframe.addEventListener('load', suscribir);
    return () => {
      window.removeEventListener('message', alRecibir);
      iframe.removeEventListener('load', suscribir);
    };
  }, [iframeRef, src]);
}
