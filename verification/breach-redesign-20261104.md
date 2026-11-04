# Breach redesign, 2026-11-04

Breach 0.2 replaces the crowded tactical dashboard with an original .io-style centered start panel and full-window gameplay. The game route stays https://greenkeewi.github.io/games/breach/.

## Scope

- Clean start panel, large Play button, optional friends and quick-plan controls.
- No site navigation, sidebar or external menu during play. Status, pause and optional help are drawn on the canvas.
- Wider camera and 45×33 single-floor map. Known wall/door outlines remain visible while unseen interiors, furniture and actors stay black.
- Additional room-specific cover, original actor details, cached map layers, indexed doors and conservative grid-based visibility.
- Existing keyboard controls, solo squadmate, objectives and experimental P2P retained. Protocol version changed for the larger map.

## Evidence before publication

All 32 tests, production syntax checks, standalone build, offscreen fog assertions and integration checks pass. Generator coverage includes 320 map configurations. The original three Games cards are unchanged. Native browser keyboard play and full-window rendering were inspected. See [detailed checks](../breach/docs/VERIFICATION.md).

The initial Breach deployment at commit `68075fabc167ed14c8bf73213052fa07f61460ae` completed Pages run [41848515447](https://github.com/GreenKeewi/games/actions/runs/41848515447). Its actual public game and collection routes loaded and worked. This is historical evidence, not a 0.2 deployment pass. The redesign deployment is checked after publication.

## Limits

End-to-end P2P remains unverified because previous cloud-browser negotiation produced zero ICE candidates. No backend, Cloudflare, TURN or browser security setting was changed. No overall FPS or school-hardware claim is made. LOS/raycast microbenchmarks measure the queries only.

## References

The general classic .io-game pattern inspired the layout, not copied artwork or branding. Diep.io’s visible full-window geometric playfield was inspected. Bloble.io was unavailable; Paper-io.com redirected to Voodoo’s mobile promotional site. Commercial promotional clutter was deliberately omitted.
