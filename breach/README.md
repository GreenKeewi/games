# Breach

A separate, original, keyboard-only tactical co-op browser game. A compact .io-style start panel gives way to a fullscreen 45×33 building with a wider camera. Find a hostage and escort them to extraction.

## Play immediately

Open [Breach](https://greenkeewi.github.io/games/breach/) in a modern desktop browser, or use **dist/Breach.html** offline. This bundled file contains the whole game and works for solo without a server or network. Multiplayer still needs access to PeerJS and WebRTC; HTTPS hosting is recommended for network play. Regenerate this file after source edits with `npm run build`.

## Run the development version

Requires Node 20+ (no install needed):

```sh
npm run dev
```

Open `http://127.0.0.1:8080/`. Alternatively serve this directory with any static HTTP server. ES modules require HTTP; double-clicking `index.html` as a `file://` URL is not supported. No runtime packages are needed for solo play. Host these files unchanged on a static HTTPS host when ready. The hosted route in the Games collection is https://greenkeewi.github.io/games/breach/.

## Quick start

Press Enter from the briefing to play immediately. Optional planning keys:

- **1** changes west/east insertion.
- **2** changes carbine/compact weapon.
- **3** changes Standard/Training pressure.
- **N** generates a new floor.
- **H** hosts a friend room. **J** focuses the room-code input; type a code and press Enter to join.
- All buttons also support Tab and Enter/Space.

In a mission:

| Key | Action |
| --- | --- |
| WASD | Move independently of aim |
| Arrow keys | Aim in eight directions; combine two arrows for diagonals |
| Space | Fire; mild directional aim assistance keeps keyboard play practical |
| E | Open a nearby door, lead the hostage, or hold near a downed teammate to revive |
| R | Reload; unlimited reserve ammunition |
| Q | Throw one of two flashbangs, stunning nearby visible enemies |
| F | Tell AI squadmate Echo to hold/follow |
| Shift | Walk slowly |
| Escape | Pause solo / show an in-canvas pause message in multiplayer |
| B while paused or after a mission | Return to the start panel |
| H / F1 in game | Toggle extra controls help |
| M | Toggle optional synthesized sound (off by default) |

Find the blue hostage, press E nearby, then lead them back to the green extraction zone. Remain there with the hostage for 1.5 seconds. The hostage follows around opened doors and cover. Every room cleared adds score, but is not required to extract. Training halves incoming damage. Solo includes Echo, an AI teammate who follows and provides cover. Human co-op replaces Echo.

Each operator sees their own occluded view cone. The building's wall and doorway outlines are always visible, but interiors remain pitch black outside the current cone. Furniture, enemies, the hostage and teammates are shown only where visible. The camera follows the local operator with edge-aware bounds. There are no site headers, navigation bars, sidebars or external menus during play, only a compact canvas HUD.

## Co-op

Up to four players. The host creates an eight-character code; friends open the same game and join. Choose loadouts, then the host presses Enter. Late join is supported during active missions. The host owns simulation, enemy AI, shots, doors, health and objective state. Guests send validated controls, not positions or damage.

This follows Skybreak Jets' current architecture: PeerJS 1.5.5 with PeerJS Cloud signaling and public STUN. PeerJS is fetched only when Host/Join is used. A room code is not a private authenticated account: only share it with people you intend to play with. WebRTC peers and network services process ordinary network connection information.

**Network limits:** no TURN relay, Cloudflare backend, dedicated server, host migration, reconnection persistence or anti-cheat system is configured. Restrictive school networks and NATs may block direct WebRTC. The UI times out with an explicit error and solo remains available. Keep the host tab open and active; browser background throttling can slow a hosted game. Multiplayer keeps running while the local pause message is shown. Closing the host ends the room. Cross-device gameplay must be checked on the intended network before relying on it.

See [docs/NETWORK.md](docs/NETWORK.md) for the transport contract and future backend integration notes. No Cloudflare account, Worker, secret or backend was created or changed.

## Verification

```sh
npm test
npm run check
```

- 32 deterministic Node tests pass.
- Generator coverage checks 320 map layouts, reachability through doors and valid spawn clearance.
- Simulation coverage: walls, doors, directional vision, combat/reload, flash-safe control inputs, rescue, path-following/extraction, revive/loss, co-op capacity and detached snapshots.
- Transport uses mock PeerJS tests for handshake, version mismatch, capacity, disconnects, cancellation, timeouts, input validation, replay/rate limits and backpressure.
- Browser QA verified the compact start panel, fullscreen deployment with external controls hidden, keyboard door entry/movement/fire, help/flash/reload, in-canvas pause and return to menu.
- `npm run render-check` verifies black unseen floor/cover pixels, occluded entities, reveal/conceal on door/aim changes, and visible architectural outlines. This developer-only check uses `@napi-rs/canvas` (install dev dependencies); playing the game needs no packages.
- `npm run benchmark` compares the new grid traversal with the previous sampled queries on identical maps. The development environment measured roughly 2–4× faster LOS/raycast queries; this is not an overall frame-rate or hardware claim.
- Live room signaling opened successfully. Instrumented two-tab tests showed both peers completing ICE gathering with zero candidates; no data channel or game handshake opened. This browser/network negotiation blocker means end-to-end P2P gameplay is **not verified**. The Connection details panel now exposes safe lifecycle diagnostics; two separately reproduced handshake edge cases are fixed and regression-tested. No claim is made that it will work through a restricted network.

All visual assets are original code-drawn canvas/SVG. Sound is synthesized locally. No copied game art, analytics, accounts, persistence, monetization or tracking is included. This is a small MVP, not a finished competitive shooter.

## Design update 0.2

The classic .io-game pattern informed the layout: playfield first, a small centered start panel, and minimal in-game HUD. Artwork and branding are original. Paper-io.com currently redirects to Voodoo’s mobile promotion, and Bloble.io was unavailable during research; Diep.io’s visible full-window geometric layout was useful, while its promotional menus were intentionally not reproduced. The game protocol was bumped to BREACH-2 for the larger map; all friends should reload the latest version before joining.
