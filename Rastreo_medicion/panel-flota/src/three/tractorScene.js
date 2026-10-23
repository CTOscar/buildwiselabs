// Escena 3D esquemática del tractor con rastreador, sensores y cableado.
// Se importa bajo demanda desde el modal (dynamic import).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const COMPONENTS = [
  { id: 'tracker', n: 'Rastreador en caja IP67', tag: 'Teltonika FMC130 / FMC150',
    d: 'Va dentro de la cabina, en una caja sellada. Tiene GPS, módem LTE y batería interna. Recibe todas las señales y las envía al servidor.',
    c: 'Alimentación · tierra · D+ · CAN · Bluetooth', a: [-1.42, 1.95, 0], o: [-2.1, 0.55, 1.5] },
  { id: 'battery', n: 'Batería', tag: '12 V o 24 V',
    d: 'Alimenta el rastreador de forma directa y con fusible, para que siga activo con el tractor apagado y pueda avisar de un robo.',
    c: 'Cable rojo · fusible F1 1–2 A', a: [0.3, 1.05, -0.62], o: [0.9, 0.6, -2.0] },
  { id: 'alt', n: 'Alternador (D+)', tag: 'Señal de motor en marcha',
    d: 'El borne D+ solo tiene voltaje cuando el motor gira. Así no se cuentan horas con la llave abierta y el motor apagado.',
    c: 'Cable amarillo · DIN1 · fusible F2', a: [1.95, 1.28, 0.5], o: [1.3, 0.5, 1.8] },
  { id: 'tank', n: 'Tanque con sonda BLE', tag: 'Sonda capacitiva inalámbrica', nivel: 'A',
    d: 'Calibrada litro por litro. Envía el nivel por Bluetooth, sin cable. Detecta cargas de pipa y extracciones con el motor apagado.',
    c: 'Bluetooth · tractores de nivel A', a: [0.35, 1.05, 0.66], o: [0.6, 0.6, 2.0] },
  { id: 'can', n: 'Conector J1939', tag: 'Computadora del motor', nivel: 'B',
    d: 'En tractores modernos el rastreador lee de la ECU las horas reales, las RPM y el consumo de diésel, sin necesidad de sonda.',
    c: 'Cable verde · CAN H / CAN L · nivel B', a: [0.02, 1.45, -0.42], o: [0.5, 0.7, -2.0] },
  { id: 'seal', n: 'Sello de acero con folio', tag: 'Antimanipulación',
    d: 'Cierra la caja y el conector. Si en la ronda el folio no coincide con el registrado, alguien abrió el equipo.',
    c: 'Folio registrado en el sistema', a: [-1.35, 2.14, 0.22], o: [-1.4, 0.4, 1.1] },
  { id: 'cell', n: 'Red celular M2M', tag: 'Datos al servidor',
    d: 'Reporta cada 60 s en movimiento y cada 30 min detenido. Si no hay señal, guarda en memoria y reenvía al recuperarla.',
    c: 'Chip M2M · LTE · servidor Traccar', a: [-1.2, 3.25, 0], o: [3.2, 2.0, 3.4] },
];

