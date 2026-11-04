import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createGame, addPlayer, tick as advanceGame, snapshot } from '../src/game.js';
import { SquadLink, PROTOCOL, normalizeRoomCode, roomInviteLink, sanitizeData, validateGuestData } from '../src/network.js';

class MockConnection extends EventEmitter {
  constructor() { super(); this.open = false; this.dataChannel = { bufferedAmount: 0 }; }
  send(raw) { if (!this.open) throw Error('closed'); queueMicrotask(() => { if (this.other.open) this.other.emit('data', raw); }); }
  close() { if (!this.open) return; this.open = false; this.emit('close'); if (this.other.open) { this.other.open = false; this.other.emit('close'); } }
}
class MockPeer extends EventEmitter {
  static peers = new Map();
  static next = 0;
  constructor(id) {
    super(); this.id = id || `guest-${++MockPeer.next}`; this.connections = [];
    MockPeer.peers.set(this.id, this); queueMicrotask(() => this.emit('open', this.id));
  }
  connect(id) {
    const a = new MockConnection(), b = new MockConnection(); a.other = b; b.other = a; this.connections.push(a);
    queueMicrotask(() => {
      const remote = MockPeer.peers.get(id);
      if (!remote) { this.emit('error', { type: 'peer-unavailable' }); return; }
      remote.connections.push(b); remote.emit('connection', b);
      a.open = b.open = true; b.emit('open'); a.emit('open');
    });
    return a;
  }
  destroy() { MockPeer.peers.delete(this.id); for (const conn of this.connections) conn.close(); }
}
const input = (mx = 1) => ({ type: 'input', input: { mx, my: 0, ax: 1, ay: 0, fire: false, reload: false, interact: false, flash: false, walk: false } });
const tick = () => new Promise(resolve => setImmediate(resolve));
function link(callbacks = {}) { return new SquadLink({ peerFactory: MockPeer, timeout: 100, ...callbacks }); }

test('room codes and invite links normalize safely', () => {
  assert.equal(normalizeRoomCode('abcd-2345'), 'ABCD2345');
  assert.equal(normalizeRoomCode('https://example.org/breach/#room=ABCD2345'), 'ABCD2345');
  assert.equal(roomInviteLink('ABCD2345', 'https://example.org/breach/'), 'https://example.org/breach/#room=ABCD2345');
  for (const bad of ['IOLO0000', 'ABCD', '<script>']) assert.throws(() => normalizeRoomCode(bad));
});

test('sanitizer rejects non-finite, oversized, dangerous and excessively nested values', () => {
  assert.deepEqual(sanitizeData({ players: [{ x: 2.5, alive: true }] }), { players: [{ x: 2.5, alive: true }] });
  for (const bad of [{ x: NaN }, { x: Infinity }, { fn() {} }, JSON.parse('{"__proto__":{}}'), { x: 'x'.repeat(60001) }]) assert.equal(sanitizeData(bad), null);
  let nested = {}; for (let i = 0; i < 20; i++) nested = { nested }; assert.equal(sanitizeData(nested), null);
});

test('host and guest handshake; input only upward, snapshots downward, identity comes from connection', async () => {
  const received = [], snapshots = [], joins = [], leaves = [];
  const host = link({ onData: (data, slot) => received.push({ data, slot }), onPeer: slot => joins.push(slot), onLeave: slot => leaves.push(slot) });
  const guest = link({ onData: (data, slot) => snapshots.push({ data, slot }) });
  try {
    const code = await host.host(); assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/); assert.equal(await guest.join(code), 1);
    assert.equal(host.slot, 0); assert.equal(guest.slot, 1); assert.deepEqual(joins, [1]);
    assert.equal(guest.send(input()), true);
    assert.equal(guest.send({ type: 'snapshot', health: 999 }), false);
    assert.equal(host.broadcast({ type: 'snapshot', tick: 2 }), 1);
    await tick(); assert.equal(received[0].slot, 1); assert.equal(snapshots[0].slot, 0);
    const entry = host.peers.get(1);
    entry.conn.emit('data', JSON.stringify({ v: PROTOCOL, kind: 'data', seq: 1, data: { type: 'input' } }));
    assert.equal(received.length, 1, 'replayed packet ignored');
    guest.close(); assert.deepEqual(leaves, [1]); assert.equal(host.peers.size, 0);
  } finally { guest.close(); host.close(); }
});

test('four-player limit and freed seats', async () => {
  const host = link(), guests = [link(), link(), link(), link()];
  try {
    const code = await host.host();
    assert.deepEqual(await Promise.all(guests.slice(0, 3).map(g => g.join(code))), [1, 2, 3]);
    await assert.rejects(guests[3].join(code), /full/);
    guests[1].close(); assert.equal(await guests[3].join(code), 2);
  } finally { guests.forEach(g => g.close()); host.close(); }
});

