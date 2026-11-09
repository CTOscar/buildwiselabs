import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AUTH_ERRORS, authErrorMessage, socialHtml, wireSocial } from '../../../src/features/login/social.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

function mount() {
  document.body.innerHTML = `<div id="root">${socialHtml('Continuar con')}</div>`;
  return document.getElementById('root');
}

beforeEach(() => {
  history.replaceState(null, '', '/');
});

describe('acceso con Google y Apple', () => {
  test('muestra los dos botones con el verbo indicado', () => {
    const root = mount();
    expect(root.querySelector('[data-social="google"]').textContent).toContain('Continuar con Google');
    expect(root.querySelector('[data-social="apple"]').textContent).toContain('Continuar con Apple');
    expect(socialHtml('Registrarse con')).toContain('Registrarse con Apple');
  });

  test('cada código de la API tiene su mensaje; uno desconocido usa el genérico', () => {
    Object.keys(AUTH_ERRORS).forEach((code) => expect(authErrorMessage(`?auth_error=${code}`)).toBe(AUTH_ERRORS[code]));
    expect(authErrorMessage('?auth_error=raro')).toBe('No se pudo iniciar sesión con ese proveedor.');
    expect(authErrorMessage('')).toBeNull();
  });

  test('al volver con ?auth_error muestra el aviso y limpia la URL', () => {
    history.replaceState(null, '', '/?auth_error=cancelado#/entrar');
    const show = jest.fn();
    wireSocial(mount(), {}, show);
    expect(show).toHaveBeenCalledWith(AUTH_ERRORS.cancelado, 'error');
    expect(location.search).toBe('');
    expect(location.hash).toBe('#/entrar');
  });

  test('proveedor no activado en la API: avisa y no navega', async () => {
    const show = jest.fn();
    const client = { socialUrl: jest.fn(), socialProviders: async () => ({ google: true, apple: false }) };
    const root = mount();
    wireSocial(root, client, show);
    root.querySelector('[data-social="apple"]').click();
    await flush();
    expect(show).toHaveBeenCalledWith('El acceso con Apple aún no está activado en el servidor.', 'info');
    expect(client.socialUrl).not.toHaveBeenCalled();
  });

  test('si la API no responde se trata como no activado', async () => {
    const show = jest.fn();
    const client = { socialUrl: jest.fn(), socialProviders: () => Promise.reject(new Error('sin red')) };
    const root = mount();
    wireSocial(root, client, show);
    root.querySelector('[data-social="google"]').click();
    await flush();
    expect(show).toHaveBeenCalledWith('El acceso con Google aún no está activado en el servidor.', 'info');
  });

  test('sin API del panel: Apple explica qué falta', async () => {
    const show = jest.fn();
    const root = mount();
    wireSocial(root, {}, show);
    root.querySelector('[data-social="apple"]').click();
    await flush();
    expect(show.mock.calls[0][0]).toContain('VITE_PANEL_API_URL');
    expect(show.mock.calls[0][1]).toBe('info');
  });
});
