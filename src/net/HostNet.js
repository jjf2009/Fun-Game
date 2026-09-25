import Phaser from 'phaser';
import { sfx } from '../sfx.js';
import { Lighting } from '../systems/Lighting.js';

// CO-OP HOST: the host's device runs the real game. This class
//  - streams everything on screen (sprites, texts, circles) to the friend ~20 times a second,
//    sending only what changed since last time,
//  - moves player 2 (the friend) with the positions/actions the friend's device sends.
//
// Messages host -> friend: snap (world state + HUD), ev (sound/banner/effects), tp (move friend), rag (ragging task)
// Messages friend -> host: in (position), act (ACTION pressed), ragDone (task result)

const SYNCED = new Set(['Sprite', 'Image', 'Text', 'Arc']);
const SNAP_MS = 50;

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

// Current look of an object (only changed fields are sent)
function state(go) {
  const o = {
    x: r1(go.x), y: r1(go.y), r: r2(go.rotation), sx: r2(go.scaleX), sy: r2(go.scaleY),
    a: r2(go.alpha), v: go.visible ? 1 : 0, d: go.depth,
  };
  if (go.type === 'Text') {
    o.t = go.netAlt ?? go.text;
    o.col = go.style.color;
  } else if (go.type === 'Arc') {
    o.fc = go.fillColor;
    o.fa = r2(go.fillAlpha);
  } else {
    o.k = go.texture.key;
    o.tn = go.isTinted ? go.tintTopLeft : 0xffffff;
  }
  return o;
}

// Things that never change after creation
function creation(go) {
  const c = { ty: go.type, ox: go.originX, oy: go.originY, bm: go.blendMode };
  if (go.type === 'Text') {
    const st = go.style;
    c.st = {
      fontFamily: st.fontFamily, fontSize: st.fontSize, fontStyle: st.fontStyle, color: st.color,
      backgroundColor: st.backgroundColor, stroke: st.stroke, strokeThickness: st.strokeThickness, align: st.align,
      padding: { ...go.padding }, wordWrap: st.wordWrapWidth ? { width: st.wordWrapWidth } : undefined,
    };
  } else if (go.type === 'Arc') {
    c.rad = go.radius;
    if (go.isStroked) c.stk = [go.lineWidth, go.strokeColor, go.strokeAlpha];
  }
  return c;
}

export class HostNet {
  constructor(scene) {
    this.s = scene;
    this.net = scene.game.net;
    this.objs = new Map();
    this.sent = new Map();
    this.removed = [];
    this.nextId = 1;
    this.lastSnap = 0;
    this.tpSeq = 0;
    this.input = null;
    this.pendingAct = false;

    scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdd, this);
    scene.events.on(Phaser.Scenes.Events.REMOVED_FROM_SCENE, this.onRemove, this);
    this.onData = (m) => this.handle(m);
    this.net.on('data', this.onData);
    this.onLeft = () => this.friendLeft();
    scene.game.events.on('friend-left', this.onLeft);
    sfx.onPlay = (name, args) => this.event({ k: 'sfx', n: name, a: args });
    scene.events.once('shutdown', () => this.destroy());
  }

  destroy() {
    this.s.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdd, this);
    this.s.events.off(Phaser.Scenes.Events.REMOVED_FROM_SCENE, this.onRemove, this);
    this.net?.off('data', this.onData);
    this.s.game.events.off('friend-left', this.onLeft);
    sfx.onPlay = null;
  }

  onAdd(go) {
    if (!SYNCED.has(go.type)) return;
    go.netId = this.nextId++;
    this.objs.set(go.netId, go);
  }

  onRemove(go) {
    if (!go.netId || !this.objs.has(go.netId)) return;
    this.objs.delete(go.netId);
    if (this.sent.delete(go.netId)) this.removed.push(go.netId);
  }

  send(msg) {
    if (this.s.game.net) this.net.send(msg);
  }

  event(e) {
    this.send({ t: 'ev', ...e });
  }

  teleport(x, y) {
    this.tpSeq++;
    this.send({ t: 'tp', x, y, seq: this.tpSeq });
  }

  get friend() {
    return this.s.players[1]?.active ? this.s.players[1] : null;
  }

  handle(m) {
    if (m.t === 'in') this.input = m;
    else if (m.t === 'act') this.pendingAct = true;
    else if (m.t === 'ragDone' && this.friend) this.s.finishRagging(this.friend, m.ok);
  }

  // Move the friend's character to where their device says it is.
  applyRemoteInput(time) {
    const p = this.friend;
    if (!p) return;
    const m = this.input;
    const act = this.pendingAct;
    this.pendingAct = false;
    if (p.frozen) return;
    if (p.hidden) {
      if ((m?.mv && m.seq === this.tpSeq) || act || time > p.hideUntil) this.s.unhide(time, time > p.hideUntil, p);
      return;
    }
    if (m && m.seq === this.tpSeq) { // ignore positions sent before our last teleport
      p.setPosition(m.x, m.y).setRotation(m.r);
      p.dust.emitting = m.mv;
      if (m.mv && !p.anims.isPlaying) p.play('player2-walk');
      if (!m.mv && p.anims.isPlaying) { p.stop(); p.setTexture('player2'); }
    }
    if (act) this.s.handleAction(time, p);
  }

  update(time) {
    if (time - this.lastSnap < SNAP_MS || !this.s.game.net) return;
    this.lastSnap = time;
    const s = this.s;
    const e = [];
    for (const [id, go] of this.objs) {
      if (go.noNet || !go.scene) continue;
      const cur = state(go);
      const prev = this.sent.get(id);
      if (!prev) {
        e.push({ id, c: creation(go), ...cur });
        this.sent.set(id, cur);
        continue;
      }
      const diff = {};
      let changed = false;
      for (const k in cur) {
        if (cur[k] !== prev[k]) { diff[k] = cur[k]; prev[k] = cur[k]; changed = true; }
      }
      if (changed) e.push({ id, ...diff });
    }
    const rm = this.removed;
    this.removed = [];
    const friend = this.friend;
    this.send({
      t: 'snap', e, rm,
      hud: friend ? s.hudFor(friend) : null,
      light: Lighting.sourcesFrom(s, time),
      p1: s.players[0].netId,
      cone: s.warden?.active && !s.warden.stationed ? { id: s.warden.netId, chase: s.warden.state === 'chase', range: s.warden.stats.range } : null,
      fx: friend ? { hidden: friend.hidden, frozen: friend.frozen } : null,
    });
  }

  friendLeft() {
    const p = this.friend;
    if (!p) return;
    p.dust.destroy();
    p.label.destroy();
    p.destroy();
    this.s.players = this.s.players.filter((pl) => pl !== p);
    this.s.hostNet = null;
    this.destroy();
  }
}
