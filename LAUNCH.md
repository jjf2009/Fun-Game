# 🚀 Launch kit: sharing Hostel Nights

Game link: **https://jjf2009.github.io/hostel-nights/**

## Before you post (10 minutes)

1. **Merge the latest pull request** so the link preview image is live.
2. **Check the LinkedIn preview.** Paste the game link into the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) and click **Inspect**. You should see the big banner (title, characters, gameplay). This also makes LinkedIn forget any old preview.
3. **Check the WhatsApp preview.** Send the link to yourself ("Message yourself" chat). The banner should appear after a second or two. WhatsApp remembers previews, so if you shared the link before, test in a chat where you haven't.
4. **Clean the leaderboard.** In Firebase → Firestore Database → Data, delete any test entries (for example "Lucky Goat 77" in `scores_hard`) so the TOP 10 starts fresh.
5. **Play one full night on your phone** from the real link: tap PLAY, read the how-to pages, submit a score. If you're first on the board, that's a nice screenshot to post too.

## Media

- **Link preview banner:** `public/og-image.jpg` (1200×630). It's used automatically when the link is shared, and you can also post it as an image.
- **Gameplay clip and screenshots:** sent to you in the chat, not stored in the repo:
  - a 30-second MP4
  - 5 screenshots: knock & run, the warden's torch, Boss Night bikes, story photo, story email
- **Tip:** a 15–20 second screen recording from your own phone often gets more views than a polished clip, because it looks real. On Android, use the Screen record tile in quick settings. On iPhone, use Control Centre → Screen Recording. Play in landscape.

---

## WhatsApp

### Hostel / college group

> 🌙 **HOSTEL NIGHTS** is out! 🎮
>
> I made a game about our hostel life 😂
> 🚪 Knock on doors at 2 AM and RUN
> 🔦 Dodge Warden Sir's torch
> 😤 Escape the seniors
> 💣 Beat the outsider gang and Bike Bhai
> ✊ Story mode: speak up against ragging
>
> Works on phone, no download. Play with a friend online too 👥
> There's a TOP 10 leaderboard, so let's see who's the real hostel legend 🏆
>
> 👉 https://jjf2009.github.io/hostel-nights/

### Status (post the clip, with this caption)

> Made a game about hostel nights 🌙🚪🏃 Knock, run, survive. Play free 👉 jjf2009.github.io/hostel-nights

### Short "forward this" version

> 🎮 Hostel Nights: knock on doors & run from the warden 😂 Free on your phone, beat my score 👉 https://jjf2009.github.io/hostel-nights/

---

## LinkedIn (builder story)

Attach the **clip** (LinkedIn plays videos right in the feed), or the banner image if you don't use the clip.

> I built a video game about hostel life, with zero game-dev experience. 🎮🌙
>
> Everyone who lived in a hostel remembers the nights: knocking on doors and running, hiding from the warden's torch, water cuts at the worst moment. I wanted to turn those memories into something people could actually play.
>
> I'd never made a game before, so I built it with AI (Claude Code). I described what I wanted, played each version, gave feedback, and kept going. What started as "knock on doors and run" grew into:
>
> 🎮 Easy & Hard modes (seniors away on internship vs. back and bored)
> 👥 Online co-op: play with a friend on two phones, no install
> 🏍️ A Boss Night finale against an outsider gang on triple-seat bikes
> ✊ A Story mode, "Speak Up": collect proof, convince scared juniors, and file an anonymous anti-ragging complaint
> 🏆 An online TOP 10 leaderboard with random anonymous names
>
> The Story mode matters most to me. Ragging is often treated as a "tradition" that nobody questions. In the game, speaking up is how you win, and the ending points to real help (the National Anti-Ragging Helpline: 1800-180-5522).
>
> Under the hood: Phaser 3 + JavaScript, pixel art generated in code, Firebase for the leaderboard, PeerJS for peer-to-peer co-op, hosted free on GitHub Pages.
>
> What I learned: AI doesn't replace knowing what you want to build. It removes the gap between the idea and a working version, so you can test it with real people the same day.
>
> It's free and works on your phone. Try to get into the TOP 10 👇
> 🔗 https://jjf2009.github.io/hostel-nights/
>
> (All characters are fictional, and it's meant to be funny.)
>
> #GameDev #BuildInPublic #AI #ClaudeCode #IndieGame #Phaser #AntiRagging

**Tips**
- LinkedIn tends to show posts with outside links to fewer people. Many people post without the link and put it in the **first comment** instead ("Play here 👉 …"). Either way works.
- Post on a weekday morning (8–10 AM). Reply to the first comments quickly: early replies help the post spread.
- A day or two later, share a follow-up with the leaderboard ("Top score is already 12,000 😳"). Real numbers from players do well.

---

## If people find a bug

Ask them to send you a screenshot. Then open Claude Code and describe what happened, or paste the screenshot.
