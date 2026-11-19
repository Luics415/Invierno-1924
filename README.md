# Un Asesinato en Navidad

**Un Asesinato en Navidad** es una experiencia web interactiva de misterio ambientada en Villa Acebo durante diciembre de 1924. El jugador abre un calendario criminal de 30 jornadas, resuelve pasatiempos y reúne pistas hasta deducir quién asesinó a Arturo Valdemar, con qué arma y en qué estancia.

Construido con React, TypeScript y Vite, el proyecto combina una interfaz narrativa al estilo de un expediente histórico con generación de casos, progresión por actos y una colección amplia de sospechosos.

## Características

- Calendario de Adviento con 30 días distribuidos en cinco actos.
- Diez tipos de pasatiempos: Sudoku, sopa de letras, Murdoku, palabras clave, criptograma, crucigrama, Futoshiki, Connections, Nonograma y Buscaminas.
- Generación reproducible de casos a partir de una semilla.
- Registro de pistas para sospechosos, armas y estancias.
- Álbum de sospechosos con datos, rasgos y categorías.
- Interfaz temática, efectos de sonido, recursos audiovisuales y eventos paranormales.
- Modo libre y progreso guardado en el navegador.

## Tecnologías

- React 19
- TypeScript
- Vite 8
- Zustand
- Tailwind CSS
- Lucide React
- Vitest
- Oxlint

## Requisitos

- Node.js y npm.
- Se recomienda una versión moderna de Node.js compatible con las dependencias de Vite 8.

## Instalación y ejecución

Desde la raíz del repositorio:

```bash
npm ci
npm run dev
```

Abre la URL que muestre Vite en la terminal, normalmente `http://localhost:5173`.

Para generar y previsualizar una compilación de producción:

```bash
npm run build
npm run preview
```

## Scripts disponibles

| Comando | Acción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo con recarga automática. |
| `npm run build` | Ejecuta la comprobación de TypeScript y crea la versión de producción. |
| `npm run preview` | Sirve localmente la compilación de producción. |
| `npm test` | Ejecuta las pruebas unitarias con Vitest. |
| `npm run lint` | Ejecuta Oxlint sobre el proyecto. |

## Cómo jugar

1. Abre el calendario desde el libro principal.
2. Avanza por los cinco actos y completa los pasatiempos de cada jornada.
3. Consulta el expediente y el álbum de sospechosos para relacionar las pistas.
4. Revisa las pistas acumuladas sobre sospechoso, arma y estancia.
5. Presenta el veredicto final cuando se hayan reducido todas las posibilidades.

El proyecto incluye progresión bloqueada por jornadas y también un modo de juego libre dentro de la propia aplicación.

## Estructura del repositorio

```text
.
├── public/                 Recursos estáticos y material audiovisual
│   ├── audio/              Efectos de sonido
│   └── portraits/          Retratos, fondos y elementos visuales
├── src/
│   ├── components/         Interfaz y componentes de pasatiempos
│   ├── data/               Relato, víctimas, armas y directorio de sospechosos
│   ├── engine/             Generación de casos, pistas y pasatiempos
│   ├── store/              Estado persistente de la partida
│   ├── utils/              Utilidades, incluido el audio
│   ├── App.tsx             Composición principal de la aplicación
│   └── main.tsx            Punto de entrada de React
├── tests/                  Pruebas del motor y los pasatiempos
├── e2e/                    Scripts y pruebas de extremo a extremo
├── index.html
└── package.json
```

## Desarrollo

La generación del caso vive en `src/engine/caseGenerator.ts`. Los datos narrativos y el universo del misterio están separados en `src/data/`, mientras que las reglas y algoritmos reutilizables se encuentran en `src/engine/`.

Las pruebas unitarias cubren, entre otros aspectos, la generación de casos, los acertijos y la coherencia del universo narrativo:

```bash
npm test
```

Para comprobar el estilo y posibles problemas estáticos:

```bash
npm run lint
```

## Contenido multimedia

La carpeta `public/portraits/` contiene los retratos y fondos visuales originales del juego. `public/audio/` incluye el efecto de cristal roto utilizado por la interfaz. Los archivos multimedia deberían mantenerse en estas rutas, ya que React los referencia mediante rutas públicas.

## Contribuir

1. Crea una rama desde `main`.
2. Instala las dependencias con `npm ci`.
3. Realiza cambios pequeños y verificables.
4. Ejecuta `npm test`, `npm run lint` y `npm run build`.
5. Abre un pull request con una descripción clara del resultado.
