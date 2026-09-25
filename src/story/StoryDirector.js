import Phaser from 'phaser';
import { FONT } from '../config.js';
import { TILE, tileCenter, randomWalkableTile } from '../map.js';
import { sfx } from '../sfx.js';
import { CHAPTERS, JUNIORS, RAGGING_SCENES, WITNESS_TALKS } from './chapters.js';
import { Watcher } from './Watcher.js';
import { Senior } from '../objects/Senior.js';
import { Rebel } from '../objects/Rebel.js';

// STORY MODE: runs one chapter (goals, hints, what ACTION does) instead of the Arcade events.
//  Ch1 Fresher   : get inside and sneak past a senior to your room
//  Ch2 Evidence  : photograph 3 ragging scenes without being seen, bring the photos to your room
//  Ch3 Witnesses : talk 3 scared juniors into giving statements (they become allies)
//  Ch4 Speak Up  : reach the common room computer, send the anonymous complaint, survive till morning
export class StoryDirector {
  constructor(scene, chapter) {
    this.s = scene;
    this.n = chapter;
    this.ch = CHAPTERS[chapter];
    this.done = false;
    this.goals = [];
    this.allies = [];
    // The story is about the seniors: the warden stays in his office every chapter
    scene.warden.setPosition(12 * TILE, 3 * TILE);
    scene.warden.station();
    scene.warden.label.setText('WARDEN SIR (in office)');
    this[`setup${chapter}`]();
  }

  goal(text) {
    const g = { text, done: false };
    this.goals.push(g);
    return g;
  }

  near(p, pt, d) {
    return Phaser.Math.Distance.Between(p.x, p.y, pt.x, pt.y) < d;
  }

  atMyDoor(p) {
    return this.near(p, this.s.myDoor.front, 50);
  }

  placePlayer(tx, ty) {
    const c = tileCenter(tx, ty);
    this.s.player.setPosition(c.x, c.y);
  }

  addSeniors(n) {
    const s = this.s;
    for (let i = 0; i < n; i++) {
      const t = randomWalkableTile((c) => c > 16 && Math.abs(c - s.myDoor.col) > 5);
      const c = tileCenter(t.col, t.row);
      s.seniors.push(new Senior(s, c.x, c.y));
    }
  }

  // ---------------- Chapter 1: FRESHER ----------------
  setup1() {
    const s = this.s;
    this.placePlayer(7, 20);
    this.watcher = new Watcher(s, { tile: [16, 6], task: 'pushups', junior: 'res2', shout: ['"Push-ups, fresher! 50!"', '"Who said you can stop?"', '"Chintu, FASTER!"'] });
    s.seniors.push(this.watcher);
    this.gInside = this.goal('Go inside the hostel');
    this.gRoom = this.goal('Sneak to your room (111) without being seen');
    s.time.delayedCall(800, () => s.banner('Walk in through the gate and head inside. Goals are on the top right.', '#ffe066'));
  }

  update1() {
    const p = this.s.player;
    if (!this.gInside.done && p.x > 11 * TILE) {
      this.gInside.done = true;
      this.s.banner('😟 A senior is ragging a junior in the corridor. Don\'t let him see you!', '#ff8fa3');
      this.s.time.delayedCall(3500, () => this.s.banner('Tip: wait until he looks away, or go the long way round (via the bathroom).', '#caf0f8'));
    }
  }

  // ---------------- Chapter 2: EVIDENCE ----------------
  setup2() {
    const s = this.s;
    this.photos = 0;
    this.watchers = RAGGING_SCENES.map((cfg) => {
      const w = new Watcher(s, cfg);
      s.seniors.push(w);
      return w;
    });
    this.gPhotos = this.goal('Photograph 3 ragging scenes (0/3)');
    this.gSave = this.goal('Bring the photos back to your room (111)');
    s.time.delayedCall(800, () => s.banner('📸 Get close and take photos, but stay OUT of the red sight cones!', '#ffd166'));
  }

  photoTarget(p) {
    return this.watchers?.find((w) => !w.photographed && this.near(p, w.juniorPos, 190));
  }