test('missing rooms and invalid versions fail visibly; host closure removes guest state', async () => {
  const absent = link(); await assert.rejects(absent.join('ABCD2345'), /not found/); assert.equal(absent.role, 'offline');
  const host = link(), guest = link();
  try {
    await guest.join(await host.host());
    host.peers.get(1).conn.send(JSON.stringify({ v: 'BREACH-0', kind: 'data' }));
    await tick(); assert.equal(guest.role, 'offline'); assert.equal(guest.slot, null);
    await guest.join(host.code); host.close(); assert.equal(guest.role, 'offline');
  } finally { guest.close(); host.close(); }
});

test('backpressure drops packets and validation rejects bad application input', async () => {
  const received = []; const host = link({ validateInput: data => data.input.mx !== -1, onData: data => received.push(data) });
  const guest = link();
  try {
    await guest.join(await host.host());
    guest.send(input(-1)); guest.send(input(1)); await tick(); assert.equal(received.length, 1);
    guest.peers.get(0).conn.dataChannel.bufferedAmount = 200000;
    assert.equal(guest.send(input(0)), false);
  } finally { guest.close(); host.close(); }
});

test('cancelling pending signaling rejects promptly and does not reopen stale room', async () => {
  class SilentPeer extends EventEmitter { destroy() {} }
  const network = new SquadLink({ peerFactory: SilentPeer, timeout: 200 });
  const promise = network.host(); network.close();
  await assert.rejects(promise, /cancelled/); assert.equal(network.role, 'offline');
});

test('guest command schema forbids identity/position spoofing and accepts kit selection', () => {
  assert.equal(validateGuestData(input()), true);
  assert.equal(validateGuestData(input(2)), false);
  assert.equal(validateGuestData({ ...input(), slot: 3 }), false);
  assert.equal(validateGuestData({ type: 'input', input: { ...input().input, health: 99 } }), false);
  assert.equal(validateGuestData({ type: 'ready', kit: 'carbine' }), true);
  assert.equal(validateGuestData({ type: 'ready', kit: 'rocket' }), false);
});

test('message flood is bounded and forged state is ignored even via raw transport', async () => {
  let accepted = 0; const host = link({ onData: () => accepted++ }), guest = link();
  try {
    await guest.join(await host.host());
    const conn = host.peers.get(1).conn;
    conn.emit('data', '{'); conn.emit('data', 'x'.repeat(60001));
    conn.emit('data', JSON.stringify({ v: PROTOCOL, kind: 'data', seq: 1, data: { type: 'state', game: { health: 999 } } }));
    assert.equal(accepted, 0);
    for (let seq = 1; seq <= 200; seq++) conn.emit('data', JSON.stringify({ v: PROTOCOL, kind: 'data', seq, data: input() }));
    assert.ok(accepted >= 90 && accepted < 110, `bounded initial burst, received ${accepted}`);
  } finally { guest.close(); host.close(); }
});

test('handshake timeout releases a reserved seat', async () => {
  const host = link({ timeout: 15 });
  try {
    await host.host();
    const conn = new MockConnection(), other = new MockConnection(); conn.other = other; other.other = conn; conn.open = other.open = true;
    host.peer.emit('connection', conn); assert.equal(host.peers.size, 1);
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(host.peers.size, 0); assert.equal(conn.open, false);
  } finally { host.close(); }
});


test('production game roundtrip: guest controls advance host simulation and full snapshots reach guest', async () => {
  const game = createGame({ seed: 406, entry: 'west', difficulty: 'training', bots: false });
  const controls = {}, frames = [];
  const host = link({
    onPeer: slot => { addPlayer(game, `peer${slot}`, 'compact'); host.send({ type: 'start', game: snapshot(game) }, slot); },
    onData: (packet, slot) => { if (packet.type === 'input') controls[`peer${slot}`] = packet.input; },
  });
  const guest = link({ onData: packet => frames.push(packet) });
  try {
    await guest.join(await host.host()); await tick();
    assert.equal(frames[0].type, 'start');
    assert.deepEqual(frames[0].game, snapshot(game));
    assert.equal(frames[0].game.players[1].id, 'peer1');
    const beforeX = game.players[1].x, hostX = game.players[0].x;
    const command = input(1); command.input.fire = true;
    assert.equal(guest.send(command), true); await tick();
    for (let i = 0; i < 15; i++) advanceGame(game, controls, 1 / 60);
    assert.ok(game.players[1].x > beforeX, 'received guest controls move only its operator');
    assert.equal(game.players[0].x, hostX);
    assert.ok(game.players[1].ammo < game.players[1].maxAmmo, 'host owns ammunition changes');
    const state = { type: 'state', game: snapshot(game) };
    assert.ok(new TextEncoder().encode(JSON.stringify(state)).length < 60000);
    assert.equal(host.broadcast(state), 1); await tick();
    assert.deepEqual(frames.at(-1), state, 'full map, players, enemies, objectives and effects roundtrip unchanged');
    assert.notEqual(frames.at(-1).game, game, 'guest receives an independent data snapshot');
  } finally { guest.close(); host.close(); }
});

