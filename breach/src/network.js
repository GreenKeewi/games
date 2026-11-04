/** Breach friend rooms. Data-only PeerJS/WebRTC; the host owns the simulation. */
export const PROTOCOL = 'BREACH-1';
export const MAX_PLAYERS = 4;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_BYTES = 60000;
const HIGH_WATER = 131072;
const BLOCKED = 'A direct connection could not open. This network may block WebRTC or need a TURN relay. No TURN relay is configured.';
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const peerId = code => `breach-v1-${code.toLowerCase()}`;
let library;

export function normalizeRoomCode(value) {
  let code = String(value ?? '').trim();
  if (/^https?:\/\//i.test(code)) {
    try { const url = new URL(code); code = new URLSearchParams(url.hash.slice(1)).get('room') || url.searchParams.get('room') || ''; } catch { code = ''; }
  }
  code = code.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new Error('Enter the eight-character room code or the host’s invite link.');
  return code;
}
export function roomInviteLink(code, href = globalThis.location?.href) {
  const url = new URL(href); url.hash = `room=${normalizeRoomCode(code)}`; return url.href;
}
export function sanitizeData(value) {
  let count = 0;
  function copy(v, depth) {
    if (++count > 15000 || depth > 16) throw Error('Packet is too complex.');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.length <= MAX_BYTES) return v;
    if (Array.isArray(v)) return v.map(x => copy(x, depth + 1));
    if (plain(v)) {
      const out = {};
      for (const [key, item] of Object.entries(v)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key) || key.length > 80) throw Error('Unsafe packet key.');
        out[key] = copy(item, depth + 1);
      }
      return out;
    }
    throw Error('Unsupported packet value.');
  }
  try {
    const result = copy(value, 0);
    return new TextEncoder().encode(JSON.stringify(result)).length <= MAX_BYTES ? result : null;
  } catch { return null; }
}
/** Strict client command allowlist; positions, damage and health are never accepted. */
export function validateGuestData(data) {
  if (!plain(data)) return false;
  if (data.type === 'ready') return Object.keys(data).every(k => ['type', 'kit'].includes(k)) && ['carbine', 'compact'].includes(data.kit);
  if (data.type !== 'input' || Object.keys(data).some(k => !['type', 'input'].includes(k)) || !plain(data.input)) return false;
  const axes = ['mx', 'my', 'ax', 'ay'], buttons = ['fire', 'reload', 'interact', 'flash', 'walk'];
  if (Object.keys(data.input).some(k => ![...axes, ...buttons].includes(k))) return false;
  return axes.every(k => Number.isFinite(data.input[k]) && Math.abs(data.input[k]) <= 1) && buttons.every(k => typeof data.input[k] === 'boolean');
}
async function loadPeer() {
  if (!globalThis.RTCPeerConnection) throw new Error('This browser does not support WebRTC multiplayer. Solo play still works.');
  if (globalThis.peerjs?.Peer) return globalThis.peerjs.Peer;
  library ||= import('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js').then(() => {
    if (!globalThis.peerjs?.Peer) throw Error('Missing PeerJS export.');
    return globalThis.peerjs.Peer;
  }).catch(() => { library = null; throw new Error('The multiplayer client could not load. Check your connection and try again. Solo play still works.'); });
  return library;
}
function randomCode() {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), n => ALPHABET[n % ALPHABET.length]).join('');
}
function explain(error) {
  if (error?.type === 'peer-unavailable') return 'Room not found. Check the code and keep the host’s game open.';
  if (error?.type === 'unavailable-id') return 'That room code is already in use. Host again for a fresh code.';
  if (error?.type === 'network' || error?.type === 'server-error') return 'The room signaling service is unavailable. Try again shortly.';
  return error?.message || BLOCKED;
}

