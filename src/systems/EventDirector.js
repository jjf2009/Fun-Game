// Decides when the next hostel "event" happens (gang attack, warden check, water cut).
// In the Old Days the gang attacks more often. Once security arrives, the warden checks more often.
const WEIGHTS = {
  old: { gang: 3, raid: 1, water: 2 },
  security: { gang: 1, raid: 3, water: 2 },
};

export class EventDirector {
  constructor(scene) {
    this.scene = scene;
    this.elapsed = 0;
    this.next = 10;
  }

  get interval() {
    return Math.max(9, 20 - this.scene.night * 1.5) + Math.random() * 5;
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed < this.next) return;
    this.next = this.elapsed + this.interval;
    this.trigger();
  }

  trigger() {
    const s = this.scene;
    const w = WEIGHTS[s.era];
    const options = [];
    if (!s.gang.active) options.push(['gang', w.gang]);
    if (!s.raid.active && s.timeLeft > 15) options.push(['raid', w.raid]);
    if (!s.water.cut) options.push(['water', w.water]);
    if (!options.length) return;

    let roll = Math.random() * options.reduce((sum, [, weight]) => sum + weight, 0);
    const [pick] = options.find(([, weight]) => (roll -= weight) < 0) ?? options[0];
    if (pick === 'gang') s.gang.start();
    else if (pick === 'raid') s.raid.start();
    else s.water.startCut();
  }
}