function openPair() {
  const a = new MockConnection(), b = new MockConnection();
  a.other = b; b.other = a; a.open = b.open = true;
  return [a, b];
}

test('already-open connection completes handshake exactly once after handlers attach', async () => {
  const hostJoins = [], guestJoins = [], completed = [];
  const host = link({ onPeer: slot => hostJoins.push(slot) }), guest = link({ onPeer: slot => guestJoins.push(slot) });
  const [a, b] = openPair();
  host.role = 'host'; host.slot = 0; guest.role = 'guest';
  try {
    host._attach(a, 1, true, host.epoch);
    guest._attach(b, 0, false, guest.epoch, (error, slot) => completed.push({ error, slot }));
    await tick();
    assert.equal(guest.slot, 1); assert.equal(completed.length, 1); assert.equal(completed[0].error, null);
    assert.deepEqual(hostJoins, [1]); assert.deepEqual(guestJoins, [0]);
    assert.equal(host.peers.get(1).sent, 1); assert.equal(guest.peers.get(0).sent, 1);
    a.emit('open'); b.emit('open'); await tick();
    assert.equal(host.peers.get(1).sent, 1); assert.equal(guest.peers.get(0).sent, 1, 'duplicate open must not resend hello');
  } finally { guest.close(); host.close(); }
});

test('failed hello send immediately rejects and clears guest connection', async () => {
  const completed = [], joins = [], leaves = [];
  const guest = link({ onPeer: slot => joins.push(slot), onLeave: slot => leaves.push(slot) });
  const [conn] = openPair(); conn.send = () => { throw new Error('Test send failure'); };
  guest.role = 'guest';
  try {
    guest._attach(conn, 0, false, guest.epoch, error => completed.push(error));
    await tick();
    assert.equal(completed.length, 1); assert.ok(completed[0] instanceof Error);
    assert.equal(guest.peers.size, 0); assert.equal(guest.role, 'offline');
    assert.equal(conn.open, false); assert.deepEqual(joins, []); assert.deepEqual(leaves, [0]);
  } finally { guest.close(); }
});

test('failed welcome send does not admit the guest and frees its seat', async () => {
  const joins = [], leaves = [], statuses = [];
  const host = link({ onPeer: slot => joins.push(slot), onLeave: slot => leaves.push(slot), onStatus: text => statuses.push(text) });
  const [conn] = openPair(); conn.dataChannel.bufferedAmount = 200000;
  host.role = 'host'; host.slot = 0;
  try {
    host._attach(conn, 1, true, host.epoch);
    conn.emit('data', JSON.stringify({ v: PROTOCOL, kind: 'hello' }));
    await tick();
    assert.equal(host.peers.size, 0); assert.equal(conn.open, false);
    assert.deepEqual(joins, []); assert.deepEqual(leaves, [1]);
    assert.ok(statuses.length > 0, 'explicit failure is surfaced');
    assert.equal(host.role, 'host');
  } finally { host.close(); }
});

test('WebRTC diagnostics contain only lifecycle states and counts, not SDP, IPs or peer identity', () => {
  const network = link(), [conn] = openPair(), listeners = {};
  conn.peer = 'private-peer-identity';
  conn.peerConnection = {
    connectionState: 'connecting', iceConnectionState: 'checking', iceGatheringState: 'complete',
    localDescription: { sdp: 'SECRET_SDP\r\na=candidate:SECRET_LOCAL 192.0.2.19\r\n' }, remoteDescription: { sdp: 'SECRET_REMOTE\r\na=candidate:SECRET_ONE\r\na=candidate:SECRET_TWO\r\n' },
    addEventListener: (name, fn) => { listeners[name] = fn; },
  };
  conn.dataChannel.readyState = 'connecting';
  try {
    network._attach(conn, 1, true, network.epoch);
    listeners.icecandidate({ candidate: { type: 'host', address: '192.0.2.19', candidate: 'SECRET_CANDIDATE' } });
    listeners.icecandidateerror({ errorCode: 701, address: '192.0.2.19', url: 'SECRET_URL', errorText: 'SECRET_ERROR' });
    const serialized = JSON.stringify(network.diagnostics);
    assert.doesNotMatch(serialized, /SECRET|192\.0\.2\.19|private-peer-identity/);
    for (const item of network.diagnostics) assert.deepEqual(Object.keys(item).sort(), ['at', 'channel', 'connection', 'event', 'gathering', 'ice', 'localCandidates', 'received', 'remoteCandidates', 'role', 'sent', 'slot']);
    assert.ok(network.diagnostics.some(item => item.event === 'candidate:host'));
    assert.equal(network.diagnostics.at(-1).localCandidates, 1);
    assert.equal(network.diagnostics.at(-1).remoteCandidates, 2);
  } finally { network.close(); }
});
