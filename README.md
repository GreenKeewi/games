# Games

## Current focus

Skybreak Jets is the main, actively developed fighter-jet game. Toronto Taxi and Fire Response remain playable but are no longer in development, with no further updates planned. Cloudliner and Borough Line have been removed from the public catalogue; their repositories, assets, and historical verification records are preserved.


A responsive, keyboard-accessible HTML/CSS hub for GreenKeewi's browser games. Serve this directory with any static server; no build step, account, analytics or backend is required.

The three existing driving/flight catalogue previews are actual gameplay captures. Breach uses an original floor-plan illustration, labelled as such. Source commits, capture methods, runtime hashes, tested behavior and exact Pages deployment jobs are recorded in [verification](verification/README.md). Local browser evidence is distinguished from direct public-origin verification, which is currently blocked by this cloud's proxy. Earlier release evidence is retained as historical material.

Game links open in the same tab. The original 2D Taxi remains separately linked and preserved. Skybreak Jets strike completion and the native menu/link keyboard paths in both 3D taxi copies have dedicated regressions in their source repositories.


## Breach

[Breach](https://greenkeewi.github.io/games/breach/) is a separate keyboard-first tactical rescue game, served directly from `breach/`. It has fast planning, procedural rooms, occluded directional vision, solo play with Echo, and experimental four-player host-authoritative P2P rooms. No Cloudflare backend is configured. Direct WebRTC remains unverified because the cloud QA browser gathered no ICE candidates; see [Breach verification](breach/docs/VERIFICATION.md).

Run `node breach-integration-check.mjs`, then `cd breach && npm test && npm run check`. Breach is static and needs no install or build to serve. Existing game links and development statuses are preserved.
