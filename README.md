# Un Asesinato en Navidad

[![Deploy GitHub Pages](https://github.com/Luics415/Invierno-1924/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Luics415/Invierno-1924/actions/workflows/deploy-pages.yml)

Experiencia web interactiva de investigación ambientada en Villa Acebo durante diciembre de 1924. El jugador dispone de 30 jornadas para resolver acertijos, recoger pistas forenses y determinar quién asesinó a Arturo Valdemar, con qué arma y en qué estancia.

**Demo publicada:** https://luics415.github.io/Invierno-1924/

## La experiencia

La historia sigue a Azlynn, una detective que debe reconstruir un crimen ocurrido durante un apagón en una mansión aislada por una tormenta. La partida combina progresión narrativa, lógica deductiva y pasatiempos que aparecen dentro de un calendario de cinco actos.

- 30 jornadas organizadas en cinco actos de seis días.
- Diez tipos de acertijos con múltiples apariciones a lo largo del calendario.
- 74 sospechosos definidos con atributos, profesión, motivos y coartadas.
- 18 armas inventariadas y 9 estancias posibles.
- Generación reproducible de casos a partir de una semilla.
- Pistas automáticas y eliminación manual de candidatos.
- Matriz de deducción, notas por jornada y veredicto final.
- Estado persistente en el navegador mediante Zustand.
- Modo de juego libre, interfaz temática y efectos audiovisuales.

## Mecánicas del juego

1. El jugador avanza por el calendario y completa el pasatiempo asignado a cada jornada.
2. Al superar una jornada, se desbloquea su pista forense y se actualiza el expediente.
3. Las pistas reducen las posibilidades en tres dimensiones: sospechoso, arma y estancia.
4. El expediente permite marcar descartes manuales, consultar el álbum y registrar notas.
5. La matriz deductiva muestra relaciones confirmadas o descartadas.
6. El veredicto final contrasta la selección del jugador con el culpable generado para la partida.

Los casos se construyen con datos deterministas. Una misma semilla genera el mismo caso, mientras que una semilla nueva produce una combinación distinta de culpable, arma y escenario.

## Acertijos incluidos

| Tipo | Funcionamiento |
| --- | --- |
| Sudoku 9 × 9 | Completar filas, columnas y bloques sin repetir números. |
| Sopa de letras | Buscar términos en horizontal, vertical y diagonal. |
| Murdoku | Resolver emparejamientos mediante una matriz lógica. |
| Palabras clave | Reconstruir términos a partir de sílabas. |
| Criptograma | Descifrar sustituciones numéricas consistentes. |
| Crucigrama | Completar definiciones y cruces forenses. |
| Futoshiki | Resolver cuadrículas con signos de desigualdad. |
| Connections | Agrupar elementos en cuatro categorías. |
| Nonograma | Revelar una silueta desde pistas por fila y columna. |
| Buscaminas | Identificar casillas seguras según las trampas vecinas. |

## Tecnología

- React 19
- TypeScript
- Vite 8
- Zustand con persistencia
- Tailwind CSS
- Lucide React
- Vitest
- Oxlint
- GitHub Actions y GitHub Pages

## Arquitectura

```text
src/
├── components/       Interfaces principales y componentes de acertijos
├── data/             Directorio de sospechosos, armas, estancias y narrativa
├── engine/           Generación de casos, pistas, narrativa y acertijos
│   └── puzzles/      Implementaciones deterministas de los diez tipos
├── store/            Estado persistido de la partida
├── types/            Contratos y modelos TypeScript
├── utils/            Audio y utilidades compartidas
├── App.tsx           Composición principal
└── main.tsx          Punto de entrada React

public/
├── portraits/        Retratos, fondos y recursos visuales
└── audio/            Efectos de sonido

tests/                Pruebas de casos, acertijos y universo narrativo
e2e/                  Scripts de pruebas de extremo a extremo
.github/workflows/    Despliegue automático a GitHub Pages
```

La separación principal queda en `src/data` para el contenido narrativo, `src/engine` para reglas y generación, `src/components` para presentación e interacción, y `src/store` para el estado persistente.

## Requisitos

- Node.js 20 o compatible con Vite 8.
- npm.

## Instalación y ejecución local

```bash
npm ci
npm run dev
```

Vite mostrará la URL local de desarrollo, normalmente `http://localhost:5173`.

Para construir y previsualizar la versión de producción:

```bash
npm run build
npm run preview
```

## Scripts

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga automática. |
| `npm run build` | Comprobación de TypeScript y compilación Vite. |
| `npm run preview` | Servir localmente el resultado de `dist`. |
| `npm test` | Ejecutar la suite Vitest. |
| `npm run lint` | Ejecutar Oxlint sobre el proyecto. |

## Calidad

Las pruebas cubren generación y evaluación de casos, compatibilidad de acertijos y coherencia del universo narrativo.

```bash
npm test
npm run lint
npm run build
```

## Despliegue

El despliegue usa GitHub Actions con el workflow `.github/workflows/deploy-pages.yml`.

- Se activa al publicar cambios en `main` o mediante ejecución manual.
- Instala dependencias con `npm ci`.
- Ejecuta pruebas y compilación.
- Publica el directorio `dist` mediante GitHub Pages.

La configuración Vite utiliza rutas relativas para preservar los recursos públicos al servir el proyecto desde `https://luics415.github.io/Invierno-1924/`.
