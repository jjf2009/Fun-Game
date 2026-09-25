import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { TILE } from '../map.js';
import { sfx } from '../sfx.js';
import { pickTarget, throwBomb } from './bombs.js';

// BOSS NIGHT: the outsider gang arrives on 3 bikes (triple seat!) and bombs the hostel.
// 1. Take PHOTOS of a bike when it stops at the wall (that's your proof).
// 2. Run to the ANTI-RAGGING CELL desk (next to the Warden Office) and FILE A COMPLAINT.
// 3. Enough proof and that bike's gang is SUSPENDED. Suspend the boss to save the hostel!
export class BossFight {
  constructor(scene) {
    this.scene = scene;
    this.desk = { x: 12 * TILE, y: 6 * TILE + 12 };
    this.photoCooldownUntil = 0;
    this.rage = false;
    this.won = false;

    const b = CONFIG.boss;
    this.bikes = [
      { name: 'BIKE 1', key: 'bike', lane: 45, need: b.henchmanProof, delay: 0 },
      { name: CONFIG.bossName, key: 'bike_boss', lane: 95, need: b.bossProof, boss: true, delay: 900 },
      { name: 'BIKE 2', key: 'bike', lane: 140, need: b.henchmanProof, delay: 1800 },
    ].map((bk, i) => ({ ...bk, i, proof: 0, state: 'waiting', stateUntil: 0 }));

    // Anti-ragging desk
    scene.add.image(this.desk.x, this.desk.y - 14, 'desk').setRotation(Math.PI / 2).setDepth(4);
    scene.add.text(this.desk.x, this.desk.y - 40, 'ANTI-RAGGING CELL', {
      fontFamily: FONT, fontSize: '13px', color: '#000', backgroundColor: '#80ffdb', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(17);

    const start = scene.now + 1500;
    for (const bk of this.bikes) {
      bk.sprite = scene.add.image(bk.lane, -80, bk.key).setDepth(6).setRotation(Math.PI / 2).setScale(bk.boss ? 1.6 : 1.4);
      bk.label = scene.add.text(bk.lane, -80, bk.name, {
        fontFamily: FONT, fontSize: '13px', color: bk.boss ? '#ffd700' : '#ff6b6b', backgroundColor: '#000000cc', padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(17);
      bk.startAt = start + bk.delay;
      bk.targetY = Phaser.Math.Between(150, 850);
    }
    scene.time.delayedCall(1200, () => sfx.engine());
    scene.time.delayedCall(2000, () => sfx.engine());
  }

  // Photos live in each player's phone: p.photos[bikeIndex]
  photosOf(p) {
    return p.photos.reduce((a, b) => a + b, 0);
  }

  // Photos of this bike carried by the whole team (not filed yet)
  teamCarried(bk) {
    return this.scene.players.reduce((sum, p) => sum + (p.active ? p.photos[bk.i] : 0), 0);
  }

  speedOf(bk) {
    if (bk.boss) return this.rage ? 240 : 160;
    return 140;
  }

  update(time, dt) {
    for (const bk of this.bikes) {
      const sp = bk.sprite;
      if (!sp) continue;
      if (bk.state === 'waiting') {
        if (time >= bk.startAt) bk.state = 'ride';
        continue;
      }
      if (bk.state === 'ride') {
        const dy = bk.targetY - sp.y;
        const step = this.speedOf(bk) * dt;
        if (Math.abs(dy) <= step) {
          sp.y = bk.targetY;
          this.stop(bk, time);
        } else {
          sp.y += Math.sign(dy) * step;
          sp.setRotation(dy > 0 ? Math.PI / 2 : -Math.PI / 2);
        }
        sp.x = bk.lane + Math.sin(time / 60 + bk.lane) * 1.5; // engine wobble
      } else if (bk.state === 'stop') {
        if (bk.throwAt && time >= bk.throwAt) {
          bk.throwAt = 0;
          this.volley(bk);
        }
        if (time >= bk.stateUntil) {
          bk.state = 'ride';
          let next;
          do next = Phaser.Math.Between(120, 880);
          while (Math.abs(next - sp.y) < 200);
          bk.targetY = next;
          if (Math.random() < 0.4) sfx.engine();
        }
      } else if (bk.state === 'suspended') {
        sp.y += 320 * dt;
        sp.setRotation(Math.PI / 2);
        if (sp.y > 25 * TILE + 100) {
          sp.destroy();
          bk.label.destroy();
          bk.sprite = null;
          bk.state = 'gone';
          continue;
        }
      }
      bk.label.setPosition(sp.x, sp.y - 62).setText(bk.state === 'stop' ? `${bk.name} 📸` : bk.name);
    }
  }

  stop(bk, time) {
    bk.state = 'stop';
    const stopFor = bk.boss && this.rage ? 1800 : 2600;
    bk.stateUntil = time + stopFor;
    bk.throwAt = time + 500;
  }

  // The riders throw a bomb each (the boss throws a 3-bomb spread when angry).
  volley(bk) {
    const s = this.scene;
    const sp = bk.sprite;
    const count = bk.boss ? (this.rage ? 4 : 3) : 2;
    const msg = bk.boss ? `💥 ${CONFIG.bossName}'s bomb got you!` : '💥 Hit by the bike gang!';
    for (let i = 0; i < count; i++) {
      s.time.delayedCall(i * 260, () => {
        if (!bk.sprite || this.won) return;
        const { x, y } = pickTarget(s, bk.boss && this.rage ? 90 : 60, 620, 15); // bikes can only reach near the wall
        throwBomb(s, sp.x, sp.y + (i - 1) * 14, x, y, 1100, msg);
      });
    }
    s.tweens.add({ targets: sp, scale: sp.scale * 1.1, duration: 120, yoyo: true });
  }

  // ---------- Player actions ----------

  nearDesk(p) {
    return Phaser.Math.Distance.Between(p.x, p.y, this.desk.x, this.desk.y) < 75;
  }

  photoTarget(p) {
    // Prefer a stopped bike that still needs proof, then the closest one.
    let best = null;
    let bestScore = Infinity;
    for (const bk of this.bikes) {
      if (!bk.sprite || bk.state === 'suspended' || bk.state === 'waiting') continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, bk.sprite.x, bk.sprite.y);
      if (d >= CONFIG.boss.photoRange) continue;
      const useful = bk.state === 'stop' && bk.proof + this.teamCarried(bk) < bk.need;
      const score = (useful ? 0 : 10000) + d;
      if (score < bestScore) { best = bk; bestScore = score; }
    }
    return best;
  }

  hint(p) {
    const mine = this.photosOf(p);
    if (this.nearDesk(p)) return mine > 0 ? `File anti-ragging complaint (${mine} photo${mine > 1 ? 's' : ''})` : 'Bring photo proof here!';
    const bk = this.photoTarget(p);
    if (bk) {
      if (bk.state !== 'stop') return 'Wait for them to stop...';
      if (bk.proof + this.teamCarried(bk) >= bk.need) return `Enough proof on ${bk.name}! Go file it!`;
      return `📸 Take photo of ${bk.name}`;
    }
    return null;
  }

  // Returns true if the action was used by the boss fight.
  action(time, p) {
    const s = this.scene;
    if (this.nearDesk(p)) {
      this.file(p);
      return true;
    }
    const bk = this.photoTarget(p);
    if (!bk) return false;
    if (bk.state !== 'stop') {
      s.floatText(p.x, p.y - 40, 'Too blurry! Wait till they stop', '#aaaaaa', 13);
      return true;
    }
    if (bk.proof + this.teamCarried(bk) >= bk.need) {
      s.floatText(p.x, p.y - 40, 'Enough proof! Go to the Anti-Ragging Cell', '#80ffdb', 13);
      return true;
    }
    if (time < (p.photoCooldownUntil ?? 0)) return true;
    p.photoCooldownUntil = time + 700;
    p.photos[bk.i]++;
    sfx.camera();
    s.fxFlash(p, 120, 255, 255, 255);
    s.lighting.flash(p.x, p.y, 220, 250);
    s.floatText(bk.sprite.x + 70, bk.sprite.y - 20, `📸 PROOF +1 (${bk.name})`, '#ffffff', 15);
    return true;
  }

  file(p) {
    const s = this.scene;
    if (!this.photosOf(p)) {
      s.floatText(this.desk.x, this.desk.y - 60, `${CONFIG.wardenName}: "No proof, no action!"`, '#ffd166', 14);
      return;
    }
    sfx.point();
    s.floatText(this.desk.x, this.desk.y - 60, `${CONFIG.wardenName}: "Complaint registered!"`, '#ffd166', 14);
    for (const bk of this.bikes) {
      const n = p.photos[bk.i];
      if (!n) continue;
      bk.proof += n;
      s.addScore(50 * n, null, this.desk.x, this.desk.y - 30);
      p.photos[bk.i] = 0;
      if (bk.proof >= bk.need && (bk.state !== 'suspended' && bk.state !== 'gone')) this.suspend(bk);
    }
  }

  dropPhotos(p) {
    if (!this.photosOf(p)) return;
    p.photos.fill(0);
    this.scene.bannerFor(p, '📱 Your phone broke! Unfiled photos lost!', '#ff6b6b');
  }

  suspend(bk) {
    const s = this.scene;
    bk.state = 'suspended';
    sfx.stamp();
    s.cameras.main.shake(250, 0.012);
    const stamp = s.add.text(bk.sprite.x + 120, bk.sprite.y, 'SUSPENDED!', {
      fontFamily: TITLE_FONT, fontSize: '22px', color: '#ff1f3d', stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setAngle(-12).setScale(3).setAlpha(0);
    s.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut' });
    s.tweens.add({ targets: stamp, alpha: 0, delay: 2200, duration: 600, onComplete: () => stamp.destroy() });

    if (bk.boss) {
      this.won = true;
      s.addScore(1000, `${CONFIG.bossName} SUSPENDED!`, this.desk.x, this.desk.y - 80);
      s.banner(`📜 Anti-Ragging Committee: ${CONFIG.bossName} and his gang are SUSPENDED!`, '#80ffdb');
      // Everyone left rides away too
      for (const other of this.bikes) if (other.sprite && other.state !== 'suspended') other.state = 'suspended';
      s.time.delayedCall(2800, () => s.victory());
      return;
    }
    s.addScore(300, `${bk.name} SUSPENDED!`, this.desk.x, this.desk.y - 80);
    s.banner(`📜 Anti-Ragging Committee: ${bk.name} gang SUSPENDED!`, '#80ffdb');
    const henchmenLeft = this.bikes.filter((b) => !b.boss && b.state !== 'suspended' && b.state !== 'gone');
    if (!henchmenLeft.length && !this.rage) {
      this.rage = true;
      sfx.engine();
      s.time.delayedCall(1200, () => s.banner(`😡 ${CONFIG.bossName} is FURIOUS! More bombs, faster bike!`, '#ff6b6b'));
    }
  }
}

