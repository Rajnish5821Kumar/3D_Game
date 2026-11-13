# Lumen Run

Lumen Run is a small, original 3D browser game about a tiny astronaut collecting
ten fallen lights on a quiet moon. Find the glowing shards, steer clear of the
sleepy sentries, and bring all ten back to the home beacon before the night
ends.

## Play

```bash
npm install
npm run dev
```

Open the local address printed by Vite. To create and serve a production build:

```bash
npm run build
npm run preview
```

## Controls

- **W A S D** or **arrow keys** to move.
- **Space** to dash. A dash recharges after a short cooldown.
- On touch screens, use the on-screen arrows and dash button.
- Collect all ten light shards, then return to the glowing beacon at the center.
- A shard at every fifth pickup gives you five bonus seconds.
- Avoid the floating sentries; you have three hearts.

## Built with

- Three.js for the 3D world, procedural geometry, lighting, and animation.
- Vite for the local development server and production build.
- Native JavaScript modules; the art and sound effects are generated in code.

This project was created with AI assistance at the repository owner's request.
The commit history begins with the actual creation of this project and is not
intended to represent earlier independent development.

## Tests

```bash
npm test
```
