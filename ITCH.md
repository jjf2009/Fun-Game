# 🎮 Publishing Hostel Nights on itch.io

About 20 minutes. Everything you need is in this repo: the upload zip, the cover image and screenshots (in `docs/itch/`), and the text to paste.

## 0. Make the upload zip

Ask Claude for a fresh `hostel-nights-itch.zip`, or make it yourself:

```
npm run build:itch
```

This builds the game and creates `hostel-nights-itch.zip` in the project folder. Upload this zip, and don't unzip it.

## 1. Create your account

1. Go to **https://itch.io/register** and sign up. The username becomes your page address: `https://USERNAME.itch.io/hostel-nights`.
2. **Tell Claude your username.** It gets put into `itchUrl` in `src/config.js`, so players on itch share your itch page. Until then they share the GitHub Pages link, which also works.

## 2. Create the project

Go to your **Dashboard → Create new project** and fill in:

| Field | What to enter |
|---|---|
| Title | `Hostel Nights` |
| Project URL | `hostel-nights` |
| Short description or tagline | `Knock. Run. Survive. Speak up. A comedy game about hostel nights.` |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | Released |
| Pricing | **No payments**, then tick **"Donations"**, suggested amount **$1** (people can tip, but it stays free) |

## 3. Upload the game

1. Under **Uploads**, click **Upload files** and choose `hostel-nights-itch.zip`.
2. Tick **"This file will be played in the browser"**.
3. Under **Embed options**:
   - **Embed in page**, viewport **960 × 540**
   - ☑ **Mobile friendly**, orientation **Landscape**
   - ☑ **Fullscreen button**
   - ☐ **Automatically start on page load**: leave this OFF. Players click to start, which also gives the game the keyboard.
   - ☐ Enable scrollbars: leave OFF

## 4. Description (copy everything between the lines)

---

**Knock. Run. Survive. Speak up.** 🌙

It's 2 AM in the boys' hostel. Knock on doors and run before the angry students catch you, dodge Warden Sir's torch, escape the seniors, survive the water cuts, and stop an outsider gang bombing the hostel.

**🎮 What's inside**
- **Arcade:** 4 nights plus a **Boss Night** finale against Bike Bhai's gang on triple-seat bikes. EASY *(seniors away on internship)* or HARD *(seniors are back, and bored)*.
- **📖 Story mode, "Speak Up":** drunk seniors drag you out of your room at 2 AM, and nobody does anything. Click photos of the ragging, convince scared juniors to give statements, and take the proof to the warden.
- **👥 Online co-op:** play with a friend on two phones or PCs. No install, just share a 4-letter code.
- **🏆 Online TOP 10** for Easy, Hard and the fastest Story run.
- Call the police, start a rebellion, hide in the bathroom, sneak your non-hosteller friend Bunty past the warden check...

**🕹️ Controls**
- **PC:** WASD / arrow keys to move · SPACE to knock or interact · ESC or P to pause · M to mute
- **Phone:** joystick on the left · ACT button on the right. Play in landscape.

*Inspired by true events. All names and characters are fictional.*
*Content note: ragging, references to drinking, cartoon bombs. No blood, and it's meant to be funny.*

If ragging happens to you or someone you know, you can report it: **National Anti-Ragging Helpline 1800-180-5522** (toll free, 24x7) · helpline@antiragging.in · or your college's anti-ragging committee. You don't have to face it alone.

**Credits**
Made by jjf2009 with AI (Claude Code) · Built with Phaser 3 · Character portraits: DiceBear "Pixel Art" (CC0) · Fonts: Pixelify Sans and Press Start 2P (SIL Open Font License) · Also playable at https://jjf2009.github.io/hostel-nights/

---

## 5. Details

| Field | What to choose |
|---|---|
| Genre | **Action** |
| Tags (up to 10) | `pixel-art`, `comedy`, `co-op`, `multiplayer`, `story-rich`, `stealth`, `india`, `college`, `top-down`, `singleplayer` |
| Inputs | Keyboard, Touchscreen |
| Multiplayer | Tick the **networked / online** multiplayer option (the game connects players directly), **2 players, co-op** |
| Languages | English |
| Average session | A few minutes |

## 6. Images and trailer

- **Cover image:** `docs/itch/cover.png` (630 × 500)
- **Screenshots**, in this order:
  1. `docs/itch/1-knock-and-run.jpg`
  2. `docs/itch/2-warden-torch.jpg`
  3. `docs/itch/3-boss-night.jpg`
  4. `docs/itch/4-story-2am.jpg`
  5. `docs/itch/5-story-evidence.jpg`
  6. `docs/itch/6-story-warden.jpg`
- **Gameplay video / trailer:** itch only takes a YouTube or Vimeo link. Upload `hostel-nights-full.mp4` (the full video Claude sent you) to YouTube; Unlisted is fine. Paste the link here.

**Theme (optional, on "Edit theme" at the top of your game page):** background `#0b0d1f`, text `#ffffff`, links and buttons `#ffe066`. This matches the game's colours.

## 7. Test, then publish

1. Set **Visibility** to **Draft** and click **Save**.
2. Open the page and check:
   - **PC:** click Run game, then play a night. Test the pause menu and the TOP 10.
   - **Phone:** open the page, play in landscape, and try the fullscreen button.
   - **Co-op:** create a room on one device and join it from another.
3. If everything works, set **Visibility** to **Public** and **Save**. 🎉
4. Share the itch link. The posts in `LAUNCH.md` work; just swap in the itch link.

## Good to know

- **Updating the game later:** run `npm run build:itch` again, then on itch go to **Edit game → Uploads**, delete the old zip, upload the new one, and tick "played in the browser" again. The page, text and images stay.
- **Saved progress on iPhone/Safari:** Safari can be strict about saving inside embedded games. Best scores and story progress might not be kept between visits there. The online TOP 10 always works.
- **The TOP 10 and co-op on itch** use the same online services as the website, so the leaderboard is shared between itch players and website players.
