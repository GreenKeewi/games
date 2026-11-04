# Breach

A separate, original, keyboard-only tactical co-op browser game. Plan fast, clear a procedurally generated single-floor building, find a hostage and escort them to extraction.

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
| Escape | Pause solo / open local panel in multiplayer |
| M | Toggle optional synthesized sound (off by default) |

Find the blue hostage, press E nearby, then lead them back to the green extraction zone. Remain there with the hostage for 1.5 seconds. The hostage follows around opened doors and cover. Every room cleared adds score, but is not required to extract. Training halves incoming damage. Solo includes Echo, an AI teammate who follows and provides cover. Human co-op replaces Echo.

Each operator sees their own occluded view cone. Previously seen architecture stays dim; enemy positions do not persist in fog. Squad markers are shared over radio. The camera follows the local operator.

## Co-op

Up to four players. The host creates an eight-character code; friends open the same game and join. Choose loadouts, then the host presses Enter. Late join is supported during active missions. The host owns simulation, enemy AI, shots, doors, health and objective state. Guests send validated controls, not positions or damage.

This follows Skybreak Jets' current architecture: PeerJS 1.5.5 with PeerJS Cloud signaling and public STUN. PeerJS is fetched only when Host/Join is used. A room code is not a private authenticated account: only share it with people you intend to play with. WebRTC peers and network services process ordinary network connection information.

**Network limits:** no TURN relay, Cloudflare backend, dedicated server, host migration, reconnection persistence or anti-cheat system is configured. Restrictive school networks and NATs may block direct WebRTC. The UI times out with an explicit error and solo remains available. Keep the host tab open and active; browser background throttling can slow a hosted game. Multiplayer does not pause while the in-game panel is open. Closing the host ends the room. Cross-device gameplay must be checked on the intended network before relying on it.

See [docs/NETWORK.md](docs/NETWORK.md) for the transport contract and future backend integration notes. No Cloudflare account, Worker, secret or backend was created or changed.

## Verification

```sh
npm test
npm run check
```

- 27 deterministic Node tests pass.
- Generator coverage checks 320 map layouts, reachability through doors and valid spawn clearance.
- Simulation coverage: walls, doors, directional vision, combat/reload, flash-safe control inputs, rescue, path-following/extraction, revive/loss, co-op capacity and detached snapshots.
- Transport uses mock PeerJS tests for handshake, version mismatch, capacity, disconnects, cancellation, timeouts, input validation, replay/rate limits and backpressure.
- Browser QA verified the actual UI, keyboard deployment, door entry, movement, aiming, fire/ammo/damage, room clearing, flashbang/reload taps, AI hold, and pause/resume.
- Live room signaling opened successfully. Instrumented two-tab tests showed both peers completing ICE gathering with zero candidates; no data channel or game handshake opened. This browser/network negotiation blocker means end-to-end P2P gameplay is **not verified**. The Connection details panel now exposes safe lifecycle diagnostics; two separately reproduced handshake edge cases are fixed and regression-tested. No claim is made that it will work through a restricted network.

All visual assets are original code-drawn canvas/SVG. Sound is synthesized locally. No copied game art, analytics, accounts, persistence, monetization or tracking is included. This is a small MVP, not a finished competitive shooter.
