import Phaser from 'phaser';
import { Peer } from 'peerjs';

// Online co-op connection, peer-to-peer with PeerJS (free, works from GitHub Pages).
// The host creates a room with a 4-letter code; the friend joins with that code.
//
// Events: 'code' (room code ready), 'connected', 'data' (message), 'closed', 'error' (friendly text)
//
// Testing tip: add ?peerhost=localhost&peerport=9000 to the URL to use a local PeerJS server
// (npx peer --port 9000) instead of the free public one.

const PREFIX = 'hostel-nights-v1-';
const PING_MS = 2000;     // "I'm still here" message
const TIMEOUT_MS = 8000;  // no message for this long = friend is gone
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I, L, O (easy to confuse)

function peerOptions() {
  const q = new URLSearchParams(window.location.search);
  const host = q.get('peerhost');
  if (!host) return { debug: 1 };
  return { host, port: Number(q.get('peerport') || 9000), path: q.get('peerpath') || '/', secure: q.get('peersecure') === '1', debug: 1 };
}

const makeCode = () => Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');

function friendlyError(err) {
  switch (err?.type) {
    case 'peer-unavailable': return 'Room not found. Check the code and make sure your friend is still on the waiting screen.';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed': return 'Could not reach the game server. Check your internet (college Wi-Fi sometimes blocks this, try mobile data).';
    case 'browser-incompatible': return 'This browser does not support online play. Try Chrome or Safari.';
    default: return `Connection problem (${err?.type || err?.message || 'unknown'}). Try again.`;
  }
}

export class Net extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.peer = null;
    this.conn = null;
    this.connected = false;
    this.role = null; // 'host' or 'guest'
    this.code = null;
  }

  host() {
    this.role = 'host';
    this.code = makeCode();
    this.peer = new Peer(PREFIX + this.code, peerOptions());
    this.peer.on('open', () => this.emit('code', this.code));
    this.peer.on('connection', (conn) => {
      if (this.conn) {
        conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 500); });
        return;
      }
      this.attach(conn);
    });
    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') { // code already taken, pick another
        this.peer.destroy();
        this.host();
        return;
      }
      this.emit('error', friendlyError(err));
    });
  }

  join(code) {
    this.role = 'guest';
    this.code = code.trim().toUpperCase();
    this.peer = new Peer(peerOptions());
    this.peer.on('open', () => {
      this.attach(this.peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' }));
    });
    this.peer.on('error', (err) => this.emit('error', friendlyError(err)));
    this.joinTimer = setTimeout(() => {
      if (!this.connected) this.emit('error', 'Could not connect. Check the room code and try again.');
    }, 15000);
  }

  attach(conn) {
    this.conn = conn;
    conn.on('open', () => {
      clearTimeout(this.joinTimer);
      this.connected = true;
      this.lastRecv = Date.now();
      // Heartbeat: WebRTC can take ~30s to notice a closed page, so check ourselves.
      this.heartbeat = setInterval(() => {
        this.send({ t: 'ping' });
        if (Date.now() - this.lastRecv > TIMEOUT_MS) this.lost();
      }, PING_MS);
      this.onPageHide = () => this.send({ t: 'bye' });
      window.addEventListener('pagehide', this.onPageHide);
      this.emit('connected');
    });
    conn.on('data', (msg) => {
      this.lastRecv = Date.now();
      if (msg?.t === 'ping') return;
      if (msg?.t === 'full') {
        this.emit('error', 'That room already has two players.');
        return;
      }
      this.emit('data', msg);
    });
    conn.on('close', () => this.lost());
    conn.on('error', () => this.lost());
    this.peer.on('disconnected', () => {
      // Lost the signalling server; the direct connection may still be alive, try to reconnect quietly.
      if (!this.peer.destroyed) this.peer.reconnect();
    });
  }

  lost() {
    if (!this.connected) return;
    this.connected = false;
    clearInterval(this.heartbeat);
    this.emit('closed');
  }

  send(msg) {
    if (this.connected && this.conn?.open) this.conn.send(msg);
  }

  destroy() {
    clearTimeout(this.joinTimer);
    clearInterval(this.heartbeat);
    window.removeEventListener('pagehide', this.onPageHide);
    this.connected = false;
    this.removeAllListeners();
    try {
      this.conn?.close();
      this.peer?.destroy();
    } catch {
      // already closed
    }
  }
}
