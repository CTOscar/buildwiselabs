// Riel de navegacion izquierdo (estilo Meta Business Suite) compartido por las paginas
// del bot. El HTML del riel vive en cada .html; este modulo solo muestra el acceso a
// "Usuarios" con la misma regla que el menu de perfil de index.js: el bot ya usa
// cuentas individuales Y quien mira es administrador.
export function mostrarUsuariosEnRail(perfil) {
  const item = document.getElementById('railUsuarios');
  if (item && perfil && perfil.multiusuario && perfil.rol === 'admin') item.hidden = false;
}

// Para las paginas que no piden /perfil por su cuenta (actividad, monitoreo).
export async function initRail() {
  if (!document.getElementById('railUsuarios')) return;
  try {
    const res = await fetch('/perfil');
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok) mostrarUsuariosEnRail(data);
  } catch (e) { /* sin perfil el riel queda sin "Usuarios", igual que el menu */ }
}
