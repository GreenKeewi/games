# Current browser game verification

[Release manifest](release.json) · [Runtime source hashes](source-hashes.json) · [Exact game Pages build/deploy jobs](reports/current/pages-game-jobs.json) · [Final regression results](reports/current/final-regressions.json) · [Responsive hub and keyboard checks](reports/current/hub-final-local.json)

This record separates three facts: the exact public repository commits, local cloud-browser gameplay, and successful Pages build/deployment jobs. Direct public HTTPS game loads from this cloud are currently blocked by its proxy (`CONNECT tunnel failed, response 403`; Chromium `net::ERR_TUNNEL_CONNECTION_FAILED`). No current live-origin gameplay pass is claimed. The [navigation failures](reports/current/public-load-check.json) identify all six URLs.

## Current checks

| Game | Simulation/protocol regressions | Normal-animation browser evidence |
| --- | ---: | --- |
| Skybreak | 48 passed | [Original-seed strike regression](reports/current/jets-strike-regression.json): defender eliminated at 8.3s without premature success; real bombing and escape finish at 46.35s. [Northpoint preview departure](reports/current/jets-preview-native-route.json) uses native keyboard and route assist. |
| Cloudliner | 22 passed | [All three gate-to-gate flights](reports/current/flight-qa.json), zero recoveries, native keyboard/AP, Clear coast; [pause, manual override and restart](reports/current/controls-confirm.json). Runtime unchanged by its validation-only release. |
| Borough Line | 18 passed | [Full manual ten-stop service](reports/current/subway-qa.json): all three signals, 1,500 points, 100% comfort, zero penalties; 719.98 wall seconds. No state writes, assist or stepping. Runtime unchanged by its README-only release. |
| Toronto Taxi and 3D mirror | All relevant engine suites passed | [Taxi native navigation](reports/current/taxi-keyboard-navigation.json), [mirror native navigation](reports/current/mirror-keyboard-navigation.json), [fresh normal-traffic pickup](reports/current/taxi-preview-native-pickup.json), and [stopped save/reload](reports/current/controls-confirm.json). |

The strike regression requires bombing **and** escape even after all defenders are eliminated. Native menu/link focus now works in both taxi copies while the arrow menus and driving-time map controls remain available. Browser link activation requests the original 2D URL; its live load remains proxy-blocked. The original 2D game/root files and unrelated bio checkout were preserved.

Taxi region, physics, route and continuous-drive suites passed again for the release. Controlled physical regression covers all six directed intercity trips for taxi and bus, with zero collisions, plus both bus passenger loops. Those tests disable other traffic and begin from controlled placements. The [initial browser fare attempt](reports/current/taxi-qa.json) collected its passenger but became stuck after collisions on a ramp. The [separate highway fixture](reports/current/taxi-highway-fixture.json) explicitly places the car on the highway, then crosses the three city regions with normal keyboard driving and traffic; it had one traffic collision. Neither is evidence of an uninterrupted completed browser intercity fare.

## Gameplay previews

All four card previews are actual local gameplay captures, with no image-content transformation. The release manifest records their source commit, SHA-256, capture method and supporting report. The fighter and taxi previews were newly captured after their fixes; the airline highland approach and subway yard preview come from the completed independent runs against runtime bytes unchanged by the documentation updates. The generated fighter/passenger title illustrations remain labelled as illustrations in their games.

## Limits and history

Cloud Chromium uses software WebGL. No physical Chromebook frame rate, separate-device Wi-Fi compatibility, hardware-speaker listening, or human assessment is claimed. Current protocol tests do not replace physical multiplayer validation.

The [03:18 release](history/release-20261016-0318.json) and its [source hashes](history/source-hashes-20261016-0318.json) are retained as historical evidence. Reports directly under `reports/` outside `current/` belong to those earlier revisions. Their old test counts, live-origin passes and multiplayer results must not be applied to the current release. The current manifest supersedes them and explicitly records the present proxy limitation.
