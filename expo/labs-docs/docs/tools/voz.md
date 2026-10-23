---
sidebar_position: 3
title: Plugins de voz
description: Dictado y lectura en voz alta en el navegador, en español de México.
---

# Plugins de voz

Los asistentes aceptan mensajes dictados y pueden contestar en voz alta. Las dos cosas usan la **Web Speech API** del navegador, así que no hay costo por minuto ni servidores de voz que mantener.

| Pieza | API del navegador | Qué hace |
|---|---|---|
| Dictado | `SpeechRecognition` | Convierte lo que dices en texto y lo manda al chat. |
| Lectura | `speechSynthesis` | Lee la respuesta del asistente en voz alta. |

## Dictado

```js
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  microfono.disabled = true; // navegador sin soporte: se oculta el botón
} else {
  const reconocimiento = new SpeechRecognition();
  reconocimiento.lang = 'es-MX';
  reconocimiento.interimResults = true; // muestra el texto mientras hablas
  reconocimiento.continuous = false;    // termina sola al dejar de hablar

  reconocimiento.onresult = (e) => {
    const texto = Array.from(e.results).map((r) => r[0].transcript).join('');
    entrada.value = texto;
    if (e.results[e.results.length - 1].isFinal) enviarMensaje(texto);
  };

  microfono.addEventListener('click', () => reconocimiento.start());
}
```

## Lectura en voz alta

```js
function leer(texto) {
  if (!window.speechSynthesis || !texto) return;
  window.speechSynthesis.cancel();           // corta lo que se estaba leyendo
  const voz = new SpeechSynthesisUtterance(texto.slice(0, 500));
  voz.lang = 'es-MX';
  window.speechSynthesis.speak(voz);
}
```

Se recorta a 500 caracteres para que una respuesta larga no se quede hablando minutos.

## Compatibilidad

- **Dictado:** Chrome y Edge, en escritorio y Android. Safari tiene soporte parcial.
- **Lectura:** prácticamente todos los navegadores modernos; las voces disponibles dependen del sistema.
- **HTTPS obligatorio:** el navegador solo da acceso al micrófono en páginas seguras. En `localhost` sí funciona sin certificado.
- **Privacidad:** en Chrome, el reconocimiento de voz envía el audio a los servidores de Google para convertirlo en texto. El texto resultante es lo que llega al chatbot.

## Dónde se usa

- [Chat del Chatbot PYME](../chatbot/uso/chat.md#voz)
