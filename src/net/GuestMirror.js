import Phaser from 'phaser';
import { FONT } from '../config.js';
import { tileCenter } from '../map.js';
import { sfx } from '../sfx.js';
import { explosionParticles } from '../systems/bombs.js';

const CONE_HALF = Phaser.Math.DegToRad(35);
const SEND_MS = 50;

// CO-OP FRIEND: this device doesn't run the game. It
//  - moves YOUR character locally (so it feels instant) and sends its position to the host,
//  - draws everything else exactly as the host sends it (smoothly moving between updates),
//  - plays the host's sounds/banners/effects, and shows ragging tasks when a senior catches you.
export class GuestMirror {
  constructor(scene) {
    this.s = scene;
    this.net = scene.game.net;
    this.objs = new Map();
    this.hud = null;
    this.light = { players: [], cone: null, points: [] };
    this.coneInfo = null;
    this.p1Id = null;
    this.tpSeq = 0;
    this.lastSend = 0;
    this.fx = { hidden: false, frozen: false };

    // Your character (pink), starting next to the host in front of your shared room
    const mine = scene.map.doors.find((d) => d.mine);
    const start = tileCenter(mine.frontCol, mine.frontRow);
    const me = scene.physics.add.sprite(start.x + 40, start.y, 'player2').setDepth(6);
    me.body.setCircle(13, 9, 9);
    me.setCollideWorldBounds(true);
    scene.physics.add.collider(me, scene.walls);
    me.key = 'player2';
    me.local = true;
    me.dust = scene.add.particles(0, 0, 'dust', {
      follow: me, frequency: 70, lifespan: 450, speed: { min: 5, max: 25 },
      scale: { start: 0.7, end: 0.1 }, alpha: { start: 0.35, end: 0 }, emitting: false,
    }).setDepth(4);
    me.label = scene.add.text(me.x, me.y - 26, 'YOU', {
      fontFamily: FONT, fontSize: '12px', color: '#ffafcc', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16);
    this.me = me;
    scene.player = me;
    scene.players = [me];
    scene.cameras.main.startFollow(me, true, 0.12, 0.12);
    this.coneGfx = scene.add.graphics().setDepth(3);

    this.onData = (m) => this.handle(m);
    this.net.on('data', this.onData);
    scene.events.once('shutdown', () => this.net?.off('data', this.onData));
  }

  handle(m) {
    switch (m.t) {
      case 'snap': this.applySnap(m); break;
      case 'ev': this.applyEvent(m); break;
      case 'tp':
        this.me.setPosition(m.x, m.y);
        this.tpSeq = m.seq;
        break;
      case 'rag':
        this.s.scene.launch('Ragging', { night: m.night, overlay: true, face: 'face_player2', onDone: (ok) => this.net.send({ t: 'ragDone', ok }) });
        break;
      default:
    }
  }

  applySnap(m) {
    const s = this.s;
    for (const e of m.e) {
      let o = this.objs.get(e.id);
      if (e.c) {
        o?.destroy();
        o = this.create(e);
        this.objs.set(e.id, o);
      }
      if (!o) continue;
      if (e.x !== undefined) o.tx = e.x;
      if (e.y !== undefined) o.ty = e.y;
      if (e.r !== undefined) o.tr = e.r;
      if (e.c || Phaser.Math.Distance.Between(o.x, o.y, o.tx, o.ty) > 250) { // new or teleported: jump there
        o.setPosition(o.tx, o.ty);
        o.setRotation(o.tr);
      }
      if (e.sx !== undefined) o.scaleX = e.sx;
      if (e.sy !== undefined) o.scaleY = e.sy;
      if (e.a !== undefined) o.setAlpha(e.a);
      if (e.v !== undefined) o.setVisible(!!e.v);
      if (e.d !== undefined) o.setDepth(e.d);
      if (e.t !== undefined) o.setText(e.t);
      if (e.col !== undefined && o.type === 'Text') o.setColor(e.col);
      if (e.k !== undefined && s.textures.exists(e.k)) o.setTexture(e.k);
      if (e.tn !== undefined) { if (e.tn === 0xffffff) o.clearTint(); else o.setTint(e.tn); }
      if (e.fc !== undefined || e.fa !== undefined) o.setFillStyle(e.fc ?? o.fillColor, e.fa ?? o.fillAlpha);
    }
    for (const id of m.rm) {
      this.objs.get(id)?.destroy();
      this.objs.delete(id);
    }
    if (m.hud) this.hud = m.hud;
    this.light = m.light;
    this.p1Id = m.p1;
    this.coneInfo = m.cone;
    if (m.fx) {
      this.fx = m.fx;
      this.me.setAlpha(m.fx.hidden ? 0.25 : 1);
    }
  }

  create(e) {
    const s = this.s;
    const c = e.c;
    let o;
    if (c.ty === 'Text') o = s.add.text(e.x, e.y, e.t ?? '', c.st);
    else if (c.ty === 'Arc') {
      o = s.add.circle(e.x, e.y, c.rad, e.fc, e.fa);
      if (c.stk) o.setStrokeStyle(c.stk[0], c.stk[1], c.stk[2]);
    } else o = s.add.image(e.x, e.y, s.textures.exists(e.k) ? e.k : '__DEFAULT');
    o.setOrigin(c.ox, c.oy);
    o.setBlendMode(c.bm);
    o.tx = e.x;
    o.ty = e.y;
    o.tr = e.r ?? 0;
    return o;
  }

  applyEvent(m) {
    const s = this.s;
    switch (m.k) {
      case 'sfx': sfx[m.n]?.(...(m.a || [])); break;
      case 'banner': s.game.events.emit('banner', m.text, m.color); break;
      case 'shake': s.cameras.main.shake(m.d, m.i); break;
      case 'flash': s.cameras.main.flash(m.d, m.r, m.g, m.b); break;
      case 'hurt':
        s.cameras.main.shake(200, 0.01);
        s.cameras.main.flash(200, 255, 60, 60);
        s.tweens.add({ targets: this.me, alpha: 0.2, duration: 120, yoyo: true, repeat: 7, onComplete: () => this.me.setAlpha(1) });
        break;
      case 'lf': s.lighting.flash(m.x, m.y, m.r, m.duration); break;
      case 'boom': explosionParticles(s, m.x, m.y); break;
      case 'occ': s.rooms.applyNet(m); break;
      default:
    }
  }

  update(time, delta) {
    const s = this.s;
    const me = this.me;
    const { vx, vy, len, action } = s.readInput();

    // Your own character
    const stuck = this.fx.hidden || this.fx.frozen;
    if (stuck) {
      me.setVelocity(0, 0);
      me.dust.emitting = false;
    } else {
      s.constructor.walk(me, vx, vy, len);
    }
    me.label.setPosition(me.x, me.y - 26);
    if (action) this.net.send({ t: 'act' });
    if (time - this.lastSend > SEND_MS) {
      this.lastSend = time;
      this.net.send({ t: 'in', x: Math.round(me.x), y: Math.round(me.y), r: Math.round(me.rotation * 100) / 100, mv: len > 0.3, seq: this.tpSeq });
    }

    // Smoothly move everything the host sent towards its latest position
    const k = Math.min(1, (delta / 1000) * 14);
    for (const o of this.objs.values()) {
      if (o.tx === undefined) continue;
      o.x += (o.tx - o.x) * k;
      o.y += (o.ty - o.y) * k;
      o.rotation = Phaser.Math.Angle.RotateTo(o.rotation, o.tr, 0.3);
    }

    // Lighting: you, your friend (host), the warden's torch, and everything else the host listed
    const host = this.objs.get(this.p1Id);
    const warden = this.coneInfo ? this.objs.get(this.coneInfo.id) : null;
    const src = {
      players: [[me.x, me.y, 120, 0.9], ...(host ? [[host.x, host.y, 95, 0.9]] : [])],
      cone: warden ? { x: warden.x, y: warden.y, f: warden.rotation, range: this.coneInfo.range } : null,
      points: this.light?.points ?? [],
    };
    s.lighting.update(time, src);
    this.drawCone(warden);
  }

  drawCone(warden) {
    const g = this.coneGfx;
    g.clear();
    if (!warden) return;
    const chase = this.coneInfo.chase;
    g.fillStyle(chase ? 0xff5555 : 0xfff1a8, chase ? 0.2 : 0.1);
    g.slice(warden.x, warden.y, this.coneInfo.range, warden.rotation - CONE_HALF, warden.rotation + CONE_HALF, false);
    g.fillPath();
  }
}
