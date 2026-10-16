# Browser game verification

All work was built and tested in cloud environments. The disconnected desktop and unrelated bio repository were not used. The existing taxi repositories were preserved.

## Reproducible tests

Each new game repository contains its production simulation and test suite. Run `npm test` from its directory. The runtime is static HTML/CSS/JavaScript with vendored Three.js; no build service or game backend is required.

| Game | Simulation and protocol unit tests |
| --- | ---: |
| Skybreak | 16 |
| Cloudliner | 13 |
| Borough Line | 9 |

## Actual keyboard play

These checks used real browser keyboard events and normal animation frames, without editing aircraft/train positions or advancing simulation time:

- Fighter dogfight victory, passive defeat, bomber strike and escape, and defender interception. [Combat report](reports/fighter-real-time.json), [defeat/interception](reports/fighter-defeat-and-interception-real-time.json).
- Fighter manual takeoff, G route assist, all five gates, approach, touchdown and full stop in 137.7 seconds wall time / 137.5 seconds simulation time; zero recoveries and browser errors. [Flight report](reports/fighter-free-flight-real-time.json).
- Passenger complete gate-to-gate autopilot flight in 281.9 seconds wall time with zero recoveries/errors. Independent manual approach, touchdown and braking used real keyboard controls with autopilot off; later gate taxi verification used accelerated production physics. [Real-time full flight](reports/passenger-real-time.json), [manual landing and interface](reports/passenger-manual-landing.json).
- Subway boarding, manual acceleration, braking and platform alignment, correct-side doors, and departure. Additional adverse cases deliberately set up red-signal and missed-stop situations, then verified the production response. A full assisted service was also verified with accelerated production physics. [Manual service](reports/subway-manual-service.json), [adverse cases](reports/subway-adverse-cases.json), [real-time departure](reports/subway-real-time.json).

Keyboard menus and focus visibility were checked at 1024 × 600 and larger sizes. The hub has no horizontal overflow from 320 px through desktop widths. [Responsive hub report](reports/hub-responsive.json).

## Multiplayer scope

[Protocol report](reports/network-six-context-protocol.json) · [Published rendered-game report](reports/network-two-rendered-live.json) · [Network summary](reports/network-summary.json)

Native WebRTC tests connected one host and five guests in six isolated browser contexts on a single cloud machine. They exercised complete manual ICE offer/answer exchange with `iceServers: []`, reliable controls, unordered zero-retransmit realtime data, connection-derived identity, input validation, replay/rate/cooldown checks, interpolation, backpressure, malformed pairing, capacity, paused joins, disconnect and fresh-code reconnect.

The first cloud browser's managed policy disabled non-proxied UDP. Its friendly diagnostic was tested without altering that policy. Native connectivity tests ran in a second authorized cloud executor that permits direct UDP.

The complete rendered-game suite passed eight groups with two real WebGL document peers, including full keyboard code exchange, local aircraft controls and HUD, host authority, paused reconnect, result propagation, restart, return and channel closure. It passed again on the published fighter URL. The 1 GB cloud VM required a shared browser profile, smaller drawing buffers, antialiasing off, and a 200 ms test frame scheduler. This is functional integration evidence, not a frame-rate benchmark. Six simultaneous rendered games exceeded that VM’s memory; six native protocol contexts were validated separately.

Separate physical devices on Wi-Fi have **not** been tested. Guest Wi-Fi isolation, mDNS restrictions, firewall rules and managed-browser policies can prevent direct LAN pairing. The game does not promise automatic Wi-Fi discovery, STUN, or TURN fallback. No microphone or camera is requested.

## Images

Hub previews are actual gameplay captures. The fighter and passenger title screens use the original generated menu illustrations supplied for this task, visibly labeled as illustrations. They are not presented as gameplay screenshots.

All three games were opened and played at their public GitHub Pages origins after deployment. Published fighter pairing/gameplay checks passed; passenger taxi, cockpit, pause/resume and keyboard All games navigation passed; subway boarding, departure, pause/resume and camera switching passed. The final hub also passed actual Tab/Enter travel into all three new games and back, with all four Play links ready, all previews loaded, and no horizontal overflow at 390 px. [Live hub report](reports/hub-live.json). Exact repository file hashes and successful game Pages commit IDs are recorded in `release.json`.
