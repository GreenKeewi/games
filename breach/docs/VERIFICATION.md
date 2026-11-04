# Breach MVP verification

Date: 2026-11-04. The initial standalone MVP was built in an isolated directory. This copy is integrated into the Games repository; see ../../verification/breach-20261104.md. No changes to Skybreak Jets or Cloudflare.

## Passed
- `npm test`: all 27 simulation and transport tests pass.
- `npm run check`: four production JavaScript modules parse.
- `npm run build`: emits a standalone game at `dist/Breach.html`; bundled JavaScript parses.
- Generated map reachability, objective accessibility and actor clearance across 320 seeded layouts.
- Physics and line of sight, door blocking and opening, directional view, normalized keyboard movement, combat/rate/ammo/reloading, down/revive/loss, objective following and successful extraction.
- PeerJS mock protocol: four-player capacity, identity, validation, version mismatch, closing, cancellation, timeouts, rate/replay limits, backpressure, and malformed packets.
- Browser: standalone bundled HTML also enters a mission, opens a door, moves, fires and pauses.
- Browser: briefing layout, short planning, keyboard shortcuts and focused-button Enter, mission entry, opening first door, held movement, rapid aim/fire/reload/flash taps, health/ammo updates, cleared room count, Echo hold/follow, pause/resume and return to briefing.
- Browser: camera-follow view, occluded flashlight cone and dim remembered architecture visually inspected.
- Real PeerJS public signaling: host obtained an eight-character room code.

## Not verified / limitations
- Second-tab direct WebRTC connection timed out in the cloud browser. This is a failed connection attempt, not proof of successful multiplayer. The UI exposed a clear error and returned to solo-ready state. No deployment/configuration was changed to bypass the failure.
- Cross-device/network P2P gameplay, four-real-device gameplay, NAT traversal and school-network compatibility remain unverified.
- Full hostage extraction is covered by deterministic simulation tests, not a complete manual browser raid.
- No mobile touch controls: the user requested keyboard-only play. The menu adapts to smaller screens; play needs a keyboard.
- Browser background throttling can slow a host; there is no dedicated server, TURN relay, persistence or host migration.

Original procedural graphics, SVG mark and synthesized audio. No third-party art.

## v0.1.1 network follow-up

Instrumented browser runs localized the repeated timeout before the game handshake: both peers opened signaling, the host received an offer, and ICE gathering completed with zero candidates. Neither data channel opened, with zero handshake packets sent. This points to the browser/network negotiation layer; the specific environment restriction is not known. No policies were bypassed.

Fixed two separately reproducible lifecycle edge cases: an already-open connection now sends hello exactly once; failed hello/welcome sends clean up without falsely admitting a player. Regression and diagnostic privacy tests were added. Real end-to-end P2P remains unverified.
