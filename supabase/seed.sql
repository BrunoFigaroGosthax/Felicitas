-- Datos de ejemplo para desarrollo (los mismos que src/data/cursos.js).
-- Precios y duraciones son placeholders: precio 1 = [PRECIO].
-- NO correr en producción.

insert into public.cursos (slug, titulo, resumen, formato, precio, portada_fondo, portada_ondas, destacado, publicado, orden) values
  ('fiebre-que-hago', 'Mi hijo tiene fiebre, ¿qué hago?', 'Cuándo preocuparse, cómo medirla y qué hacer en casa.', 'PDF', 0, 'amarillo',
    '[{"trazo":"a","color":"menta"},{"trazo":"d","color":"lavanda"}]', true, true, 1),
  ('guardia-o-consultorio', '¿Guardia o consultorio?', 'Señales para decidir a dónde ir sin perder tiempo.', 'Video', 0, 'menta',
    '[{"trazo":"b","color":"amarillo"}]', true, true, 2),
  ('adolescencia-estar-cerca', 'Adolescencia: estar cerca', 'Acompañar sin invadir, incluso cuando empiezan a alejarse.', 'Video + PDF', 1, 'lavanda',
    '[{"trazo":"c","color":"amarillo"}]', true, true, 3),
  ('primeros-meses', 'Los primeros meses en casa', 'Sueño, llanto, baño y controles del recién nacido.', 'Video + PDF', 1, 'amarillo',
    '[{"trazo":"b","color":"lavanda"}]', false, true, 4),
  ('botiquin-primeros-auxilios', 'Botiquín y primeros auxilios', 'Qué tener en casa y cómo actuar ante golpes y cortes.', 'PDF', 0, 'lavanda',
    '[{"trazo":"a","color":"menta"}]', false, true, 5),
  ('alimentacion-complementaria', 'Alimentación complementaria', 'Cómo y cuándo empezar con los primeros alimentos.', 'Video + PDF', 1, 'menta',
    '[{"trazo":"c","color":"lavanda"}]', false, true, 6);

insert into public.clases (curso_id, slug, titulo, tipo, orden, muestra)
select c.id, v.slug, v.titulo, v.tipo::public.tipo_clase, v.orden, v.muestra
from (values
  ('fiebre-que-hago', 'guia', 'Guía completa', 'pdf', 1, false),
  ('guardia-o-consultorio', 'video', '¿Guardia o consultorio?', 'video', 1, false),
  ('adolescencia-estar-cerca', 'bienvenida', 'Bienvenida', 'video', 1, true),
  ('adolescencia-estar-cerca', 'que-cambia', 'Qué cambia en la adolescencia', 'video', 2, false),
  ('adolescencia-estar-cerca', 'hablar', 'Cómo hablar sin invadir', 'video', 3, false),
  ('adolescencia-estar-cerca', 'rutinas', 'Sueño, pantallas y rutinas', 'video', 4, false),
  ('adolescencia-estar-cerca', 'consultar', 'Cuándo consultar', 'video', 5, false),
  ('adolescencia-estar-cerca', 'repaso', 'Material de repaso', 'pdf', 6, false),
  ('primeros-meses', 'bienvenida', 'Bienvenida', 'video', 1, true),
  ('primeros-meses', 'sueno', 'El sueño del bebé', 'video', 2, false),
  ('primeros-meses', 'llanto', 'Entender el llanto', 'video', 3, false),
  ('primeros-meses', 'material', 'Guía para la heladera', 'pdf', 4, false),
  ('botiquin-primeros-auxilios', 'guia', 'Guía completa', 'pdf', 1, false),
  ('alimentacion-complementaria', 'bienvenida', 'Bienvenida', 'video', 1, true),
  ('alimentacion-complementaria', 'cuando', 'Cuándo empezar', 'video', 2, false),
  ('alimentacion-complementaria', 'recetas', 'Primeras recetas', 'pdf', 3, false)
) as v (curso, slug, titulo, tipo, orden, muestra)
join public.cursos c on c.slug = v.curso;

-- Una fila de medios por clase, vacía hasta subir los archivos a Bunny.
insert into public.clases_medios (clase_id)
select id from public.clases;

-- Los cursos pagos dan certificado.
update public.cursos set otorga_certificado = true where precio > 0;

-- Cupones de prueba.
insert into public.cupones (codigo, descripcion, tipo, valor) values
  ('PRUEBA10', 'Desarrollo: 10 % en cualquier curso', 'porcentaje', 10),
  ('PRUEBA100', 'Desarrollo: curso sin cargo', 'porcentaje', 100);

-- Placeholders hasta tener los datos reales (no inventar).
insert into public.obras_sociales (nombre, orden) values
  ('[Obra social 1]', 1),
  ('[Obra social 2]', 2);

insert into public.testimonios (texto, autor, permiso_at, publicado, orden) values
  ('[Testimonio real de una familia, publicado con su permiso.]', '[Nombre], mamá de [nombre]', current_date, true, 1),
  ('[Testimonio real de una familia, publicado con su permiso.]', '[Nombre], papá de [nombre]', current_date, true, 2),
  ('[Testimonio real de una familia, publicado con su permiso.]', '[Nombre], mamá de [nombre]', current_date, true, 3);
