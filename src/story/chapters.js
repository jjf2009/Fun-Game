// STORY MODE: "SPEAK UP"
// All the story text lives here, so it's easy to change the writing.
// Names are made up. Keep them fictional (no real students).

export const STORY_TITLE = 'SPEAK UP';

export const JUNIORS = {
  chintu: { name: 'Chintu', room: 203, face: 'face_j1' },
  appu: { name: 'Appu', room: 206, face: 'face_j2' },
  monty: { name: 'Monty', room: 211, face: 'face_j3' },
  golu: { name: 'Golu', room: 214, face: 'face_j4' },
};

export const CHAPTERS = [
  null, // chapters start at 1
  {
    title: 'FRESHER',
    time: '11:40 PM',
    card: [
      'Your first week in the hostel.',
      'You are coming back late from the canteen.',
      'The college security guard is asleep at the gate. As usual.',
    ],
    faces: ['face_player', 'face_senior'],
    outro: [
      'Later that night, someone knocks on your door.',
      'It is Chintu, the junior from the corridor.',
      '"Thanks for not laughing. But nobody ever does anything about it."',
      'You can\'t stop thinking about it.',
    ],
  },
  {
    title: 'EVIDENCE',
    time: '1:15 AM',
    card: [
      'The anti-ragging committee needs PROOF.',
      'Tonight the seniors are ragging juniors all over the hostel.',
      'Sneak close and take photos, without getting seen.',
    ],
    faces: ['face_senior', 'face_player'],
    outro: [
      'Three photos. Blurry, but clear enough.',
      'Photos alone are not enough, though.',
      'The juniors need to say what happened, in their own words.',
    ],
  },
  {
    title: 'WITNESSES',
    time: '12:30 AM',
    card: [
      'The juniors are scared. Who wants to be the one who complains?',
      'Knock on their rooms and talk to them.',
      'Choose your words carefully.',
    ],
    faces: ['face_j1', 'face_j2', 'face_j3', 'face_j4'],
    outro: [
      'Three statements. Three people who decided to speak up.',
      'Now it has to reach the right people...',
      'without anyone finding out who sent it.',
    ],
  },
  {
    title: 'SPEAK UP',
    time: '3:00 AM',
    card: [
      'The seniors have heard rumours: "Someone is planning to complain."',
      'They are searching the hostel tonight.',
      'Reach the common room computer and send the complaint, anonymously.',
    ],
    faces: ['face_senior', 'face_senior', 'face_player'],
    outro: [],
  },
];

// Chapter 2: the ragging scenes you photograph
export const RAGGING_SCENES = [
  { tile: [30, 6], task: 'pushups', junior: 'res1', shout: ['"50 push-ups, fresher!"', '"Faster!"', '"Count out loud!"'] },
  { tile: [23, 17], task: 'sing', junior: 'res3', shout: ['"Sing the hostel anthem!"', '"Louder!"', '"From the start!"'] },
  { tile: [7, 5], task: 'pushups', junior: 'res5', shout: ['"Introduce yourself!"', '"Name, branch, hometown!"', '"Again! Louder!"'] },
];

// Chapter 3: what each junior says, and what you can answer (good = convinces them)
export const WITNESS_TALKS = {
  chintu: {
    fear: '"If I complain, they\'ll know it was me. Then it gets worse."',
    choices: [
      { text: 'It\'s anonymous. Your name won\'t be on it.', good: true, reply: '"...Anonymous? Okay. I\'ll write down what happened."' },
      { text: 'Just complain, don\'t be a coward.', good: false, reply: '"Easy for you to say. Get out."' },
      { text: 'We\'re a lot of juniors. They can\'t fight all of us.', good: true, reply: '"You\'re right. I\'m not the only one. Count me in."' },
    ],
  },
  appu: {
    fear: '"My parents will panic if they hear about this."',
    choices: [
      { text: 'Better they hear it from you than never. You did nothing wrong.', good: true, reply: '"...Yeah. I did nothing wrong. Okay, I\'m in."' },
      { text: 'Do it or I\'ll tell everyone you\'re scared.', good: false, reply: '"Wow. You sound just like the seniors. Leave."' },
      { text: 'The committee handles it quietly. You won\'t be in trouble.', good: true, reply: '"If it stays quiet... fine. I\'ll give a statement."' },
    ],
  },
  monty: {
    fear: '"Bro, it\'s just ragging. Everyone goes through it. It\'s tradition."',
    choices: [
      { text: 'Tradition? Someone was dragged out and beaten up.', good: true, reply: '"...I didn\'t know it went that far. Okay. I\'ll speak."' },
      { text: 'Yeah, maybe you\'re right. Forget it.', good: false, reply: '"Told you. Goodnight."' },
      { text: 'If nobody says anything, next year\'s juniors get it too.', good: true, reply: '"...I wouldn\'t want that for them. Fine, I\'m in."' },
    ],
  },
  golu: {
    fear: '"What if nothing happens? Then we just made them angry."',
    choices: [
      { text: 'Ragging is a crime. Colleges must act on complaints.', good: true, reply: '"It\'s actually a crime? Then they have to listen. Okay."' },
      { text: 'Stop overthinking and sign here.', good: false, reply: '"No. Don\'t push me. Bye."' },
      { text: 'We have photos too. It won\'t be your word alone.', good: true, reply: '"Photos? Oh. Then it\'s real proof. I\'m in."' },
    ],
  },
};

// Chapter 4: what goes into the complaint email
export const EMAIL_PARTS = [
  { id: 'photos', label: '📸 Attach the 3 photos', needed: true },
  { id: 'statements', label: '📝 Attach the 3 statements', needed: true },
  { id: 'dates', label: '📅 Dates, times and places', needed: true },
  { id: 'name', label: '🙋 Your name and room number', needed: false },
];

// The ending (after chapter 4)
export const ENDING = [
  ['TWO DAYS LATER', 'The anti-ragging committee started an inquiry.\nThey had photos, statements, dates. Enough to act.'],
  ['ONE WEEK LATER', 'The seniors involved were suspended from the hostel.\nThe college finally put SPECIAL SECURITY at the gate, and they stay awake.'],
  ['NOW', 'Juniors walk the corridors at night without looking over their shoulders.\nNobody knows who sent the email. It doesn\'t matter.\nThe hostel spoke up together.'],
];

export const REAL_HELP = [
  'If ragging happens to you or someone you know, you can report it:',
  '',
  'National Anti-Ragging Helpline: 1800-180-5522 (toll free, 24x7)',
  'Email: helpline@antiragging.in',
  'Or your college\'s anti-ragging committee / squad.',
  '',
  'You don\'t have to face it alone.',
];
