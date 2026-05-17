## Plan: Transcripción avanzada, letras sincronizadas y traducción en Voxly

### 1. Backend (Lovable Cloud)

**Migración DB** — añadir columnas a `audios`:
- `transcript` (jsonb) — segmentos `[{time, text}]`
- `source_text` (text) — texto original del creador
- `tts_voice` (text) — voz IA elegida
- `translations` (jsonb) — `{ en: [...segments], fr: [...] }` (cache)

**Edge function `generate-tts`**:
- Input: `{ text, voice }`
- Usa ElevenLabs (requiere `ELEVENLABS_API_KEY`) para generar audio + timestamps por palabra (`/v1/text-to-speech/{voice_id}/with-timestamps`).
- Sube WAV/MP3 al bucket `audios` y devuelve `{ audio_url, duration, transcript }` con segmentos sincronizados (agrupados por frase ~8-12 palabras).

**Edge function `translate-transcript`**:
- Input: `{ segments, targetLang }` (en | fr | es)
- Usa Lovable AI Gateway (`google/gemini-3-flash-preview`) con structured output para traducir manteniendo timestamps.
- Resultado se cachea en la columna `translations` desde el cliente.

### 2. Creador — "Crear desde texto" (CreatePage + AudioEditorDialog)

- Nuevo toggle de modo de fuente: **Grabar / Subir archivo / Desde texto**.
- En modo texto: `<textarea>` largo + selector de voz IA (Pastor Sereno, Voz Cálida Femenina, Narrador Profundo, Voz Angelical) mapeadas a voice IDs de ElevenLabs.
- Botón **"Generar audio"** → llama `generate-tts` → muestra preview y rellena `audio_url`, `duration`, `transcript`, `source_text`, `tts_voice`.
- Mantener todas las opciones existentes (título, descripción, tags, efecto visual, permisos, edición trim/append).
- En `AudioEditorDialog` (audios propios): añadir pestaña "Editar texto" que re-genera el audio desde el texto modificado.

### 3. Oyente — Botón "Letra" en el reproductor (AudioCard)

- Añadir tercer botón **"Letra"** (icono `Type` / `FileText`) junto a "Efectos" y "Voces IA".
- Al activar: oculta el efecto visual de fondo y muestra panel a pantalla completa con todos los segmentos del transcript.
- **Sincronización palabra/línea por línea**: el segmento activo se resalta (escala leve + glow dorado), los pasados en `text-muted-foreground`, los futuros con opacidad reducida. Auto-scroll suave al segmento activo.
- Toggle para volver al efecto visual.
- Fuente del transcript: columna `transcript` de DB; fallback a `TRANSCRIPTIONS` mock existente por `id`.

### 4. Traducción en modo Letra

- Dentro del panel Letra: barra superior con chips **Original / EN / FR / ES**.
- Al elegir un idioma distinto del original: si está en `translations[lang]` lo usa; si no, llama `translate-transcript`, guarda en DB (si es audio propio) o en estado local.
- Mantiene los mismos timestamps → sincronización funciona idéntico.
- Botón **"Original"** vuelve al transcript fuente.

### 5. Diseño

- Reutilizar `card-luminous`, `gold-text`, gradientes ya definidos. Sin colores hardcoded.
- Modo Letra: fondo `bg-background/95 backdrop-blur` con overlay para legibilidad en ambos temas.
- Mantener Amén, seek bar, auto-play, efectos inmersivos, voces IA reales, editor, etc.

### Detalles técnicos

- Voces ElevenLabs (mapping inicial):
  - Pastor Sereno → `JBFqnCBsd6RMkjVDRZzb` (George)
  - Voz Cálida Femenina → `EXAVITQu4vr4xnSDxMaL` (Sarah)
  - Narrador Profundo → `nPczCjzI2devNBz1zQrb` (Brian)
  - Voz Angelical → `XB0fDUnXU5powFXDhCwa` (Charlotte)
- `ELEVENLABS_API_KEY` se solicita via `add_secret` antes de implementar.
- Sin cambios en `AudioPlaybackContext` salvo exponer `currentTime` (ya disponible).
- Archivos tocados: `src/pages/CreatePage.tsx`, `src/components/AudioEditorDialog.tsx`, `src/components/AudioCard.tsx`, `src/components/LyricsPanel.tsx` (nuevo), `src/components/TextToAudioPanel.tsx` (nuevo), edge functions nuevas, migración DB.

### Aprobación necesaria
- Crear migración DB (columnas nuevas).
- Añadir secret `ELEVENLABS_API_KEY` (clave del usuario de ElevenLabs — plan free funciona).
