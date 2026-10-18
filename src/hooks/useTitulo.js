import { useEffect } from 'react';

const MARCA = 'Felicitas · Pediatría con propósito';

/** Título de la pestaña por página. Sin título, queda el de la marca. */
export default function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Felicitas` : MARCA;
  }, [titulo]);
}
