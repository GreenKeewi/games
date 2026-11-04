# Breach friend-room networking

## What works now

Breach uses the same basic friend-room architecture as Skybreak Jets: PeerJS room-code signaling, data-only WebRTC connections, public Cloudflare STUN, and a host-authoritative simulation. It does not connect to Jets rooms, share their match state, or use a dedicated game server. The protocol namespace is `BREACH-1` and room peer IDs start with `breach-v1-`.

The host occupies slot 0. Up to three guests occupy slots 1–3. Guests connect only to the host, not to each other. The host advances AI, collision, objectives, health and ammunition; clients send controls and render host snapshots. Anyone with the code can join an available seat, so share codes privately. There are no accounts, passwords, persistent identities or host migration. Closing the host ends the room; a disconnected guest rejoins as a newly allocated seat.

PeerJS 1.5.5 loads lazily from the npm CDN only when hosting/joining. Solo does not require that library or signaling. PeerJS Cloud provides signaling, and `stun:stun.cloudflare.com:3478` helps direct peers discover their routes. These services receive the connection metadata necessary to establish a room; peers may learn network address information via WebRTC. This is data-only: it requests no microphone or camera permission.

**No TURN relay is configured.** Some corporate, school, mobile and restrictive NAT networks will fail to connect. The UI must show the returned error and preserve solo. This first version does not implement Jets' advanced manual pairing fallback. It also uses a single ordered/reliable channel rather than Jets' separate realtime channel, so severe packet loss may delay snapshots.

## Application API

```js
import { SquadLink, normalizeRoomCode, roomInviteLink } from './src/network.js';
const link = new SquadLink({
  onStatus(message, state) { /* plain UI text; role, slot, code, connected, count */ },
  onPeer(slot) { /* host: newly ready guest; guest: host slot 0 */ },
  onData(data, slot) { /* sender slot is derived from its connection */ },
  onLeave(slot) { /* clear controls and remove guest, or return to menu */ },
});
const code = await link.host(); // host slot 0
// On another device: const slot = await link.join(code);
link.send({ type: 'input', input: {
  mx: 0, my: 0, ax: 1, ay: 0,
  fire: false, reload: false, interact: false, flash: false, walk: false,
}}); // guest -> host (default destination slot 0)
link.send({ type: 'ready', kit: 'carbine' });
// Host -> individual guest or all guests:
link.send({ type: 'lobby', plan, players }, 1);
link.broadcast({ type: 'state', game: snapshot });
link.close();
```

`role` is `offline`, `host`, or `guest`; `slot` is `null` before guest admission. `code` is the normalized eight-character code. `peers` is a Map containing transport entries, including handshakes in progress; only entries with `ready === true` should count as admitted players. `send` returns a boolean; `broadcast` returns the number of successful sends. Unready, congested, closed or oversized sends fail without throwing. Hosting/joining reject with user-readable errors after cancellation, room rejection, incompatible protocol, service errors or a 15-second timeout. Calling `close()` intentionally does not fire local leave callbacks. Remote close does.

The host should send the current lobby or initial game state from `onPeer`; subsequent host packets arrive after the welcome handshake. Treat `start` and `menu` as host-only commands. If a one-time control packet cannot be sent, resend it or use the next complete snapshot to recover. Clients must not step the authoritative simulation.

### Input validation and game integration

Guests may send only:

- `{type:'input',input:{mx,my,ax,ay,fire,reload,interact,flash,walk}}`: all four axes must be finite numbers in [-1,1], and all five buttons must be booleans. Unknown keys are rejected.
- `{type:'ready',kit:'carbine'|'compact'}`.

Positions, player IDs, health, damage, scores and arbitrary guest commands are not accepted. Optionally provide `validateInput(data)` for additional application constraints. The name is historical: it receives both approved guest command types. A false return rejects the command.

The game must normalize diagonal movement, enforce action cooldowns and interpret fire/reload/flash appropriately. It must expire stale held controls (recommended 250 ms), send neutral controls on blur/menu, and clear controls on leave. The transport validates syntax and connection identity, not simulation rules. Limit guest inputs to about 20–30 Hz and host full snapshots to 10–15 Hz. A room does not authenticate a trusted host; do not put private information in snapshots.

All data is bounded JSON: 60,000 UTF-8 bytes, finite numbers, depth <=16, a bounded node count, no dangerous object keys. The handshake checks the game/protocol. Sequence numbers reject replays and each connection accepts up to 90 application messages/second with a bounded initial burst. Buffered channels above 128 KiB drop new sends to avoid unlimited queues. Full-state snapshots should remain well below the byte limit.

## Future Cloudflare backend (not configured or deployed)

There are no Cloudflare credentials, paid resources, Worker deployments, backend endpoints or server requests in this implementation. The user can set up the backend later. Jets already has a separate prepared Worker/Durable Object backend, but its documentation states that dedicated endpoints are empty until deployment; the existence of that code is not proof of a live service.

For Breach, keep `game.js` independent of the DOM and transport. A future Worker with one Durable Object per bounded room can run the same simulation and become the authority, replacing browser-host ownership. Keep the same application concepts (validated controls in, complete snapshots out), but use a separate versioned WebSocket adapter, origin restrictions, size/rate limits, seat admission, stale-input expiry and empty-room cleanup. Never expose Cloudflare API tokens in the client or repository. Keep the server URL empty and any dedicated-server UI disabled until a real endpoint has been deployed and verified. A Worker does not by itself supply TURN relay service for existing P2P rooms.

## Verification

Run `node --test tests/network.test.js` from the Breach folder. The tests use an in-memory PeerJS-compatible mock, not public signaling or real WebRTC. They cover normalization, strict validation, handshakes, capacity, seat reuse, authority direction, replay rejection, disconnect, cancellation and congestion. These tests establish protocol and lifecycle behavior; they do **not** establish cross-network connectivity or latency.

Before releasing, test two independent browser contexts with the real library and two physical devices on separate networks: host/join, fourth-player capacity, unknown code, host closure, guest rejoin, background-tab input expiry, denied CDN/signaling, and a restrictive NAT. Verify solo still works when every remote service is unavailable.

Architecture references inspected November 4, 2026:
- https://github.com/GreenKeewi/jets/blob/main/network.js
- https://github.com/GreenKeewi/jets/blob/main/multiplayer-backend.md

## Connection diagnosis (v0.1.1)

The briefing's **Connection details** panel records lifecycle state, candidate counts and packet counts. It never records raw SDP, IP addresses, candidate addresses or remote peer IDs. This distinguishes signaling, WebRTC transport opening, and the game handshake.

In the cloud browser retest, signaling opened on both peers and the host received the guest offer. Both peers completed ICE gathering with zero local and remote candidates. ICE stayed `new`, the data channel never opened, and no handshake packets were sent. This locates the observed failure below the game protocol, in browser/network WebRTC negotiation. The precise environment restriction is not established; no security or network policy was bypassed.

Separately, two defensive lifecycle problems were reproduced and fixed: attaching an already-open connection now sends hello exactly once, and failed hello/welcome sends reject and clean up instead of admitting a peer. These fixes are verified with mock regression tests; they are not claimed to cure the observed zero-candidate browser failure.
