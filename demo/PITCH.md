# Pitch and demo script

Five minutes: the problem, the live demo on call 3, the privacy proof, then questions. The
demo runs on the demo laptop against localhost, not https://call.budddy.app, so the privacy
claim is literally true on stage.

## 0. Before going on stage

- [ ] Ollama is up on the Mac mini and the tunnel answers: `curl -s localhost:11434/v1/models`
      (CLAUDE.md, **Environment**)
- [ ] Gemma is loaded: send one throwaway review, because the first load from the USB drive
      takes minutes
- [ ] `cd web && pnpm run dev` is running; http://localhost:3000 opens
- [ ] Restart the dev server after the warm-up review, so the Privacy page starts empty and
      only shows what the judges watch happen
- [ ] Chrome DevTools open on the **Network** tab, "Preserve log" on, filter cleared
- [ ] The backup recording (section 4) is open in a player, paused at the start
- [ ] Browser zoom at 125% so the back row can read it

## 1. Opening: the problem (about 1 minute)

> A BPO QA team listens to maybe 2% of calls. The other 98% nobody reviews, and that's
> where the missed disclosures and the card numbers read aloud are.
>
> The obvious fix is to send every call to ChatGPT. You can't: these calls hold card
> numbers, birthdates and addresses, and sending them to a hosted AI is a compliance
> problem on its own.
>
> CallGuard reviews every call, and the call never leaves our hardware. It runs on Gemma 4
> on our own Mac mini.

## 2. Live demo: call 3 (about 2½ minutes)

1. **Review a call** page. Click **Load sample** on `03-risky` (agent Kevin).
   > This is a real-shaped support call to a credit union. Kevin sounds polite.
2. Click **Review call**. While it runs:
   > It's going to our Gemma server, not the cloud. Watch the network tab, we'll come back
   > to it.
3. **Score.** Point at the percentage and the checklist.
   > He passes almost the whole script. Only the closing fails. A score-only spot check
   > would wave this call through.
4. **Flags**, highest severity first. Point at the high-severity `pan_spoken` flag at
   `[01:05]`.
   > But he read the customer's full card number aloud, on a recorded line. CallGuard
   > flags it as high severity, cites the exact line, and masks the number in the report
   > so the report itself doesn't leak it.
   Then the other two: the fee waiver he promised without approval at `[01:48]`, and
   "you probably did it late at night" at `[00:52]`.
5. **Coaching.** Read one note out.
   > And it drafts the coaching notes, so the team lead walks into the one-on-one ready.
6. Optional, if time: **Print / Save as PDF** for the one-page report.

What a correct run shows is in `checklist.md`, **Answer key**: closing fails, flags
`pan_spoken` [01:05], `unauthorized_promise` [01:48], `rude_or_dismissive` [00:52]. If Gemma
returns something different on stage, say what the answer key expects and move on.

## 3. Proof of privacy (about 1 minute)

1. Open **Privacy** in the nav.
   > Every request CallGuard's server sent since it started. Destination and size, never
   > the content.
   Point at the green line, "All N requests stayed on our own hardware", and the Gemma
   rows marked self-hosted.
2. Switch to the DevTools **Network** tab.
   > And from the browser's side: it only talks to our own server, `localhost`. No OpenAI,
   > no Anthropic, no Google, no analytics, no transcription service.
3. Close:
   > Every call reviewed, nothing leaves the building. That's CallGuard.

## 4. Backup recording

Record the whole of sections 2 and 3 once, on the demo laptop, at the 125% zoom, with the
network tab visible. Windows: **Win + Alt + R** (Xbox Game Bar) or OBS. Keep it under three
minutes and save it to the laptop's desktop, not only to a cloud drive, in case the venue
Wi-Fi is down.

If the live demo fails (Gemma doesn't answer, the tunnel drops, a review hangs past 30
seconds): say "here's the same run, recorded an hour ago", play the recording, and narrate
it with the same lines. Don't debug on stage.

## 5. Rehearsal

Run it once, end to end, with a timer, before 5:30 PM. Write the times here.

| Section | Target | Actual |
|---|---|---|
| 1. Opening | 1:00 | |
| 2. Live demo | 2:30 | |
| 3. Privacy proof | 1:00 | |
| **Total** | **4:30** | |

If it runs long, cut step 6 of section 2 first, then the two lesser flags in step 4.