  takePhoto(p, w) {
    const s = this.s;
    w.photographed = true;
    this.photos++;
    sfx.camera();
    s.fxFlash(p, 120, 255, 255, 255);
    s.lighting.flash(p.x, p.y, 200, 250);
    s.floatText(w.juniorPos.x, w.juniorPos.y - 40, `📸 PROOF ${this.photos}/3`, '#ffffff', 16);
    w.noticeFlash(p);
    this.gPhotos.text = `Photograph 3 ragging scenes (${this.photos}/3)`;
    if (this.photos >= 3) {
      this.gPhotos.done = true;
      s.banner('Got all 3! Now get them safely back to your room.', '#80ffdb');
    }
  }

  losePhotos() {
    if (!this.watchers || this.gSave.done || this.photos === 0) return;
    this.photos = 0;
    for (const w of this.watchers) w.photographed = false;
    this.gPhotos.done = false;
    this.gPhotos.text = 'Photograph 3 ragging scenes (0/3)';
    this.s.banner('📱 The senior grabbed your phone and deleted the photos! Try again.', '#ff6b6b');
  }

  // ---------------- Chapter 3: WITNESSES ----------------
  setup3() {
    const s = this.s;
    this.statements = 0;
    this.addSeniors(2);
    this.witnesses = Object.entries(JUNIORS).map(([id, j]) => {
      const door = s.doors.find((d) => d.roomNo === j.room);
      const marker = s.add.text(door.front.x, door.front.y - 32, '!', {
        fontFamily: FONT, fontSize: '24px', color: '#ffd166', stroke: '#000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(17);
      s.tweens.add({ targets: marker, y: marker.y - 8, duration: 400, yoyo: true, repeat: -1 });
      return { id, ...j, door, marker, state: 'waiting', retryAt: 0 };
    });
    this.gTalk = this.goal('Get 3 statements from scared juniors (0/3)');
    this.gBack = this.goal('Go back to your room (111)');
    s.time.delayedCall(800, () => s.banner('Juniors with a ! want to talk. Knock and choose your words carefully.', '#ffd166'));
  }

  witnessAt(p) {
    return this.witnesses?.find((w) => w.state !== 'done' && this.near(p, w.door.front, 50));
  }

  talk(time, w) {
    const s = this.s;
    if (time < w.retryAt) {
      s.floatText(w.door.front.x, w.door.front.y - 30, `${w.name}: "Not now. Come back later."`, '#aaaaaa', 13);
      return;
    }
    sfx.knock();
    s.runOverlay('Dialogue', { name: w.name, room: w.room, face: w.face, talk: WITNESS_TALKS[w.id] }, (good) => {
      if (good) {
        w.state = 'done';
        w.marker.setText('✓').setColor('#06d6a0');
        this.statements++;
        this.gTalk.text = `Get 3 statements from scared juniors (${this.statements}/3)`;
        s.addScore(100, `${w.name} will speak up!`, w.door.front.x, w.door.front.y - 50);
        const ally = new Rebel(s, w.door.frontTile.x, w.door.frontTile.y, this.allies.length, s.rooms.keyFor(w.room), ['"I\'ve got your back!"', '"Count me in!"', '"Enough is enough!"']);
        ally.label.setText('ALLY');
        this.allies.push(ally);
        if (this.statements === 1) s.banner(`${w.name} is your ALLY now: if a senior catches you, an ally distracts him!`, '#80ffdb');
        if (this.statements >= 3) {
          this.gTalk.done = true;
          s.banner('Three statements! Head back to your room.', '#80ffdb');
        }
      } else {
        w.retryAt = s.now + 12000;
        s.floatText(w.door.front.x, w.door.front.y - 30, 'Door slammed. Try again later, and be kinder.', '#ff6b6b', 13);
      }
    });
  }

  // Called when a senior is about to catch you: an ally steps in
  tryDistract(senior, p) {
    const ally = this.allies.shift();
    if (!ally) return false;
    const s = this.s;
    s.floatText(senior.x, senior.y - 44, Phaser.Utils.Array.GetRandom(['"Bhaiya, one doubt in maths!"', '"Bhaiya, the warden is calling you!"', '"Bhaiya, your mom is on the phone!"']), '#80ffdb', 14);
    senior.letGo(s.now);
    p.invulnUntil = s.now + 2000;
    ally.goHome();
    s.banner('Your ally distracted the senior. Run!', '#80ffdb');
    return true;
  }

  // ---------------- Chapter 4: SPEAK UP ----------------
  setup4() {
    const s = this.s;
    // The seniors are hunting for whoever is planning to complain
    s.modeCfg = { ...s.modeCfg, seniorSpeed: 1.05, seniorSight: 170 };
    this.addSeniors(3);
    this.pc = tileCenter(11, 17);
    s.add.image(this.pc.x, this.pc.y + 10, 'desk').setRotation(Math.PI / 2).setDepth(3);
    // a little monitor on the desk
    s.add.rectangle(this.pc.x, this.pc.y + 6, 22, 15, 0x1b263b).setDepth(4);
    s.add.rectangle(this.pc.x, this.pc.y + 5, 18, 11, 0x9bf6ff).setDepth(4);
    this.pcLight = s.lighting.addLight(this.pc.x, this.pc.y + 6, 60, 0.9, 0x9bf6ff);
    s.add.text(this.pc.x, this.pc.y + 34, '💻 COMMON ROOM PC', {
      fontFamily: FONT, fontSize: '12px', color: '#000', backgroundColor: '#9bf6ff', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(17);
    this.gPc = this.goal('Reach the common room computer (bottom of the lobby)');
    this.gSend = this.goal('Send the anti-ragging complaint, anonymously');
    this.gSurvive = this.goal('Hide and survive until morning');
    this.surviveLeft = 0;
    s.time.delayedCall(800, () => s.banner('😠 The seniors are hunting for "the complainer". Don\'t get caught!', '#ff6b6b'));
  }

  update4(dt) {
    const p = this.s.player;
    if (!this.gPc.done && this.near(p, this.pc, 60)) this.gPc.done = true;
    if (this.surviveLeft > 0) {
      this.surviveLeft -= dt;
      this.gSurvive.text = `Hide and survive until morning (${Math.ceil(this.surviveLeft)}s)`;
      if (this.surviveLeft <= 0) {
        this.gSurvive.done = true;
        this.complete();
      }
    }
  }

  sendEmail() {
    const s = this.s;
    s.runOverlay('Email', {}, () => {
      this.gSend.done = true;
      this.pcLight.off = true;
      this.surviveLeft = 30;
      sfx.win();
      s.banner('✉️ SENT! Nobody knows it was you. Now hide until morning!', '#80ffdb');
      // The seniors get even more suspicious
      s.modeCfg = { ...s.modeCfg, seniorSpeed: 1.12, seniorSight: 190 };
    });
  }

  // ---------------- shared hooks called by GameScene ----------------

  update(time, dt) {
    if (this.done) return;
    this[`update${this.n}`]?.(dt, time);
    for (const a of this.allies) if (a.active) a.update(time);
  }

  hint(p) {
    if (this.done) return null;
    if (this.n === 2) {
      const w = this.photoTarget(p);
      if (w) return '📸 Take a photo (stay out of his sight!)';
      if (this.gPhotos.done && this.atMyDoor(p)) return 'Save the photos in your room';
    }
    if (this.n === 3) {
      const w = this.witnessAt(p);
      if (w) return `Talk to ${w.name} (Room ${w.room})`;
      if (this.gTalk.done && this.atMyDoor(p)) return 'Go into your room';
    }
    if (this.n === 4 && !this.gSend.done && this.near(p, this.pc, 60)) return '✉️ Write the anti-ragging complaint';
    if (this.n === 1 && this.gInside.done && this.atMyDoor(p)) return 'Go into your room (111)';
    return null;
  }

  // Returns true if the ACTION was used by the story
  action(time, p) {
    if (this.done) return false;
    if (this.n === 1 && this.gInside.done && this.atMyDoor(p)) {
      this.gRoom.done = true;
      this.complete();
      return true;
    }
    if (this.n === 2) {
      const w = this.photoTarget(p);
      if (w) { this.takePhoto(p, w); return true; }
      if (this.gPhotos.done && this.atMyDoor(p)) { this.gSave.done = true; this.complete(); return true; }
    }
    if (this.n === 3) {
      const w = this.witnessAt(p);
      if (w) { this.talk(time, w); return true; }
      if (this.gTalk.done && this.atMyDoor(p)) { this.gBack.done = true; this.complete(); return true; }
    }
    if (this.n === 4 && !this.gSend.done && this.near(p, this.pc, 60)) {
      this.sendEmail();
      return true;
    }
    return false;
  }

  onCaught() {
    if (this.n === 2) this.losePhotos();
  }

  status() {
    return this.goals.map((g) => `${g.done ? '✅' : '⬜'} ${g.text}`);
  }

  complete() {
    if (this.done) return;
    this.done = true;
    this.s.storyComplete();
  }
}

