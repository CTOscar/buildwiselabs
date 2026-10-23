---
title: Cómo levantar un bot
description: Arrancar, detener, reiniciar y actualizar el chatbot.
---

# Cómo levantar un bot

Todos los comandos se corren en la carpeta del chatbot, donde está `docker-compose.yml`.

## Arrancar

```bash
docker compose up -d --build
```

- `-d` lo deja corriendo en segundo plano.
- `--build` reconstruye la app con los cambios más recientes del código.

La primera vez tarda unos minutos porque descarga las imágenes de OpenWebUI y Ollama.

## Ver que está arriba

```bash
docker compose ps
```

Los tres servicios (`app`, `openwebui` y `ollama`) deben aparecer como `running`. Después revisa los registros de la app:

```bash
docker compose logs -f app
```

Busca `Claude test: OK ✓`. Si no aparece, ve a [Solución de problemas](../chatbot/operacion/solucion-de-problemas.md).

## Detener, reiniciar y actualizar

| Quiero… | Comando |
|---|---|
| Reiniciar solo la app (por ejemplo, después de cambiar el `.env`) | `docker compose up -d app` |
| Reiniciar todo | `docker compose restart` |
| Detener todo, sin perder datos | `docker compose down` |
| Actualizar a la última versión del código | `git pull` y después `docker compose up -d --build` |

:::warning `down -v` borra datos
`docker compose down -v` también borra los volúmenes: los usuarios y conversaciones de OpenWebUI y los modelos de Ollama. No lo uses salvo que quieras empezar de cero.
:::

## Levantar solo la app

Si no necesitas OpenWebUI ni Ollama:

```bash
docker compose up -d --build app
```

Siguiente paso: [Primer mensaje de prueba](./primer-mensaje.md).