export function mountTractorScene(container, { nivel = 'A', onSelect = () => {} } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const comps = COMPONENTS.filter((c) => !c.nivel || c.nivel === nivel);
  const hiddenIds = COMPONENTS.filter((c) => c.nivel && c.nivel !== nivel).map((c) => c.id);

  const canvas = document.createElement('canvas');
  canvas.className = 'block h-full w-full touch-none cursor-grab';
  canvas.setAttribute('aria-label', 'Tractor en 3D: arrastra para girar');
  const pinsEl = document.createElement('div');
  pinsEl.className = 'pointer-events-none absolute inset-0';
  container.append(canvas, pinsEl);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const BG = 0x0f1416;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 12, 27);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const HOME = { pos: new THREE.Vector3(5.6, 3.4, 5.8), target: new THREE.Vector3(0.2, 1.35, 0) };
  camera.position.copy(HOME.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 1.6, maxDistance: 13, enablePan: false, autoRotate: !reduce, autoRotateSpeed: 0.5 });
  controls.maxPolarAngle = Math.PI * 0.48;
  let anim = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    anim = null;
  });

  scene.add(new THREE.HemisphereLight(0xdde6f0, 0x2b2621, 1.1));
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.3);
  sun.position.set(5, 9, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
  scene.add(sun);
  const back = new THREE.DirectionalLight(0x8fb4ff, 0.7);
  back.position.set(-6, 4, -5);
  scene.add(back);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 72), new THREE.MeshStandardMaterial({ color: 0x1b2320, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const rowMat = new THREE.MeshStandardMaterial({ color: 0x27312b, roughness: 1 });
  const rowGeo = new THREE.BoxGeometry(24, 0.07, 0.3);
  for (let i = -9; i <= 9; i++) {
    if (Math.abs(i) <= 1) continue;
    const r = new THREE.Mesh(rowGeo, rowMat);
    r.position.set(0, 0.035, i * 0.85);
    r.receiveShadow = true;
    scene.add(r);
  }

  const tractor = new THREE.Group();
  scene.add(tractor);
  const bodyMats = [];
  const mat = (color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, transparent: true, ...o });
    bodyMats.push(m);
    return m;
  };
  const mBody = mat(0x4b6a74);
  const mFender = mat(0x4b6a74, { side: THREE.DoubleSide });
  const mDark = mat(0x23292b, { roughness: 0.8 });
  const mTire = mat(0x151718, { roughness: 0.95, metalness: 0 });
  const mRim = mat(0xd9a23a, { metalness: 0.4 });
  const mSteel = mat(0x8b979a, { metalness: 0.6, roughness: 0.35 });
  const add = (geo, m, x, y, z, parent = tractor) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  add(new THREE.BoxGeometry(3.6, 0.38, 0.72), mDark, 0.45, 0.92, 0);
  add(new THREE.BoxGeometry(1.95, 0.66, 0.82), mBody, 1.32, 1.43, 0);
  add(new THREE.BoxGeometry(0.05, 0.54, 0.68), mDark, 2.31, 1.41, 0);
  add(new THREE.BoxGeometry(0.5, 0.1, 1.7), mDark, 1.65, 0.6, 0);
  add(new THREE.BoxGeometry(1.9, 0.12, 1.5), mDark, -0.6, 1.3, 0);
  [[0.3, 0.68], [0.3, -0.68], [-1.5, 0.68], [-1.5, -0.68]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.07, 1.62, 0.07), mBody, x, 2.13, z));
  add(new THREE.BoxGeometry(2.05, 0.12, 1.62), mBody, -0.6, 3.0, 0);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9cc4d4, transparent: true, opacity: 0.12, roughness: 0.1, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
  [[-0.6, 2.13, 0.68, 1.8, 1.55, 0.01], [-0.6, 2.13, -0.68, 1.8, 1.55, 0.01], [0.3, 2.13, 0, 0.01, 1.55, 1.36], [-1.5, 2.13, 0, 0.01, 1.55, 1.36]].forEach(([x, y, z, w, h, d]) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glass);
    g.position.set(x, y, z);
    tractor.add(g);
  });
  add(new THREE.BoxGeometry(0.45, 0.12, 0.5), mDark, -0.85, 1.62, 0);
  add(new THREE.BoxGeometry(0.1, 0.55, 0.5), mDark, -1.08, 1.9, 0);
  add(new THREE.BoxGeometry(0.25, 0.5, 1.1), mDark, 0.12, 1.6, 0);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10), mDark, 0.0, 1.9, 0).rotation.z = 0.6;
  const sw = add(new THREE.TorusGeometry(0.17, 0.022, 10, 28), mDark, -0.12, 2.1, 0);
  sw.rotation.set(0, Math.PI / 2, 0);
  sw.rotateX(-0.6);
  [0.97, -0.97].forEach((z) => {
    add(new THREE.CylinderGeometry(0.98, 0.98, 0.52, 36, 1, true, Math.PI / 2, Math.PI), mFender, -0.9, 0.85, z).rotation.x = Math.PI / 2;
  });
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 14), mSteel, 1.85, 2.2, 0.28);

  function wheel(r, w, x, z) {
    const g = new THREE.Group();
    const parts = [
      [new THREE.CylinderGeometry(r, r, w, 40), mTire],
      [new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 28), mRim],
      [new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.06, 16), mSteel],
    ];
    parts.forEach(([geo, m]) => {
      const o = new THREE.Mesh(geo, m);
      o.rotation.x = Math.PI / 2;
      o.castShadow = true;
      g.add(o);
    });
    const tread = new THREE.BoxGeometry(0.07, r * 0.16, w * 0.96);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const t = new THREE.Mesh(tread, mTire);
      t.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      t.rotation.z = a;
      g.add(t);
    }
    g.position.set(x, r, z);
    tractor.add(g);
  }
  wheel(0.85, 0.45, -0.9, 0.97);
  wheel(0.85, 0.45, -0.9, -0.97);
  wheel(0.5, 0.3, 1.65, 0.8);
  wheel(0.5, 0.3, 1.65, -0.8);

  // Componentes
  const compMeshes = {};
  const compMats = {};
  const cmat = (id, color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25, emissive: color, emissiveIntensity: 0.12, ...o });
    (compMats[id] ||= []).push(m);
    return m;
  };
  const addC = (id, geo, m, x, y, z) => {
    const o = add(geo, m, x, y, z);
    o.userData.comp = id;
    (compMeshes[id] ||= []).push(o);
    return o;
  };

  addC('tracker', new THREE.BoxGeometry(0.14, 0.34, 0.42), cmat('tracker', 0xcfd8da, { transparent: true, opacity: 0.3, depthWrite: false }), -1.42, 1.95, 0);
  addC('tracker', new THREE.BoxGeometry(0.07, 0.22, 0.3), cmat('tracker', 0x2a3133), -1.42, 1.95, 0);
  addC('tracker', new THREE.BoxGeometry(0.075, 0.04, 0.3), cmat('tracker', 0xf2a33a), -1.41, 2.03, 0);
  const led = addC('tracker', new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3fbf86 }), -1.37, 1.9, 0.1);
  [-0.12, 0, 0.12].forEach((z) => addC('tracker', new THREE.CylinderGeometry(0.02, 0.02, 0.05, 10), cmat('tracker', 0x3a4446), -1.42, 1.76, z));
  addC('seal', new THREE.TorusGeometry(0.045, 0.007, 8, 24), cmat('seal', 0xa9b4b6, { metalness: 0.8 }), -1.35, 2.14, 0.22).rotation.y = Math.PI / 2;
  addC('seal', new THREE.BoxGeometry(0.03, 0.04, 0.03), cmat('seal', 0xc0c8ca, { metalness: 0.8 }), -1.35, 2.09, 0.22);
  addC('battery', new THREE.BoxGeometry(0.34, 0.24, 0.2), cmat('battery', 0x2c3236), 0.3, 1.0, -0.62);
  addC('battery', new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), cmat('battery', 0xe8584a), 0.42, 1.14, -0.62);
  addC('battery', new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), cmat('battery', 0x222222), 0.18, 1.14, -0.62);
  addC('alt', new THREE.CylinderGeometry(0.11, 0.11, 0.16, 24), cmat('alt', 0x9aa3a6, { metalness: 0.6 }), 1.95, 1.28, 0.5).rotation.x = Math.PI / 2;
  addC('alt', new THREE.CylinderGeometry(0.06, 0.06, 0.05, 18), cmat('alt', 0x2a2f31), 1.95, 1.28, 0.6).rotation.x = Math.PI / 2;
  addC('tank', new THREE.BoxGeometry(0.55, 0.42, 0.36), cmat('tank', 0x39424a), 0.35, 1.0, 0.66);
  addC('tank', new THREE.CylinderGeometry(0.022, 0.022, 0.46, 10), cmat('tank', 0x4f8ff0), 0.35, 1.04, 0.66);
  addC('tank', new THREE.BoxGeometry(0.08, 0.05, 0.08), cmat('tank', 0x4f8ff0), 0.35, 1.27, 0.66);
  addC('can', new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16), cmat('can', 0x2f6b52), 0.02, 1.45, -0.42).rotation.z = Math.PI / 2;

  // Cables
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const wire = (id, pts, color, r = 0.017) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.6 });
    const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 8, false), m);
    t.userData.comp = id;
    (compMeshes[id] ||= []).push(t);
    tractor.add(t);
    return curve;
  };
  const cPow = wire('battery', [V(0.42, 1.16, -0.62), V(0.3, 1.34, -0.6), V(-0.5, 1.4, -0.6), V(-1.2, 1.45, -0.35), V(-1.38, 1.7, -0.1), V(-1.4, 1.82, -0.05)], 0xe8584a);
  wire('tracker', [V(-1.4, 1.82, 0.03), V(-1.46, 1.5, 0.05), V(-1.3, 1.13, 0.05), V(-1.0, 1.11, 0.0)], 0x5a6365);
  const cDp = wire('alt', [V(1.95, 1.28, 0.6), V(1.6, 1.15, 0.5), V(0.8, 1.2, 0.47), V(0.0, 1.42, 0.55), V(-0.9, 1.45, 0.5), V(-1.3, 1.6, 0.25), V(-1.4, 1.86, 0.06)], 0xf2c13a);
  const cCan = wire('can', [V(0.07, 1.45, -0.42), V(-0.4, 1.42, -0.45), V(-1.1, 1.5, -0.3), V(-1.36, 1.75, -0.1), V(-1.4, 1.88, -0.02)], 0x3fbf86);
  const cBle = new THREE.CatmullRomCurve3([V(0.35, 1.3, 0.66), V(-0.2, 1.95, 0.6), V(-1.0, 2.15, 0.3), V(-1.4, 1.99, 0.06)]);

  const pulses = (curve, color, n, size, speed, comp) => {
    const m = new THREE.MeshBasicMaterial({ color });
    const geo = new THREE.SphereGeometry(size, 10, 8);
    const arr = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(geo, m);
      s.userData.comp = comp;
      tractor.add(s);
      arr.push(s);
    }
    return {
      set: (v) => arr.forEach((s) => (s.visible = v)),
      update: (t) => arr.forEach((s, i) => s.position.copy(curve.getPointAt((t * speed + i / n) % 1))),
      arr,
    };
  };
  const pPow = pulses(cPow, 0xff8a7a, 3, 0.03, 0.12, 'battery');
  const pDp = pulses(cDp, 0xffe08a, 6, 0.034, 0.35, 'alt');
  const pCan = pulses(cCan, 0x8ff0c4, 5, 0.032, 0.4, 'can');
  const pBle = pulses(cBle, 0x9cc0ff, 6, 0.022, 0.25, 'tank');

  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.012, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xa58cf0, transparent: true, opacity: 0, depthWrite: false }),
    );
    r.rotation.x = Math.PI / 2;
    r.position.set(-1.2, 3.12, 0);
    r.userData.comp = 'cell';
    tractor.add(r);
    rings.push(r);
  }
  (compMeshes.cell ||= []).push(...rings);
  addC('cell', new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), cmat('cell', 0xa58cf0), -1.2, 3.15, 0);

  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x9aa3a6, transparent: true, opacity: 0, depthWrite: false, roughness: 1 }),
    );
    scene.add(p);
    puffs.push(p);
  }

  // Ocultar lo que no aplica al nivel del tractor
  hiddenIds.forEach((id) => (compMeshes[id] || []).forEach((m) => (m.visible = false)));
  const showBle = nivel === 'A';
  const showCan = nivel === 'B';
  pBle.set(showBle);

  // Pines HTML
  const pins = comps.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pin3d pointer-events-auto';
    b.textContent = i + 1;
    b.setAttribute('aria-label', c.n);
    b.addEventListener('click', () => select(c.id));
    pinsEl.appendChild(b);
    return { c, b };
  });

  // Estado
  let engine = false;
  const setXray = (v) =>
    bodyMats.forEach((m) => {
      m.opacity = v ? 0.3 : 1;
      m.depthWrite = !v;
      m.needsUpdate = true;
    });
  const setEngine = (v) => {
    engine = v;
    pDp.set(v);
    pCan.set(v && showCan);
  };
  const flyTo = (pos, target) => {
    anim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, s: performance.now(), d: reduce ? 1 : 900 };
  };
  function highlight(id) {
    pins.forEach(({ c, b }) => b.classList.toggle('sel', c.id === id));
    Object.entries(compMats).forEach(([k, ms]) => ms.forEach((m) => (m.emissiveIntensity = k === id ? 0.55 : 0.12)));
  }
  function select(id) {
    const c = comps.find((x) => x.id === id);
    if (!c) return;
    controls.autoRotate = false;
    highlight(id);
    const t = new THREE.Vector3(...c.a);
    flyTo(t.clone().add(new THREE.Vector3(...c.o)), t);
    onSelect(id);
  }
  function home() {
    highlight(null);
    flyTo(HOME.pos.clone(), HOME.target.clone());
  }

  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let down = null;
  const onDown = (e) => (down = [e.clientX, e.clientY]);
  const onUp = (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const targets = Object.values(compMeshes).flat().filter((m) => m.visible);
    const hit = ray.intersectObjects(targets, false)[0];
    if (hit) select(hit.object.userData.comp);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 560 ? 48 : 36;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  setXray(true);
  setEngine(false);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let raf = 0;
  function loop() {
    const t = clock.getElapsedTime();
    if (anim) {
      const k = Math.min(1, (performance.now() - anim.s) / anim.d);
      const e = ease(k);
      camera.position.lerpVectors(anim.p0, anim.p1, e);
      controls.target.lerpVectors(anim.t0, anim.t1, e);
      if (k >= 1) anim = null;
    }
    controls.update();

    pPow.update(t);
    if (showBle) pBle.update(t);
    if (engine) {
      pDp.update(t);
      if (showCan) pCan.update(t);
    }
    const period = engine ? 1.4 : 2.6;
    rings.forEach((r, i) => {
      const u = (t / period + i / 3) % 1;
      r.scale.setScalar(0.3 + u * 2.6);
      r.material.opacity = (1 - u) * 0.7;
    });
    if (engine) {
      tractor.position.y = reduce ? 0 : Math.sin(t * 55) * 0.004;
      puffs.forEach((p, i) => {
        const u = (t * 0.6 + i / puffs.length) % 1;
        p.position.set(1.85 - u * 0.5, 2.7 + u * 1.1, 0.28 + u * 0.15);
        p.scale.setScalar(0.5 + u * 1.4);
        p.material.opacity = (1 - u) * 0.18;
      });
    } else {
      tractor.position.y = 0;
      puffs.forEach((p) => (p.material.opacity = 0));
    }
    led.material.color.setHex(Math.floor(t * 2) % 2 ? 0x3fbf86 : 0x1d5c40);

    const w = container.clientWidth;
    const h = container.clientHeight;
    pins.forEach(({ c, b }) => {
      tmp.set(...c.a).project(camera);
      b.style.display = tmp.z > 1 ? 'none' : '';
      b.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px,${(-tmp.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`;
    });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  loop();

  function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    controls.dispose();
    scene.traverse((o) => {
      o.geometry?.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
    renderer.dispose();
    canvas.remove();
    pinsEl.remove();
  }

  return { components: comps, select, home, setEngine, setXray, dispose };
}
