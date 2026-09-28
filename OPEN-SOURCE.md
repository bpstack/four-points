# Hacer público el repositorio four-points

Vamos a preparar el repositorio four-points, hoy privado, para publicarlo. El trabajo tiene tres partes, que abordaremos en orden: primero la documentación, después la limpieza del historial de Git y, por último, la organización de las tareas pendientes.

---

## 1. Nueva documentación

Antes de escribir nada, mueve toda la documentación actual del proyecto a `_archive/`. Ese será nuestro material de consulta: lo iremos leyendo poco a poco para redactar la nueva documentación en `docs/`.

> **IMPORTANTE:** la nueva documentación se escribe a partir de dos fuentes, siempre combinadas: la documentación antigua de `_archive/` y una lectura detallada del código de cada módulo. La documentación antigua puede estar incompleta o desactualizada, así que el código es la referencia final. No documentes nada que no hayas comprobado en el código

La nueva documentación se organiza por módulos. Habrá un módulo **general**, con todo lo que afecta al proyecto en su conjunto, y un módulo por cada área funcional: `logbooks`, `parking`, `maintenance`, `groups`, `schedule`, etc. En `docs/` irá también `GITCLEAN.md`, que se describe en la sección 2.

El criterio es siempre la simplicidad: cada documento debe ser breve y claro, pero sin omitir nada que sea fundamental para entender el módulo.

### Qué debe explicar cada módulo

**El problema que resuelve y cómo lo resuelve**, junto con sus funcionalidades principales. Dos ejemplos:

- El **libro de consigna** evita que se pierda información y que falle la comunicación en el día a día. Permite registrar mensajes por hora y por usuario, saber si se han leído, asignarles un nivel de importancia y consultarlos en un calendario, entre otras cosas.
- El **horario de trabajadores** reduce el tiempo que se tarda en crear los turnos del personal gracias a un sistema matemático lo más determinista posible. Aquí hay que recoger todos los beneficios que eso aporta, contrastándolos con el código.

**Cómo funciona por dentro**: qué herramientas utiliza y cómo trabajan su backend y su frontend. Para ello nos guiaremos por estas preguntas:

1. ¿Qué problema resuelve?
2. ¿Quién lo utiliza?
3. ¿Qué puede hacer?
4. ¿Qué datos maneja?
5. ¿Qué reglas debe cumplir?
6. ¿Cómo viaja la información por el sistema?

Las respuestas de cada módulo se definirán después de leer con detalle su código y contrastarlo con la documentación antigua.

---

## 2. Limpieza del historial de Git (GITCLEAN.md)

Algunos archivos y directorios contienen información privada de la empresa que no puede aparecer, bajo ninguna circunstancia, en el repositorio público. Como es posible que se incluyeran en commits antiguos, no basta con añadirlos a `.gitignore`: hay que eliminarlos de todo el historial que vaya a publicarse. `docs/GITCLEAN.md` recogerá las pautas para hacerlo.

### Objetivo

Reescribir el historial de forma controlada para que los archivos y directorios privados desaparezcan de todos los commits, ramas y tags que se publiquen, conservando intacto todo lo demás.

### Reglas

- Solo se eliminan los archivos identificados explícitamente como privados. Nada más se modifica ni se borra.
- El contenido del proyecto no se altera más allá de lo imprescindible.
- No se pierde ningún commit, rama, tag ni parte del historial que deba conservarse.
- Los archivos privados deben desaparecer del historial completo, no solo del estado actual.
- Los paths privados se añaden a `.gitignore` para que no vuelvan a colarse por accidente.
- Antes de tocar nada, se crea o se verifica una copia de seguridad del repositorio original.
- La reescritura se hace con una herramienta pensada para ello, como `git-filter-repo`, y no modificando commits a mano.
- No se hace `push --force` ni se publica nada hasta haber verificado el resultado.

### Procedimiento

**1. Análisis.** Averigua qué ramas y tags existen, qué archivos o directorios privados aparecen en el historial, en qué commits lo hacen y si hay copias o rutas equivalentes que también deban eliminarse.

**2. Propuesta.** Explica con exactitud qué cambios vas a hacer y qué partes del historial se verán afectadas. No sigas adelante hasta que lo confirme.

**3. Limpieza.** Con el plan aprobado, reescribe el historial.

**4. Auditoría.** Verifica que:

- ningún path privado aparece en ningún commit;
- las ramas y los tags son los esperados;
- los archivos públicos siguen presentes;
- no hay modificaciones ajenas a la limpieza;
- el repositorio sigue funcionando;
- `.gitignore` impide que los archivos privados vuelvan a incorporarse.

Indica también qué hashes han cambiado a raíz de la reescritura.

El resultado debe quedar preparado y verificado en local. No hagas push al remoto: revisaremos la limpieza antes de hacer público el repositorio.

**La prioridad absoluta es eliminar por completo la información privada del historial sin romper ni alterar innecesariamente el resto del repositorio.**

---

## 3. Tareas pendientes

Quedan tareas sin terminar, como tests, en el módulo `schedule` y probablemente en otros. Todo ello se irá trasladando poco a poco a `docs/`, repartido en tres archivos escritos en español:

- `README.md`
- `ROADMAP.md`, a partir de la plantilla `c:\Users\dz\projects\harness\templates\ROADMAP.md`
- `TODO.md`, a partir de la plantilla `c:\Users\dz\projects\harness\templates\TODO.md`