export class SquadLink {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.role = 'offline'; this.slot = null; this.code = ''; this.peers = new Map();
    this.peer = null; this.epoch = 0; this.sequence = 0; this.pending = new Set();
    this.timeout = callbacks.timeout ?? 15000; this.diagnostics = []; this.traceStarted = performance.now();
  }
  _trace(event, entry = null) {
    const pc = entry?.conn?.peerConnection, channel = entry?.conn?.dataChannel;
    const item = { at: Math.round(performance.now() - this.traceStarted), event, role: this.role, slot: entry?.slot ?? this.slot, connection: pc?.connectionState || null, ice: pc?.iceConnectionState || null, gathering: pc?.iceGatheringState || null, channel: channel?.readyState || null, localCandidates: (pc?.localDescription?.sdp?.match(/^a=candidate:/gm) || []).length, remoteCandidates: (pc?.remoteDescription?.sdp?.match(/^a=candidate:/gm) || []).length, sent: entry?.sent || 0, received: entry?.received || 0 };
    this.diagnostics.push(item); if (this.diagnostics.length > 40) this.diagnostics.shift();
    this.callbacks.onDiagnostics?.(this.diagnostics.slice());
  }
  get connected() { return this.role === 'host' || (this.role === 'guest' && this.slot !== null); }
  _status(message) { this.callbacks.onStatus?.(message, { role: this.role, slot: this.slot, code: this.code, connected: this.connected, count: this.peers.size + (this.role === 'host' ? 1 : 0) }); }
  _wait(register, message) {
    return new Promise((resolve, reject) => {
      let done = false;
      const end = (error, value) => { if (done) return; done = true; clearTimeout(timer); this.pending.delete(cancel); error ? reject(error) : resolve(value); };
      const cancel = () => end(new Error('Connection cancelled.'));
      const timer = setTimeout(() => end(new Error(message)), this.timeout);
      this.pending.add(cancel); register(end);
    });
  }
  async _open(id, epoch) {
    const Peer = this.callbacks.peerFactory || await loadPeer();
    if (epoch !== this.epoch) throw new Error('Connection cancelled.');
    const peer = new Peer(id, { debug: 0, config: { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] } });
    this.peer = peer; this._trace('signaling-created');
    peer.on('connection', conn => { this._trace('incoming-connection');
      if (epoch !== this.epoch || this.role !== 'host' || this.peers.size >= MAX_PLAYERS - 1) {
        conn.on('open', () => { try { conn.send(JSON.stringify({ v: PROTOCOL, kind: 'reject', reason: 'Room full or unavailable.' })); } catch {} setTimeout(() => conn.close(), 50); });
        setTimeout(() => conn.close(), this.timeout); return;
      }
      const slot = [1, 2, 3].find(n => !this.peers.has(n));
      this._attach(conn, slot, true, epoch);
    });
    peer.on('disconnected', () => { if (epoch === this.epoch) this._trace('signaling-disconnected'); if (epoch === this.epoch) this._status('Room signaling disconnected. Existing players may continue; reopen the room to admit new players.'); });
    peer.on('error', error => { if (epoch === this.epoch) this._trace(`signaling-error:${error?.type || 'unknown'}`); if (epoch === this.epoch) this._status(explain(error)); });
    await this._wait(end => { peer.on('open', () => { if (epoch === this.epoch) this._trace('signaling-open'); end(null); }); peer.on('error', error => end(new Error(explain(error)))); }, 'The room signaling service did not respond. Try again.');
    return peer;
  }
  async host() {
    this.close(); this.diagnostics = []; this.traceStarted = performance.now(); const epoch = this.epoch;
    this.role = 'host'; this.slot = 0; this.code = randomCode(); this._status('Opening friend room…');
    try { await this._open(peerId(this.code), epoch); if (epoch !== this.epoch) throw new Error('Connection cancelled.'); this._status(`Room ${this.code} open. Share this code with up to three friends.`); return this.code; }
    catch (error) { if (epoch === this.epoch) { this.close(); this._status(explain(error)); } throw error; }
  }
  async join(value) {
    const code = normalizeRoomCode(value);
    this.close(); this.diagnostics = []; this.traceStarted = performance.now(); const epoch = this.epoch;
    this.role = 'guest'; this.code = code; this._status('Connecting to room…');
    try {
      const peer = await this._open(undefined, epoch);
      if (epoch !== this.epoch) throw new Error('Connection cancelled.');
      const conn = peer.connect(peerId(code), { reliable: true, serialization: 'raw', metadata: { game: PROTOCOL } });
      const slot = await this._wait(end => { this._attach(conn, 0, false, epoch, end); peer.on('error', error => end(new Error(explain(error)))); }, BLOCKED);
      this._status(`Connected as operator ${slot + 1}.`); return slot;
    } catch (error) { if (epoch === this.epoch) { this.close(); this._status(explain(error)); } throw error; }
  }
  _attach(conn, slot, hosting, epoch, end = () => {}) {
    const entry = { conn, slot, ready: false, lastSeq: -1, tokens: 90, at: performance.now(), sent: 0, received: 0 };
    this._trace('peer-attached', entry);
    const pc = conn.peerConnection;
    if (pc?.addEventListener) {
      for (const event of ['connectionstatechange', 'iceconnectionstatechange', 'icegatheringstatechange']) pc.addEventListener(event, () => { if (epoch === this.epoch) this._trace(event, entry); });
      pc.addEventListener('icecandidate', e => { if (epoch === this.epoch) this._trace(e.candidate ? `candidate:${e.candidate.type || 'unknown'}` : 'candidate:complete', entry); });
      pc.addEventListener('icecandidateerror', e => { if (epoch === this.epoch) this._trace(`candidate-error:${e.errorCode || 'unknown'}`, entry); });
    }
    this.peers.set(slot, entry);
    const current = () => epoch === this.epoch && this.peers.get(slot) === entry;
    const drop = reason => {
      if (!current()) return;
      this._trace('peer-dropped', entry); clearTimeout(entry.timer); this.peers.delete(slot); conn.close();
      end(new Error(reason));
      if (!hosting) { this.slot = null; this.role = 'offline'; this.peer?.destroy(); this.peer = null; }
      this.callbacks.onLeave?.(slot); this._status(reason);
    };
    entry.timer = setTimeout(() => drop('Peer handshake timed out. ' + BLOCKED), this.timeout);
    let openHandled = false;
    const opened = () => {
      if (openHandled) return; openHandled = true;
      if (!current()) { conn.close(); return; }
      this._trace('channel-open', entry);
      if (!hosting && !this._raw(entry, { v: PROTOCOL, kind: 'hello' })) drop('The game hello packet could not be sent. Rejoin the room.');
    };
    conn.on('open', opened);
    conn.on('data', raw => { entry.received++; if (!entry.ready) this._trace('handshake-received', entry);
      if (!current()) return;
      if (typeof raw !== 'string' || raw.length > MAX_BYTES) return;
      let packet; try { packet = sanitizeData(JSON.parse(raw)); } catch { return; }
      if (!plain(packet)) return;
      if (packet.v !== PROTOCOL) { drop('Different game version. Reload Breach on both devices.'); return; }
      if (packet.kind === 'reject' && !hosting) { drop('Room full or unavailable.'); return; }
      if (!entry.ready) {
        if (hosting && packet.kind === 'hello') {
          if (!this._raw(entry, { v: PROTOCOL, kind: 'welcome', slot })) { drop('The game welcome packet could not be sent. Rejoin the room.'); return; }
          entry.ready = true; clearTimeout(entry.timer);
          this._trace('handshake-complete', entry); this.callbacks.onPeer?.(slot); this._status(`Operator ${slot + 1} joined.`);
        } else if (!hosting && packet.kind === 'welcome' && [1, 2, 3].includes(packet.slot)) {
          entry.ready = true; clearTimeout(entry.timer); this.slot = packet.slot; end(null, this.slot); this._trace('handshake-complete', entry); this.callbacks.onPeer?.(0);
        }
        return;
      }
      if (packet.kind !== 'data' || !Number.isSafeInteger(packet.seq) || packet.seq < 0 || packet.seq <= entry.lastSeq || !plain(packet.data)) return;
      // Connection identity, not a client-supplied slot, determines the operator.
      if (hosting && !validateGuestData(packet.data)) return;
      const now = performance.now(); entry.tokens = Math.min(90, entry.tokens + (now - entry.at) * .09); entry.at = now;
      if (entry.tokens < 1) return;
      entry.tokens--; entry.lastSeq = packet.seq;
      if (hosting && this.callbacks.validateInput && !this.callbacks.validateInput(packet.data)) return;
      this.callbacks.onData?.(packet.data, slot);
    });
    conn.on('close', () => drop(hosting ? `Operator ${slot + 1} disconnected.` : 'The host disconnected. Return to solo or join a new room.'));
    conn.on('error', error => drop(explain(error)));
    if (conn.open) queueMicrotask(opened);
  }
  _raw(entry, packet) {
    if (!entry.conn.open || entry.conn.dataChannel?.bufferedAmount > HIGH_WATER) return false;
    const safe = sanitizeData(packet); if (!safe) return false;
    try { entry.conn.send(JSON.stringify(safe)); entry.sent++; if (!entry.ready) this._trace('handshake-sent', entry); return true; } catch { return false; }
  }
  send(data, slot = 0) {
    if (!plain(data) || (this.role === 'guest' && !validateGuestData(data))) return false;
    const entry = this.peers.get(slot);
    return !!entry?.ready && this._raw(entry, { v: PROTOCOL, kind: 'data', seq: ++this.sequence, data });
  }
  broadcast(data) {
    if (this.role !== 'host') return 0;
    let count = 0; for (const slot of this.peers.keys()) if (this.send(data, slot)) count++;
    return count;
  }
  close() {
    this.epoch++;
    for (const cancel of this.pending) cancel();
    for (const entry of this.peers.values()) { clearTimeout(entry.timer); entry.conn.close(); }
    this.peers.clear(); this.peer?.destroy(); this.peer = null;
    this.role = 'offline'; this.slot = null; this.code = ''; this.sequence = 0;
  }
}
