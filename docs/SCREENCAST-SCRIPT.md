# PTowl screencast — recording script

**Goal:** A 30-second screencast that lives in the README, shows the
5-keypress promise from blank-state to printed schedule + patient
magic-link share, and earns the HN reader's attention before they
scroll past.

**Total target length:** 28-32 seconds. Anything longer loses the HN
reader; anything shorter doesn't finish the story.

---

## Tools (any of these work; pick what's installed)

| Tool                         | Platform          | Output                    |
| ---------------------------- | ----------------- | ------------------------- |
| **Loom** (free tier)         | Mac/Windows       | MP4, easy embed/share URL |
| **OBS Studio** (free)        | Mac/Windows/Linux | MP4 + full control        |
| **macOS Cmd-Shift-5**        | Mac               | MOV, no install           |
| **Windows Game Bar (Win+G)** | Windows           | MP4, no install           |

**Recommendation:** macOS Cmd-Shift-5 → "Record Selected Portion" → drag
a 1280×720 box around your browser window. Drag-to-select is faster
than configuring a tool.

---

## Pre-recording setup (5 minutes once)

1. **Browser**: fresh Chrome window, no extensions visible, **incognito**
   so no autofill / saved-state weirdness. Window sized to **1280×720**
   (use a tool like Window Resizer extension, or eyeball it).
2. **Screen**: hide bookmarks bar (`Cmd-Shift-B`). Close all other tabs.
3. **Login state**: sign in to ptowl.com beforehand → land on
   `/dashboard`. The screencast starts on the dashboard, not the
   sign-in page (cuts ~10s of friction).
4. **No real patient data**: use a fake initial pair like "JS" or "AB"
   that maps to a recognizable sports figure (LeBron, Brady, etc.).
5. **Fake clinic name**: if your profile shows a real clinic, swap to
   "Sample Clinic" before recording so the schedule print preview
   doesn't expose you.

---

## The script (exact keypress sequence + what to say)

> Time markers assume a relaxed pace. If you're nervous, slow down —
> the keys are the star, not your voice. **Voiceover is OPTIONAL** —
> a silent recording with a subtitle overlay works just as well, and
> doesn't require re-recording if you flub a line.

### 00:00–00:03 — Open with the dashboard, blank-ish state

**Action:** Camera on the dashboard. Show the row of preset cards.
Cursor still.

**Voiceover (optional):**

> "PTowl. Recurring patient schedules in 5 keypresses. Here's the
> whole product."

### 00:03–00:05 — Press `2` (preset selected)

**Action:** Press the `2` key. The Sports Injury Rehab card
highlights. Initials modal opens.

**Voiceover:**

> "Two — that's the preset."

### 00:05–00:07 — Type `J`, `S` (patient initials)

**Action:** Type `JS`. The modal shows "Brady" appearing as the
auto-generated alias (sports-figure mapping in action).

**Voiceover:**

> "JS — that's the patient's initials. PTowl maps them to a sports
> alias. No real names ever stored."

### 00:07–00:09 — Press `Enter` (generate)

**Action:** Press `Enter`. Schedule preview opens with all
appointments populated.

**Voiceover:**

> "Enter. Schedule done. Five keypresses."

### 00:09–00:14 — Show the populated schedule

**Action:** Pause for ~5 seconds with the schedule visible. Optional:
hover over the table view briefly, then the calendar view. Don't
click yet.

**Voiceover:**

> "Twelve weeks of appointments. Auto-generated. The patient sees
> 'Brady,' you know it's JS."

### 00:14–00:18 — Click `Share → Send to patient`

**Action:** Click the Share button. Select "Send to patient" from
the dropdown. The /p/<token> URL is minted and copied to clipboard
(or share-sheet opens on mobile).

**Voiceover:**

> "Share to patient — text it, email it, whatever channel you use."

### 00:18–00:25 — Switch to a phone view (or a narrow browser window)

**Action:** Open the /p/<token> URL in a NEW tab sized like a phone
(or actually paste into your real phone, AirDrop the URL, and screen-
record the phone if you want max polish). Show the patient's mobile
view rendering — sports alias header, clean appointment list, "Add
to my calendar" button visible.

**Voiceover:**

> "Patient sees this on their phone. Add to calendar with one tap."

### 00:25–00:30 — Click `Add to my calendar`

**Action:** Tap "Add to my calendar". The .ics download triggers (on
mobile, it'll prompt to add to default calendar app). Optional: switch
to the calendar app to show the appointments populated.

**Voiceover:**

> "Done. Five keypresses for the provider, one tap for the patient.
> That's PTowl. Open source under AGPL-3.0. Free during beta."

### 00:30 — End

Hard cut. Don't fade. Don't add an outro card. The HN reader is
already gone or hooked.

---

## Post-production (5 minutes)

1. **Trim** to under 32 seconds total.
2. **Add subtitle overlays** for each keypress: a small caption at
   the bottom showing `[2]`, `[J]`, `[S]`, `[Enter]`, `[Share]`,
   `[Add to Calendar]` as they happen. This makes the silent version
   land. Most recording tools (Loom, OBS, macOS Cmd-Shift-5) let you
   add captions in post.
3. **Optimize file size**:
   - Target: <5 MB
   - 1280×720, 30fps, H.264, ~2 Mbps bitrate
   - Tools: HandBrake (free, GUI), `ffmpeg -crf 28 -preset slow`, or
     Loom's auto-optimization
4. **Convert to MP4** if not already.

---

## Where the file lives

Save as **`apps/web/public/screencast.mp4`** so it's served from
ptowl.com directly. Reference in the README:

```markdown
## How it works (30-second video)

[![PTowl 30-second demo](apps/web/public/og-image.png)](apps/web/public/screencast.mp4)
```

For HN-friendlier embedding, also upload to YouTube as **unlisted** and
swap the README link to the YouTube URL. HN posts with YouTube embeds
get noticeably more click-through than self-hosted MP4s, even if the
video is identical.

---

## What NOT to do

- **Don't add a logo splash card at the start.** Wastes 3 seconds the
  HN reader doesn't have.
- **Don't show the sign-in flow.** Already-signed-in dashboard is
  the start state. Sign-in is interesting to PTs, not to HN readers.
- **Don't narrate the privacy story.** "No real names stored" is one
  line in the voiceover; longer is preachy.
- **Don't show pricing.** It's free during beta; pricing is post-launch.
- **Don't film yourself.** Solo-founder face-cams work for some
  founders; PTowl's reading is product-first.
- **Don't use a phone for the desktop portion.** PTowl on desktop
  IS the desktop product. Filming a phone screen as the whole demo
  undersells the keyboard advantage.

---

## A "B-version" if the script feels too rigid

If the above feels too produced, the **silent loop alternative**
also works:

- Just record the 5-keypress sequence + share + patient view
- No voiceover, no captions
- Set the README embed to autoplay+loop+muted
- Total runtime ~10 seconds

This is closer to Cal.com's landing-page demo style. It's less of
a "story" but it loops — visitors see it more than once if they
linger.

Pick whichever feels less stressful to record. Both work.

---

## Definition of done

- File saved at `apps/web/public/screencast.mp4` (committed) AND/OR
  uploaded to YouTube unlisted with link in README
- Total length 10-30 seconds
- File size under 5 MB
- Plays cleanly in Chrome, Safari, and Firefox
- Visible in the README on github.com/Yami566/ptowl after the public
  repo flip

When done, ping me with the URL or the file path and I'll wire up
the README embed.
