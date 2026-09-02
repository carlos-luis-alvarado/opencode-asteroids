# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |
| `Shift`   | Escudo (mantener presionado) |
| `C`       | Cambiar skin de la nave |

## Puntuación

| Asteroide      | Puntos |
| -------------- | ------ |
| Grande         | 20     |
| Mediano        | 50     |
| Pequeño        | 100    |
| Estrella fugaz | 250    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- Power-up **Velocidad**: los asteroides destruidos pueden soltar un rayo cian que duplica el impulso de la nave durante 5 s
- Power-up **Triple disparo**: los asteroides destruidos pueden soltar una cápsula magenta que hace que cada disparo lance 3 balas en línea recta durante 5 s
- **Estrella fugaz**: asteroide especial que aparece cada pocos segundos desde un borde de la pantalla, se mueve mucho más rápido que los normales, se desvanece sola a los 6 s y da 250 puntos al destruirla (no se parte en fragmentos)
- **Skins de nave**: cambia la silueta y el color de la nave con la tecla `C` (disponible en cualquier momento, también en game over); la elección se guarda en el navegador y se recuerda entre sesiones
- **Escudo de energía**: mantén `Shift` para proyectar un aro cian alrededor de la nave que destruye los asteroides que lo tocan (sin sumar puntos) a cambio de energía. La reserva dura 2.5 s, cada impacto bloqueado cuesta 0.75 s extra y se recarga al soltar la tecla (5 s para llenarla); al agotarse queda bloqueada hasta recuperar 0.6 s
