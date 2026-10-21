// Agenda en uso: DrApp (principal, real o de ejemplo) + los demás sistemas que estén configurados.
import { configurado } from '../config.js';
import { admin } from '../supabase.js';
import { crearDrapp } from './drapp.js';
import { crearAgenda } from './nucleo.js';
import { crearOtroSistema } from './otro.js';
import { registroMemoria, registroSupabase } from './registro.js';

const sistemas = [crearDrapp(), crearOtroSistema()].filter((s) => s.principal || s.real);

export const agenda = crearAgenda({
  sistemas,
  registro: configurado.supabase ? registroSupabase(admin) : registroMemoria(),
});

export const sistemaPorId = (id) => sistemas.find((s) => s.id === id);
