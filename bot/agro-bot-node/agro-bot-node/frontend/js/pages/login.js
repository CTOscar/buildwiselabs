// Logica de la pagina de login (antes vivia inline en public/login.html).

import { initToggleTema } from '../tema.js';
import { mostrarSplash } from '../splash.js';
initToggleTema('btnTema');

// Splash de carga (logo + skeleton) unos ~7s al abrir la pagina, antes de dejar ver el
// formulario de login -- puramente de presentacion, no espera ningun dato del servidor.
// SOLO aqui: las paginas de adentro (bot, actividad, bitacora, monitoreo, usuarios) ya no
// lo llevan, para que navegar entre ellas sea inmediato.
setTimeout(() => {
  const splash = document.getElementById('splashCarga');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 300);
  }
}, 7000);

// Boton de ojo para mostrar/ocultar la contraseña (solo cambia el type del input).
const btnVerPassword = document.getElementById('btnVerPassword');
if (btnVerPassword) {
  btnVerPassword.addEventListener('click', () => {
    const input = document.getElementById('password');
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    btnVerPassword.setAttribute('aria-pressed', String(mostrar));
    btnVerPassword.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
    document.getElementById('tachaPassword').style.display = mostrar ? 'none' : '';
  });
}

// --- Crear perfil (alterna con el panel de inicio de sesion) ---
const panelLogin = document.getElementById('panelLogin');
const panelRegistro = document.getElementById('panelRegistro');
const formRegistro = document.getElementById('formRegistro');
const msgRegistro = document.getElementById('msgRegistro');
const btnCrearPerfil = document.getElementById('btnCrearPerfil');
const avisoRegistroNoDisponible = document.getElementById('avisoRegistroNoDisponible');

function mostrarPanel(cual) {
  const esRegistro = cual === 'registro';
  panelLogin.hidden = esRegistro;
  panelRegistro.hidden = !esRegistro;
  msgRegistro.hidden = true;
  (esRegistro ? document.getElementById('rNombre') : document.getElementById('usuario')).focus();
}

function mensajeRegistro(ok, texto) {
  msgRegistro.hidden = false;
  msgRegistro.className = 'mt-4 text-sm text-center ' + (ok ? 'text-green-700' : 'text-red-600');
  msgRegistro.textContent = texto;
}

// Sin base de datos el bot usa el acceso compartido y no se pueden crear perfiles: se
// avisa y se apaga el formulario (en vez de dejar que lo llenen para nada).
fetch('/registro/estado').then((r) => r.json()).then((data) => {
  const disponible = !!(data && data.disponible);
  avisoRegistroNoDisponible.hidden = disponible;
  formRegistro.querySelectorAll('input, button').forEach((el) => { el.disabled = !disponible; });
  formRegistro.classList.toggle('opacity-50', !disponible);
}).catch(() => {});

document.getElementById('btnIrRegistro').addEventListener('click', () => mostrarPanel('registro'));
document.getElementById('btnIrLogin').addEventListener('click', () => mostrarPanel('login'));
if (window.location.hash === '#crear-perfil') mostrarPanel('registro');

formRegistro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('rPassword').value;
  if (password !== document.getElementById('rPassword2').value) {
    mensajeRegistro(false, 'Las contraseñas no coinciden.');
    return;
  }
  btnCrearPerfil.disabled = true;
  btnCrearPerfil.textContent = 'Creando...';
  try {
    const res = await fetch('/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: document.getElementById('rNombre').value,
        usuario: document.getElementById('rUsuario').value,
        email: document.getElementById('rEmail').value,
        password,
      }),
    });
    const data = await res.json();
    mensajeRegistro(!!data.ok, data.mensaje || (data.ok ? 'Perfil creado.' : 'No se pudo crear el perfil.'));
    if (data.ok) {
      // Deja listo el login con su usuario para cuando lo activen.
      document.getElementById('usuario').value = document.getElementById('rUsuario').value;
      formRegistro.reset();
    }
  } catch (err) {
    mensajeRegistro(false, 'Error de conexion: ' + err.message);
  } finally {
    btnCrearPerfil.disabled = false;
    btnCrearPerfil.textContent = 'Crear perfil';
  }
});

const form = document.getElementById('formLogin');
const errorDiv = document.getElementById('error');
const btnEntrar = document.getElementById('btnEntrar');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorDiv.hidden = true;
  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Entrando...';
  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: document.getElementById('usuario').value,
        password: document.getElementById('password').value,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      // La pantalla del logo mientras carga el bot, en vez de un salto en blanco.
      mostrarSplash();
      // Sin esto no se alcanza a ver: si se navega en la misma vuelta, el navegador
      // descarta la pagina antes de pintar lo que se acaba de agregar. Dos cuadros de
      // espera garantizan un pintado real antes de salir.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // "entrando=1" le avisa al bot que viene del login, para que siga mostrando la
        // misma pantalla mientras arranca (ver el <script> del <head> en index.html).
        window.location.href = '/bot-web?entrando=1';
      }));
    } else {
      errorDiv.textContent = data.mensaje || 'No se pudo iniciar sesion.';
      errorDiv.hidden = false;
    }
  } catch (err) {
    errorDiv.textContent = 'Error de conexion: ' + err.message;
    errorDiv.hidden = false;
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar';
  }
});
