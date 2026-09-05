'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKINS = [
  {
    id: 'clasica',
    nombre: 'CLÁSICA',
    color: '#fff',
    llama: 'rgba(255, 130, 0, 0.85)',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],   // triángulo con muesca trasera
  },
  {
    id: 'cazador',
    nombre: 'CAZADOR',
    color: '#0ef',
    llama: 'rgba(0, 230, 255, 0.9)',
    verts: [[24, 0], [-10, -7], [-14, 0], [-10, 7]],  // dardo estrecho
  },
  {
    id: 'orbe',
    nombre: 'ORBE',
    color: '#f4f',
    llama: 'rgba(255, 100, 220, 0.9)',
    verts: [[14, 0], [5, -9], [-7, -9], [-13, 0], [-7, 9], [5, 9]],   // cápsula hexagonal
  },
  {
    id: 'halcon',
    nombre: 'HALCÓN',
    color: '#5f5',
    llama: 'rgba(140, 255, 140, 0.9)',
    verts: [[18, 0], [3, -4], [-4, -12], [-11, -9], [-8, -3], [-8, 3], [-11, 9], [-4, 12], [3, 4]],  // caza con alas barridas
  },
  {
    id: 'gigante',
    nombre: 'GIGANTE',
    color: '#b45ef7',
    llama: 'rgba(200, 130, 255, 0.9)',
    scale: 2,
    pointsMult: 2,
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],   // réplica 2x de la clásica
  },
];

const SKIN_KEY = 'asteroids-skin';

let skinIndex = 0;
try {
  const i = SKINS.findIndex(s => s.id === localStorage.getItem(SKIN_KEY));
  if (i >= 0) skinIndex = i;
} catch { /* sin acceso a storage: se queda la skin clásica */ }

const getSkin = () => SKINS[skinIndex];
const getScale = () => getSkin().scale || 1;
const getPointsMult = () => getSkin().pointsMult || 1;

let skinMsgTimer = 0;   // segundos restantes del aviso "SKIN: ..." en el HUD

function cycleSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  skinMsgTimer = 2;
  if (ship) ship.radius = 12 * getScale();
  try { localStorage.setItem(SKIN_KEY, SKINS[skinIndex].id); } catch {}
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle, color = '#fff') {
    this.x = x;
    this.y = y;
    this.color = color;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_TTL    = 6;    // segundos en pantalla antes de desvanecerse
const STAR_SPEED  = 290;  // px/s, mucho más rápida que un asteroide normal
const STAR_POINTS = 250;  // bonus por destruirla

class EstrellaFugaz extends Asteroid {
  constructor(x, y, angle) {
    super(x, y, 2);
    const speed = STAR_SPEED + rand(-30, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.points = STAR_POINTS;
    this.ttl  = STAR_TTL;
    this.life = STAR_TTL;
  }

  update(dt) {
    if (this.dead) return;
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 6);   // pequeña ráfaga al desvanecerse
    }
  }

  // No se parte en fragmentos: se destruye entera
  split() { return []; }

  draw() {
    if (this.dead) return;
    // Parpadeo cuando está por desaparecer
    if (this.ttl < 1.5 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const alpha = (this.ttl / this.life).toFixed(2);

    // Estela en dirección opuesta a la velocidad
    const speed = Math.hypot(this.vx, this.vy) || 1;
    const len = 24 + speed * 0.06;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 170, 50, ${alpha})`;
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - (this.vx / speed) * len, this.y - (this.vy / speed) * len);
    ctx.stroke();
    ctx.restore();

    // Cuerpo: mismo polígono irregular, en tono cálido
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = `rgba(255, 209, 102, ${alpha})`;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const SHIELD_MAX      = 2.5;  // segundos de energía con la carga llena
const SHIELD_RECHARGE = 0.5;  // energía recuperada por segundo al soltar (5 s para llenar)
const SHIELD_COST_HIT = 0.75; // coste extra de energía por cada impacto bloqueado
const SHIELD_UNLOCK   = 0.6;  // energía mínima para reactivar tras agotarse
const SHIELD_RADIUS   = 30;   // radio del aro protector

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * getScale();
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.dead          = false;
    this.shieldEnergy  = SHIELD_MAX;
    this.shieldActive  = false;
    this.shieldLock    = false;
    this.shieldPulse   = 0;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    // Escudo de energía: mantener Shift con carga disponible
    if (this.shieldLock && this.shieldEnergy >= SHIELD_UNLOCK) this.shieldLock = false;
    const holdShield = keys['ShiftLeft'] || keys['ShiftRight'];
    this.shieldActive = holdShield && !this.shieldLock && this.shieldEnergy > 0;
    if (this.shieldActive) {
      this.shieldEnergy -= dt;
      this.shieldPulse  += dt;
      if (this.shieldEnergy <= 0) {
        this.shieldEnergy = 0;
        this.shieldLock   = true;
        this.shieldActive = false;
      }
    } else {
      this.shieldEnergy = Math.min(this.shieldEnergy + SHIELD_RECHARGE * dt, SHIELD_MAX);
    }

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      const thrust = this.speedBoost > 0 ? THRUST * 2 : THRUST;
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21 * getScale();
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Triple disparo: 3 balas en fila sobre la misma línea de tiro
    if (this.tripleShot > 0) {
      const GAP = 7;   // separación entre balas
      return [-1, 0, 1].map(i => new Bullet(
        ox + Math.cos(this.angle) * GAP * i,
        oy + Math.sin(this.angle) * GAP * i,
        this.angle,
        '#f4f'
      ));
    }

    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = getSkin();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(getScale(), getScale());
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta según la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor (cian mientras dura el power-up de velocidad)
    if (this.thrusting && Math.random() > 0.35) {
      const len  = this.speedBoost > 0 ? rand(8, 22) : rand(6, 14);
      const rear = Math.min(...skin.verts.map(v => v[0])) + 2;   // anclada a la popa de la silueta
      ctx.beginPath();
      ctx.moveTo(rear, -4);
      ctx.lineTo(rear - len, 0);
      ctx.lineTo(rear,  4);
      ctx.strokeStyle = this.speedBoost > 0 ? 'rgba(0, 230, 255, 0.9)' : skin.llama;
      ctx.stroke();
    }

    // Aro del escudo (cian, con pulso mientras está activo)
    if (this.shieldActive) {
      const w = Math.sin(this.shieldPulse * 9);
      ctx.strokeStyle = `rgba(0, 238, 255, ${(0.65 + w * 0.25).toFixed(2)})`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, SHIELD_RADIUS + w * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 238, 255, 0.25)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(0, 0, SHIELD_RADIUS - 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups: Velocidad y Triple disparo ─────────────────────────────────────
const BOOST_DURATION  = 5;  // segundos de efecto al recogerlos
const TRIPLE_DURATION = 5;
const POWERUP_TTL     = 10; // segundos en pantalla antes de desaparecer

class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 12;
    this.ttl   = POWERUP_TTL;
    this.pulse = rand(0, Math.PI * 2);
    this.dead  = false;

    // Deriva lenta para no quedar estático
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl   -= dt;
    this.pulse += dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por desaparecer
    if (this.ttl < 2.5 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const triple = this.type === 'triple';

    ctx.save();
    ctx.translate(this.x, this.y);
    const s = 1 + Math.sin(this.pulse * 4) * 0.12;   // pulso suave
    ctx.scale(s, s);

    // Aro exterior tenue
    ctx.strokeStyle = triple ? 'rgba(255, 68, 255, 0.4)' : 'rgba(0, 238, 255, 0.4)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    if (triple) {
      // Icono: 3 puntos en fila
      ctx.fillStyle = '#f4f';
      for (const dx of [-7, 0, 7]) {
        ctx.beginPath();
        ctx.arc(dx, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Rayo
      ctx.beginPath();
      ctx.moveTo( 3, -8);
      ctx.lineTo(-4,  1);
      ctx.lineTo(-1,  1);
      ctx.lineTo(-2,  8);
      ctx.lineTo( 4, -1);
      ctx.lineTo( 1, -1);
      ctx.closePath();
      ctx.fillStyle = '#0ef';
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;  // cuenta atrás para la próxima estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnEstrellaFugaz() {
  // Nace en un borde y apunta hacia una zona aleatoria del interior
  const SAFE_DIST = 130;
  let x, y;
  do {
    const side = randInt(0, 3);
    x = [rand(0, W), W, rand(0, W), 0][side];
    y = [0, rand(0, H), H, rand(0, H)][side];
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  const tx = rand(W * 0.25, W * 0.75);
  const ty = rand(H * 0.25, H * 0.75);
  asteroids.push(new EstrellaFugaz(x, y, Math.atan2(ty - y, tx - x)));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = rand(4, 8);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambio de skin disponible en cualquier estado
  if (pressed('KeyC')) cycleSkin();
  if (skinMsgTimer > 0) skinMsgTimer -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Estrella fugaz: aparición periódica
  starTimer -= dt;
  if (starTimer <= 0) {
    spawnEstrellaFugaz();
    starTimer = rand(6, 12);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points * getPointsMult();
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.12)
          powerups.push(new PowerUp(a.x, a.y, Math.random() < 0.5 ? 'speed' : 'triple'));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide (el escudo activo destruye el asteroide en vez de morir)
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      const reach = (ship.shieldActive ? SHIELD_RADIUS * getScale() : ship.radius) + a.radius * 0.82;
      if (dist(ship, a) < reach) {
        if (ship.shieldActive) {
          a.dead = true;
          explode(a.x, a.y, a.size * 5);
          ship.shieldEnergy = Math.max(0, ship.shieldEnergy - SHIELD_COST_HIT);
          if (ship.shieldEnergy <= 0) ship.shieldLock = true;
          asteroids = asteroids.filter(x => !x.dead).concat(a.split());
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nave vs power-up
  for (const p of powerups) {
    if (!ship.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'triple') ship.tripleShot = TRIPLE_DURATION;
      else                     ship.speedBoost = BOOST_DURATION;
      explode(p.x, p.y, 6);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = getSkin();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0] * 0.45, skin.verts[0][1] * 0.45);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0] * 0.45, skin.verts[i][1] * 0.45);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);
  if (ship.speedBoost > 0 && !ship.dead) {
    ctx.fillStyle = '#0ef';
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, 14, 48);
    ctx.fillStyle = '#fff';
  }
  if (ship.tripleShot > 0 && !ship.dead) {
    ctx.fillStyle = '#f4f';
    ctx.fillText(`TRIPLE ${ship.tripleShot.toFixed(1)}s`, 14, 70);
    ctx.fillStyle = '#fff';
  }

  // Barra de energía del escudo (abajo a la izquierda)
  if (!ship.dead) {
    const bx = 14, by = H - 24, bw = 120, bh = 7;
    ctx.fillText('ESCUDO', bx, by - 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = ship.shieldLock ? 'rgba(150,150,150,0.9)' : '#0ef';
    ctx.fillRect(bx + 1, by + 1, (bw - 2) * (ship.shieldEnergy / SHIELD_MAX), bh - 2);
    ctx.fillStyle = '#fff';
  }

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  // Aviso temporal al cambiar de skin (se desvanece al final)
  if (skinMsgTimer > 0) {
    ctx.globalAlpha = Math.min(1, skinMsgTimer / 0.5);
    ctx.fillText(`SKIN: ${getSkin().nombre}`, W / 2, 48);
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
