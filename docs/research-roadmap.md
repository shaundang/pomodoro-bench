# Research roadmap — what else is there beyond session length and motivation

Research done 2026-08-28. Sibling of [`session-length-evidence.md`](session-length-evidence.md)
(how long a block should be) and [`motivation-evidence.md`](motivation-evidence.md)
(what keeps someone coming back). This file maps the *remaining* territory: every other
research area that touches a Pomodoro app, what it can actually support, and what it
cannot.

**Why this file exists.** The goal for this app is "the most valuable Pomodoro site —
gives the user real insight, real motivation." Two pillars are done. The honest finding
of this survey is that the remaining value is **not** in more timer mechanics, or more
mechanics of any kind (that lever is already measured out in `motivation-evidence.md`:
feature count predicted neither efficacy nor engagement across 92 RCTs, N=16,728). It is
in **turning the log this app already keeps into defensible personal evidence** — and in
refusing to state the insights that the data cannot support.

That points at one thing no Pomodoro app does: an **N-of-1 experiment engine** with the
statistical honesty to say "not enough data yet."

---

## Evidence tiers used below

| Tier | Meaning |
|---|---|
| **A** | Meta-analysis or large multi-lab evidence; effect size quotable |
| **B** | Several independent studies, consistent direction, effect size shaky |
| **C** | One lab, or one observational study; treat the *mechanism* as a hypothesis |
| **D** | Circulating as fact on the productivity internet, traceable to nothing solid |

---

## The shortlist, ranked

| # | Pillar | Best evidence | What it buys the user | Verdict |
|---|---|---|---|---|
| 1 | **N-of-1 self-experiment engine** | A (method), B (platforms) | Causal, personal answers instead of vibes | **Build — the differentiator** |
| 2 | **Insight integrity layer** (min-N, confounds, no false trends) | A (method) | Trust; the thing every rival gets wrong | **Build — cheap, high value** |
| 3 | **Interruption accounting + resumption cue** | B/C | The most actionable in-session insight | **Build** |
| 4 | **Estimate → actual calibration** | B | A number about the user they cannot get elsewhere | **Build, carefully worded** |
| 5 | **Break quality** (not length — length is done) | A | Breaks that actually restore | **Build small** |
| 6 | **Session-start / procrastination mode** | A (clinical), C (as an app feature) | Help at the only moment that matters: starting | **Investigate** |
| 7 | **Learning-science layer** (spacing, retrieval) | **A — strongest base in this whole survey** | Study time that sticks | **Scope decision needed** |
| 8 | **Fatigue & vigilance / how often to ask anything** | A (measurement), B (phenomenon) | Correct cadence for every prompt | **Constraint, not a feature** |
| 9 | **Daily ceiling, economics side** | B | Backs the existing budget bar | **Citation only** |
| 10 | **Time-of-day / chronotype** | **B, and weaker than it looks** | Descriptive only | **Downgrade current wording** |
| 11 | **Sound / music while working** | B | Mostly a warning | **Don't build a player** |
| 12 | **Distraction blocking** | B, mixed to null | — | **Don't build** |

---

## 1. N-of-1 self-experiment engine — the differentiator

**The gap.** Every Pomodoro app shows the user descriptive charts. None of them lets the
user *test* anything. Yet `session-length-evidence.md` concludes that the literature
cannot say which block length suits a given person for a given activity — and ends with
"instrument and measure." That is a product specification, not a limitation.

**The method exists and is standardised.** N-of-1 trials are a special case of
single-case experimental designs (SCEDs); the What Works Clearinghouse publishes evidence
standards for them, and a systematic review of reporting standards in N-of-1 studies
exists. `QuantifyMe` (MIT, 2018) is a working precedent: an open-source platform that
walked novice self-experimenters through methodologically proper single-case experiments
on their phones, automating randomisation and analysis.

**The hard numbers that must shape the design (Tier A, method literature):**

- **~28–30 measurements** gives adequate power for independent data. With positive
  autocorrelation plus ~25% added variability, some procedures need **42**.
  → In app terms: an A/B on session length needs roughly **30 sessions per arm**, not
  "try 50/10 for a week."
- **Individual-level randomization tests have low power** except for large effects, many
  measurements, and low autocorrelation. → The app must be honest that only *large*
  personal effects are detectable. A 4% difference will never surface, and promising
  otherwise is the lie this whole feature exists to avoid.
- **Randomised assignment of phase order** is what buys validity against autocorrelation.
  → The app must pick the arm, not the user. A user who chooses "50/10 today because I
  feel sharp" has destroyed the experiment (selection on the outcome).

**What to build.**

```
Experiment: "Does 50/10 beat 25/5 for my coding sessions?"
  Variable      : preset (25/5 | 50/10)
  Assignment    : app randomises per session, blocked so the arms stay balanced
  Outcome       : minutes actually focused, cut-short rate, session review rating
  Stop rule     : declared up front — 30 sessions per arm
  Progress      : 11/60 sessions — no result shown yet, by design
  Result        : difference, uncertainty, and a plain-language verdict including
                  "no detectable difference", which is a real and common result
```

Variables worth offering, all of them already logged or nearly so: preset length,
break-scaling toggle on/off, break activity type, time-of-day block, with/without
intention note, distraction tally on/off.

**Why this is the answer to "most valuable Pomodoro site."** It converts the app's
weakest claim ("these minute numbers are mechanism-based inference") into its strongest
feature: *this app will find out, for you specifically*. It is also not copyable without
the discipline of the two existing evidence docs.

**Risk to respect.** A badly built version is worse than none: it would manufacture false
confidence out of noise. Which is why pillar 2 is not optional.

---

## 2. Insight integrity layer

Not a feature users ask for; the reason they can trust everything else. Personal
informatics research (Epstein et al., lived informatics model, 2015; "Beyond Abandonment
to Next Steps", CHI 2016) found the two failure modes directly:

- As trackers get more complex, users **cannot interpret how signals interrelate** well
  enough to derive actionable insight.
- **Repeatedly failing a goal reduces usage motivation**, and abandonment often arrives
  within months. (Cross-check with `motivation-evidence.md`: the same conclusion, reached
  from the reward literature instead.)

Rules to encode, each mechanically enforceable:

| Rule | Reason |
|---|---|
| No comparison rendered below a declared minimum N | The "By hour of day" chart on 3 sessions is noise wearing a chart's clothes |
| State the N next to every insight | "Peak 10:00 — from 9 sessions" reads differently than "Peak 10:00" |
| Never state a cause from observational logs | See pillar 10 — this is exactly where rival apps overclaim |
| Regression-to-the-mean guard on rebounds | A bad week followed by an average week is not "improvement" |
| Declare weekday/weekend and category confounds | "You focus best at 21:00" is often "you only log at 21:00, on weekends" |
| A trend needs its variance shown, not just a mean | Otherwise ±0 and ±90 min look identical |
| "Not enough data yet" is a first-class result, styled neutral, never as failure | Directly counters the abandonment mechanism above |

This is also the honest fix for the existing `▲ 20% vs daily average` tile, which today
invites a causal reading of a noisy day-to-day fluctuation.

---

## 3. Interruption accounting + resumption cue

Three findings, one feature area.

### (a) Resumption has a real cost, but the famous number is fake

- **Tier D — kill on sight:** *"It takes 23 minutes to refocus after an interruption."*
  The traceable source is Mark, González & Harris (CHI 2005), an **observational study of
  24 information workers**: 57% of working spheres were interrupted, and 77% of
  interrupted tasks were resumed the same day, taking **~25 minutes on average with more
  than two intervening tasks along the way**. That is elapsed wall-clock time spent doing
  other work — it is *not* a measured "cost to regain focus", and it was never a
  controlled experiment. Do not put it in the UI.
- **Tier C — attention residue.** Leroy (2009, *JOBHDP*): part of attention stays with the
  prior task; extended by Leroy & Glomb (2024), where residue was worse under anticipated
  time pressure. Single research programme; no independent adversarial replication
  located. Usable as *mechanism*, not as a quotable effect size.
- **Tier B — where the interruption lands matters more than how long it lasts.**
  Experimental work on opportune moments (*Frontiers in Psychology*, 2024/25) finds
  resumption cost depends on task structure: interruptions at **coarse breakpoints
  (between chunks) cost less** than mid-chunk ones, and cost differed by which subtask
  boundary was hit. EEG work (2025, N=28) found interruptions hurt the main task
  regardless of their duration, but that **flexible resumption timing produced shorter
  response times**.

**The uncomfortable implication for a timer app: the break bell is itself an interruption,
fired at a clock boundary that has nothing to do with the user's task structure.** The
evidence above says that is the expensive kind. A *"finish the current sub-step, then
break"* affordance — a short bounded snooze framed as **reaching a breakpoint**, not as
**skipping rest** — is better founded than the fixed bell. This is a genuinely novel,
evidence-motivated feature and no mainstream Pomodoro app has it.

### (b) A next-step note at session end is cheap and well founded

Masicampo & Baumeister (2011, *JPSP*, five experiments): unfinished goals produced
intrusive thoughts, heightened accessibility of goal-related words, and impaired
performance on unrelated tasks — and **making a specific plan eliminated those effects**
about as well as finishing the task did. (The underlying Zeigarnik effect is more
conditional than its pop version; the plan-making result is the solid part.) The same note
doubles as the retrieval cue that the resumption literature says lowers resumption cost.
One optional text field at session end: *what is the very next step?*

### (c) Bring back the interruption tally

Cirillo's original technique had users mark internal vs external interruptions during a
pomodoro; modern apps dropped it. It is the only in-session data a timer can collect that
yields an insight the user could not have guessed — *"your cut-short sessions average 4.1
self-interruptions; your completed ones average 0.7"* — and it is the input variable for
an interruption-focused experiment under pillar 1. Two buttons, one counter.

---

## 4. Estimate → actual calibration

**The idea.** Before starting a task the user predicts how many pomodoros it needs. The
app records the actual, and over time shows a **personal multiplier per category** —
"your writing tasks take 2.4× your estimate; your admin tasks 1.1×".

**What the evidence supports:**

- **Unpacking works (Tier B).** Asking people to break a task into components produced
  longer, more accurate estimates, and the benefit grew with task complexity.
- **Prior experience with a substantial part of the same task improves accuracy (Tier B).**
- **Feedback alone is not established — this matters.** An HCI study on task-duration
  feedback in academic work found **no significant effect** on prediction accuracy or on
  broader time-management measures. A review of planning-fallacy mitigation in task apps
  lists duration feedback, distributional data, task breakdown and induced neutrality as
  candidate strategies — candidates, not settled results.

**Therefore, wording discipline:** the app may show the multiplier as **a fact about the
user's own history** ("last 20 writing tasks: 2.4× estimated"). It may not promise that
seeing it will make them a better estimator — that is the part the evidence declines to
support. The multiplier is still valuable purely as a **planning input**: multiply the
estimate rather than trying to fix the estimator. And "estimate 3 pomodoros" is itself a
small unpacking exercise, which is the part that does work.

Bonus: this is the best available outcome measure for pillar 1. Estimate accuracy is a
cleaner dependent variable than self-rated focus.

---

## 5. Break quality — length is covered, content is not

`session-length-evidence.md` settled *how long*. What happens *inside* the break is a
separate literature and it is not in that file.

- **Micro-breaks, meta-analysis (Tier A).** Albulescu et al. 2022, *PLOS ONE*: 19 records
  → 22 independent samples, **N = 2,335**. Vigor **d = .36** (p < .001), fatigue
  **d = .35** (p < .001), **overall performance d = .16, p = .116 — not significant**.
  Performance effects appeared only for *less* cognitively demanding tasks, and a
  meta-regression found **longer breaks → larger performance boost**; the authors conclude
  recovery from highly depleting work likely needs **more than 10 minutes**.
  Honest reading: short breaks reliably make you *feel* better; they do not reliably make
  you *perform* better. Worth saying out loud in the UI, because it reframes the break
  from "productivity hack" to "the thing that keeps the day survivable" — which is both
  more true and more humane.
- **Phone breaks are the weak kind (Tier B, converging but not clean).** Lunch-break
  smartphone use was associated with higher later-day emotional exhaustion; smartphone
  users under high work–home interference failed to engage in detachment, relaxation,
  mastery or control activities; EEG work suggests cortical arousal stays elevated during
  mobile interaction; a study of study-breaks found phone-based breaks aided recovery
  **less** than conventional ones (nap, walk).
  **Counter-evidence to respect:** a 2026 within-subjects experiment (Yildirim & Rummel)
  comparing smartphone breaks against sitting quietly found **no significant difference**
  in subsequent task performance or mind wandering.
  → Suggest, never scold. And log break type as an experiment variable so the user gets
  their own answer.

**Feature shape:** an optional break-activity chip (walk / stretch / eyes off screen /
nap / phone / other), one tap. Feeds the experiment engine, powers the one break insight
worth showing, costs the user almost nothing.

---

## 6. Session start / procrastination mode

For many users the Pomodoro technique's real job is not pacing — it is **starting**. That
is a different literature.

- **Malouff & Schutte (2019), *J. Counseling & Development*:** 12 RCTs, **N = 646**,
  **Hedges g = 1.18** — large. But effects were *larger* for in-person delivery, student
  samples and no-treatment controls, which is the classic signature of inflation.
- **van Eerde & Klingsieck (2018), *Educational Research Review*:** 24 studies, k = 44,
  **N = 1,173**; large reduction in procrastination, stable at follow-up; **CBT
  outperformed the other intervention types**.

**The honest translation.** These are effect sizes for *therapy* — mostly CBT, mostly
face to face. Nothing here licenses "our app reduces procrastination by g = 1.18." What it
does license is that the *content* CBT uses is the right content: task decomposition,
reducing task aversiveness, concrete first actions, if-then plans. The app already ships
if-then intentions (see `motivation-evidence.md`); the missing piece is a **start-side
affordance** — for a task the user marks aversive, offer a deliberately tiny first block
whose only stated goal is to begin, recorded as a normal session.

**Do not ship** a claim that the app treats procrastination, and do not ship
self-diagnosis scales.

---

## 7. Learning-science layer — the strongest evidence here, and a scope decision

If any of this app's users are students (the `Study` preset says they are), the
best-evidenced findings anywhere near a Pomodoro timer are not about timers at all.

- **Dunlosky et al. (2013), *Psychological Science in the Public Interest* 14(1):4–58.**
  Of ten study techniques, **practice testing and distributed practice earned the only
  "high utility" ratings** — they generalise across ages, materials and criterion tasks.
  Interleaving, elaborative interrogation and self-explanation: moderate. **Low utility:
  summarisation, highlighting, keyword mnemonic, imagery for text, and rereading** — i.e.
  most of what students actually do during a study pomodoro.
- **Cepeda et al. (2008), *Psychological Science* 19(11):1095–1102.** N > 1,350. The
  optimal study gap is a fraction of the retention interval: about **20–40% for a one-week
  target**, falling to **5–10% for a one-year target**. A review scheduler therefore needs
  to know *when the exam is*, not just apply generic intervals.

**What this enables.** A study session logs a topic; the app proposes a review slot at a
gap computed from the user's stated target date, and suggests that session be a
*retrieval* session rather than a reread. A real insight engine, resting on Tier A
evidence, and entirely absent from the Pomodoro app category.

**The scope decision, stated plainly:** this direction pulls the app toward being a
spaced-repetition scheduler — a different product with a strong incumbent (Anki). Two
defensible positions: **(a)** stay a timer and add only the *labels* ("that was a reread —
rereading is rated low utility; try recalling it closed-book next block"), which is nearly
free; or **(b)** commit to the scheduler. Position (a) first is recommended: it tests
appetite at almost no cost.

---

## 8. Fatigue, vigilance, and how often the app may ask anything

Not a feature. The constraint that governs every prompt the app shows.

- **Mind wandering is the normal state.** Killingsworth & Gilbert (2010, *Science*),
  ~250,000 experience samples: people were thinking about something other than what they
  were doing **46.9% of waking hours**. Correlational, and the happiness half of that
  paper is contested — but as a base rate it is the strongest antidote to a user's
  assumption that a scattered session was a personal failing. That framing is
  motivational *and* true, which is a rare combination in this category.
- **The vigilance decrement is real and tracks mind wandering** (converging recent work:
  accuracy falls and response-time variability rises with time on task, while probe-caught
  mind wandering rises in step). This supports the *existence* of a within-session
  decline — but it does not deliver an optimal block length, and must not be smuggled back
  in as one (see myth 2 in `session-length-evidence.md`).
- **How often may the app ask? (Tier A.)** Wrzus & Neubauer (2023, *Assessment*): across
  **347 EMA studies**, mean compliance **79.19% (SD 13.64)**. Studies that experimentally
  varied prompt count found compliance **comparable at 3, 6, 9 or 12 prompts per day** over
  14 days — but compliance **declined as studies ran beyond about a week**. A mobile-EMA
  meta-analysis found **81.9% (95% CI 79.1–84.4)**.
  → Prompt *frequency* is not the risk; prompt fatigue *over months* is. So: keep the
  once-a-day intention prompt, keep the per-session review to one tap, and consider
  letting the review prompt go dormant after a long stretch and return on a fresh-start
  boundary — a mechanism `motivation-evidence.md` already ships.

---

## 9. Daily ceiling — the citation the budget bar is missing

The daily budget bar currently rests on Ericsson (1993), rated moderate. There is a
second, independent line of evidence for a ceiling, from labour economics:

**Pencavel, *Diminishing Returns at Work* (OUP, 2018)**, reanalysing WWI/WWII British
munitions workers and 1980s Washington plywood mills: the hours–output relation is
**nonlinear** — *"below an hours threshold, output is proportional to hours; above a
threshold, output rises at a decreasing rate as hours increase"* (abstract of the paper
behind the book, Pencavel 2015, *Economic Journal* 125(589):2052) — alongside rising
probability of ill-health and accidents, found for both blue- **and white-collar** work.

> **Correction 2026-08-30.** This paragraph previously read *"productivity per hour
> declining beyond roughly 39–40 hours per week"*. **That number is wrong.** The threshold
> in this literature sits around **48–49 hours per week**: summaries of Pencavel place the
> onset of large decreasing returns above **49** weekly hours, and Brown & Baker (1942),
> surveying US armaments firms, independently identified **48**. The figure 40 appears in
> Pencavel as a *comparison point* against Denison's assumed value — not as the threshold.
> The precise threshold wording is not in the freely available abstract: read it off the
> paper or the book before quoting a single number. The **nonlinear structure** above is
> quotable as it stands.

Also worth folding into goal design (relevant to the per-skill hour goal): Locke &
Latham's meta-analytic pattern shows goal-difficulty effects **shrink as task complexity
rises** (d ≈ **0.48** for the most complex tasks vs **0.67** for the least; specific-
difficult vs do-your-best d ≈ **0.41** on the most complex), and meta-analytic work finds
**learning goals beat performance goals on complex tasks**, especially early in skill
acquisition. → For a skill you are still learning, an *hours* target is a performance goal
on a complex task, which is the weakest cell in that table. A learning-goal alternative
("what will you be able to do?") is better founded than the hour count — worth offering
alongside it, not instead of it.

---

## 10. Time-of-day and chronotype — downgrade the current wording

The app already ships **"Peak focus hours: HH:00–HH:00"**. Keep the chart; fix the claim.

- The **synchrony effect** (May, Hasher & Healey, 2023, *Perspectives on Psychological
  Science*) — performance is better when the task aligns with one's chronotype — has real
  support, strongest for **older adults** and for tasks demanding **inhibitory control**.
- But it does not survive as a general law. A 2023 *Collabra: Psychology* paper is titled,
  bluntly, *"The Interplay of Time-of-day and Chronotype Results in No General and Robust
  Cognitive Boost"*, and a 2025 systematic review in *Chronobiology International* reports
  inconsistent findings across tasks. Young-adult samples show it least reliably — likely
  most of this app's users.
- Independently: the app's hour histogram measures **when the user chose to log**, which is
  dominated by schedule, not cognition. Peak bar ≠ peak capability.

**Action:** relabel to say only what is measured — e.g. *"You log the most focus around
10:00"* — and move the causal question where it belongs: an N-of-1 experiment (pillar 1)
with randomised time-block assignment, the only way this app could ever earn the stronger
claim.

---

## 11. Sound and music — mostly a warning

- **Music with lyrics impairs cognitive tasks** (small effect); instrumental music sits
  between lyrics and silence with a much smaller impact — consistent with the **irrelevant
  speech effect**, where background speech disrupts recall of visually presented material,
  proofreading and passage comprehension. Effects are worse at higher cognitive load.
- **Non-speech noise follows an inverted U** for auditory working memory: moderate levels
  can help, high levels hurt.
- **The finding that matters most for UX:** there is documented evidence of a
  **metacognitive illusion** — people judge music to be helping their performance when it
  is not. So user preference is not evidence here, and "add lofi because users like it" is
  shipping a known illusion.

**Verdict:** do not build an audio player. If sound is ever added, instrumental only, and
expose it as an experiment variable so the illusion can be tested against the user's own
data. A short honest note in the UI beats the feature.

---

## 12. Distraction blocking — don't

RCT evidence on digital self-control tools is mixed to null: a theory-based app for
goal-directed smartphone use reduced problematic use and screen time but **was not
superior to an active control**; a mindfulness-based trial cut self-reported distraction
but **failed to reduce habitual behaviour, nomophobia or social-media time**. The
recurring qualitative finding is that **rigid blocking provokes resistance**, while
autonomy-supporting customisation does better — which aligns with this app's existing
stance (no nagging, local-only data, user sets everything). Blocking is also technically
out of reach for a static client-side site. Skip it; the interruption tally in pillar 3
delivers the insight without the enforcement.

---

## Measurement infrastructure this roadmap needs

Everything above reduces to a handful of new fields on the session record. Worth adding
early even if the features come later, because **experiments cannot be run
retroactively** and the log is the asset.

| Field | Feeds pillars | Cost to user |
|---|---|---|
| `estimatePomodoros` on a task | 4, 1 | one tap at task creation |
| `interruptionsInternal` / `interruptionsExternal` | 3, 1 | two buttons during a session |
| `nextStepNote` at session end | 3 | optional one line |
| `breakActivity` enum | 5, 1 | one chip, skippable |
| `experimentId` + `assignedArm` on the session | 1, 2 | none — app-assigned |
| `topic` + `targetDate` on study sessions | 7 | only if pillar 7 is taken |

Existing fields already sufficient: timestamps (→ 10), category, cut-short flag, minutes
focused, review rating.

---

## Suggested order

1. **Insight integrity layer (2)** — retrofit onto today's charts. Small, and the
   precondition for trusting anything after it.
2. **Interruption tally + next-step note (3)** — highest insight per line of code, and the
   tally is a needed experiment variable.
3. **Estimate → actual (4)** — gives the experiment engine its best outcome measure.
4. **N-of-1 engine (1)** — build once 2–4 have supplied the guardrails and the variables.
5. **Break-activity chip (5)**, then the **breakpoint-aware break bell (3a)**.
6. Decide **7** (learning layer) deliberately, as a product-scope call, not a feature.

---

## Dead ends — do not spend research time here

- **Optimal universal block length.** Settled as unanswerable in
  `session-length-evidence.md`; this survey found nothing new.
- **"23 minutes to refocus."** Traceable to an N=24 observational study reporting
  something else entirely (pillar 3).
- **Social / leaderboard / community anything.** Already ruled contraindicated in
  `motivation-evidence.md`.
- **Notification nagging and streak pressure.** Same file; no evidence base on the volume
  question in either direction.
- **Hours-to-expert thresholds.** Same file, at length.
- **Blocking / lock-out enforcement.** Pillar 12.

---

## Genuine gaps found while surveying

- **No study tests any Pomodoro app feature.** The entire category ships on inference.
  This app's N-of-1 engine would, ironically, be the first instrument capable of testing
  it — one user at a time.
- **No evidence located on how self-experimentation affects motivation.** Curiosity is a
  plausible engagement driver, and it is intrinsic rather than reward-based, which fits
  `motivation-evidence.md` — but this is a hypothesis, not a finding.
- **Attention residue has no independent replication.** The mechanism is load-bearing for
  pillar 3's framing while the citation base is one research programme.
- **Interruption-timing work is lab-task-based** (six-subtask sequences), not knowledge
  work. Applying "coarse breakpoints are cheaper" to a writing session is inference.
- **Phone-break restorativeness is contested** as of the 2026 null. Do not moralise about
  phones in the UI.
- **Estimate-feedback efficacy is unresolved** — one HCI study found no effect. Ship the
  multiplier as description, and treat "does seeing it improve my estimates?" as an
  experiment the app can run on its own user.

---

## Adversarial review of this file

Written 2026-08-28, immediately after the file itself, by reading it against the codebase
rather than against the literature. Everything above survives on the psychology. What
follows is where it does not survive on its own terms. Read this before acting on the
ranking.

### The tier table, applied to this file's own claims

The file grades psychology rigorously and then stops grading when it talks about the
product. Its own scale, turned inward:

| Claim in this file | Tier, honestly |
|---|---|
| "None of them lets the user *test* anything" | **D** — no market survey conducted. Exist.io ships personal correlations over a personal log; RescueTime, Rize and Toggl occupy adjacent ground. A checkable claim with nothing behind it. |
| "not copyable without the discipline of the two existing evidence docs" | **D**, and motivated. Documentation is not a moat; a competitor copies an N-of-1 screen in a sprint without reading a word of this. |
| "no mainstream Pomodoro app has it" (breakpoint-aware bell) | **D** — snooze-the-break exists widely. What is new is the *framing*, which the file presents as a mechanism. |
| "highest insight per line of code" (pillar 3) | **C** — an engineering estimate in the grammar of a finding. |
| "not enough data yet, styled neutral" defuses abandonment | **C at best** — a UX hope, asserted with more confidence than this file grants any Tier B result. |

This inconsistency is the most damaging thing in the file, because its entire authority
rests on grading evidence honestly.

### Objection 1: pillar 1 is refuted by pillar 1's own numbers

Three of this file's own statements, in sequence: 30 measurements per arm (42 with
autocorrelation) → 60–84 sessions per experiment; randomisation tests detect only *large*
effects; `session-length-evidence.md` found no general effect of block length. Between-
session variance for one human — sleep, mood, task difficulty, deadlines, illness — is
large relative to any plausible session-length effect.

The modal outcome of a completed experiment is therefore **"no detectable difference,"
after six to eight weeks of disciplined compliance**. The file calls that "a real and
common result," which is true and is also a product whose most likely output is a shrug.
Pillar 2 is what *guarantees* pillar 1 returns nothing: the two top-ranked items cancel.

Not a reason to abandon it. A decisive reason to strip it of rank 1 and of the phrase "the
answer to 'most valuable Pomodoro site'."

### Objection 2: the intervention cannot be blinded, and the method citations come from a domain where it can

You cannot hide from a user whether the timer is set to 25 or 50 minutes. The proposed
primary outcome — a session review rating — is self-reported by an unblinded participant
who holds a hypothesis. Demand characteristics enter the dependent variable directly.

The file's method sources (N-of-1 medical trials, QuantifyMe, randomisation-test power)
come from settings where blinding is achievable via placebo. Importing their power and
validity standards into an unblindable behavioural manipulation is precisely the
citation-transfer error this file correctly catches when it refuses to let CBT's g = 1.18
license an app claim.

Second, unmentioned threat: **differential attrition.** Users abandon the arm they dislike,
not both arms equally, so surviving data is biased toward their prior preference. For an
unblindable intervention this is close to automatic.

### Objection 3: the specified outcome measures the manipulation

```
Variable : preset (25/5 | 50/10)
Outcome  : minutes actually focused, cut-short rate
```

The 50/10 arm mechanically yields more minutes per session unless cut short. Comparing
per-session minutes across arms of differing nominal length measures the manipulation, not
its effect. A rate, a per-day total, or a normalised measure is required. As written this
would produce a confident wrong answer — the exact failure pillar 2 exists to prevent,
sitting inside pillar 1's own specification.

### Objection 4: "existing fields already sufficient" is false, and checkably so

The infrastructure table asserts the log already carries what pillars 1, 4 and 10 need.
The session record ([`js/app.js:1323-1335`](../js/app.js#L1323-L1335)) is eleven fields:

```
id, date, category, task, taskId, minutes, timestamp, status, type, intention, quality
```

**No field records the preset or the planned block length.** Consequences:

- The simplest descriptive question in the file's own domain — *do my 50-minute sessions get
  cut short more often than my 25-minute ones?* — is unanswerable from the existing log.
  Not underpowered: absent.
- For `status: 'skipped'`, `minutes` is elapsed, not planned, so block length is not
  recoverable by inference either. Cut-short rate is the proposed outcome.
- The table lists `experimentId` + `assignedArm` but not `presetId` / `plannedMinutes`, so
  sessions *outside* an experiment carry no length information at all — no baseline, no
  observational comparison.

The file is right that experiments cannot be run retroactively, and wrong that today's
fields suffice. Those two sentences cannot both stand.

Cost of the remedy, also checkable: the import whitelist at
[`js/app.js:2546-2560`](../js/app.js#L2546-L2560) silently drops any field not named in it
— there is a warning comment on the spot because this has bitten repeatedly. The table asks
for **eight new session fields** plus one on the task, each needing the creation site, the
whitelist, and `sync.js`'s payload and fingerprint.

### Objection 5: pillar 2 removes most of the app's visible output, and the file waves this through

Labelled "cheap, high value." Its actual first effect is to delete or neuter the peak-focus
tile, the `▲20%` tile and the hour-of-day chart.

No minimum N is stated, while 28-30/42 is stated elsewhere. If min-N is 30 *per bucket* for
an hour-of-day chart, the chart appears after roughly 200 sessions — about three months at
three sessions a day. An unstated threshold becomes whatever is convenient at implementation
time, which is the looseness the pillar exists to prevent. **State the number.**

"Regression-to-the-mean guard on rebounds" has no procedure. RTM correction needs the
reliability structure of the measure; it cannot be estimated from one user's n≈20 log. As
written it will become a vibe or be quietly dropped.

And the unresolved tension: the file cites Epstein that users abandon when they cannot
derive insight, then proposes an app that correctly reports "not enough data yet" for
months. Maximally honest, and also no reason to return. Neutral styling is asserted as the
fix; that assertion is Tier C by this file's own scale.

### Objection 6: the ranking contradicts the file's stated criterion

Pillar 7 is called **"the strongest evidence base in this whole survey"** (Tier A: Dunlosky,
Cepeda) and ranked **7th**, with only labels recommended. Pillar 1, whose own power analysis
predicts null results, is ranked **1st**. The stated reason for demoting 7 is scope risk
against Anki — a legitimate product concern, but the Verdict column is labelled by evidence
and value, not by scope. **Swap 1 and 7, or rename the column.**

### Corrections to three citations

- **Killingsworth & Gilbert, 46.9% — wrong denominator.** Self-selected iPhone-app
  volunteers, averaged across *all waking activities*: commuting, chores, showering,
  queueing. The paper itself shows wide variation by activity. The mind-wandering rate
  during self-chosen focused work is not 46.9%, so it cannot be quoted to a user mid-session
  as a base rate for that session. This file flags the happiness half as contested and then
  uses the base rate uncritically.
- **EMA compliance 79% — the file's own transfer error.** EMA participants are paid, in
  contact with researchers, over one to two weeks. This file notes the post-one-week decline
  and still uses the figure as reassurance for an unpaid consumer app used for months. The
  honest reading is that the EMA literature says close to nothing about this case.
- **Cepeda's "20-40% for a one-week target"** sits at the high end of how that result is
  usually reported. Re-derive the ratios from the paper before building any scheduler on
  them; do not take them from this file.

### Missing entirely — including the highest-value item

**0. Does the log survive?** The whole roadmap rests on "the log is the asset" and never
examines how fragile that asset is. Storage is `localStorage`, scoped per origin — the
user's data has already been split across two dev-server ports in practice, and the backup
file on disk was found empty (`sessions: []`). Every pillar above is worth zero if the log
evaporates. Unlike everything else in this file, this needs no research. **It outranks
pillar 1.**

**Construct validity of "minutes focused."** It is *minutes with the timer running*. A user
on their phone for fifty minutes logs fifty focused minutes. This is the hole beneath every
insight in the file, including the experiment engine's outcome — and pillar 2, the integrity
pillar, does not list it. Pillar 3c (interruption tally) is the nearest available patch and
is filed as an accessory to pillar 1.

**Multiplicity.** Six experiment variables, plus every pillar-2 insight, plus experiments run
in sequence, compounds the false-positive rate. A file organised around statistical honesty
does not mention multiple comparisons once.

**One user.** This app has a single user, who is its author. The file reasons about segments
— *"if any of this app's users are students (the `Study` preset says they are)"* — when the
answer is known without inference. Copy, chips and enums designed for cohorts are cost with
nobody to pay it.

### One place the file stops short of its own evidence

Albulescu gives performance **d = 0.16, p = .116 (null)**, a meta-regression favouring
*longer* breaks, and an author conclusion that depleting work needs **more than 10 minutes**.
Combine with `session-length-evidence.md` finding no defensible universal block length, and
the honest statement is: **neither number in "25/5" has support, and the meta-regression
points against the 5.** That makes the app's core loop the least-evidenced thing in the app,
and puts the shipped proportional-break feature on the same ground. The file softens this to
a humane reframing, which is weaker than its own evidence allows.

### Revised order

0. **Log durability** — export/import that verifiably round-trips, an origin-independent
   store or a real backup path. No research required, and it gates everything else.
1. **Relabel "Peak focus hours"** to what is measured. One string, correct immediately.
2. **`presetId` / `plannedMinutes` on the session record** — the field whose absence makes
   the app's own central question unanswerable, and the cheapest to add.
3. **Next-step note (3b)** and **interruption tally (3c)** — one field and two buttons; the
   tally is also the only patch available for the construct-validity hole.
4. **Pillar 7's labels** — Tier A evidence, near-zero cost, currently ranked 7th.
5. **Pillar 2 with stated numbers**, accepting that it hides most current output.
6. **Pillar 1 only if** objections 2 and 3 are answered in the design: a normalised outcome,
   a pre-registered stop rule, and an explicit statement that unblindable self-report is the
   weak link.

### What survives untouched

Pillars 3b, 3c, 10, 12; the entire **Dead ends** list; the tier discipline applied to the
psychology; the reading of Albulescu, Malouff/van Eerde, Dunlosky and the chronotype
literature. The research in this file is good. Its product reasoning is graded softer than
its sources.

---

## Sources

**N-of-1 / single-case method**
- Evidence and reporting standards in N-of-1 medical studies: a systematic review — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10354076/
- QuantifyMe: An Open-Source Automated Single-Case Experimental Design Platform — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5948910/
- Power of a randomization test in a single case multiple baseline AB design, *PLOS ONE* — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0228355
- Harvard Data Science Review, Special Issue 3: Personalized (N-of-1) Trials — https://hdsr.mitpress.mit.edu/pub/nqvadq0w/download/pdf
- Lessons Learned from Two Cohorts of Personal Informatics Self-Experiments — https://dl.acm.org/doi/10.1145/3130911

**Personal informatics / tracking abandonment**
- A Lived Informatics Model of Personal Informatics (Epstein et al., 2015) — https://homes.cs.washington.edu/~jfogarty/publications/ubicomp2015.pdf
- Beyond Abandonment to Next Steps, CHI 2016 — https://www.smunson.com/portfolio/projects/lifelogs/life_after_tracking_chi16.pdf

**Interruptions / attention residue / resumption**
- Mark, González & Harris, No Task Left Behind? Examining the Nature of Fragmented Work, CHI 2005 — https://ics.uci.edu/~gmark/CHI2005.pdf
- Leroy, Why is it so hard to do my work? *JOBHDP* 2009 — https://ideas.repec.org/a/eee/jobhdp/v109y2009i2p168-181.html
- Opportune moments for task interruptions, *Frontiers in Psychology* — https://pmc.ncbi.nlm.nih.gov/articles/PMC11775001/
- EEG Correlates of Cognitive Dynamics in Task Resumption After Interruptions — https://pmc.ncbi.nlm.nih.gov/articles/PMC11851001/
- Examining the cognitive processes underlying resumption costs, *Memory & Cognition* 2023 — https://link.springer.com/article/10.3758/s13421-023-01458-8
- Masicampo & Baumeister, Consider It Done! *JPSP* 2011 — https://www.researchgate.net/publication/51234294_Consider_It_Done_Plan_Making_Can_Eliminate_the_Cognitive_Effects_of_Unfulfilled_Goals

**Estimation / planning fallacy**
- Bridging the Gap Between Time Management Research and Task Management App Design — https://dl.acm.org/doi/fullHtml/10.1145/3663384.3663404
- "I Work Much Better by Doing Less": How Task Duration Feedback Affects Optimistic Planning Bias — https://dl.acm.org/doi/10.1145/3729176.3729182
- Roy, Christenfeld & McKenzie, Underestimating the Duration of Future Events, *Psychological Bulletin* — https://pages.ucsd.edu/~mckenzie/Royetal2005PsychBull.pdf

**Breaks / recovery**
- Albulescu et al., "Give me a break!" *PLOS ONE* 2022 — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0272460
- Effects of breaks on regaining vitality: 'conventional' vs 'smart phone' breaks — https://www.sciencedirect.com/science/article/abs/pii/S0747563215302703
- Switching on and off…: Does smartphone use obstruct recovery activities? *EJWOP* — https://www.tandfonline.com/doi/full/10.1080/1359432X.2012.711013
- Hedonic social media use during microbreaks and resource recovery, *Scientific Reports* 2024 — https://www.nature.com/articles/s41598-024-72825-x
- Why You Should Break Up With Your Smartphone During Lunch Breaks (APS summary) — https://www.psychologicalscience.org/news/minds-business/why-you-should-break-up-with-your-smartphone-during-lunch-breaks.html

**Procrastination**
- Malouff & Schutte, meta-analysis of RCTs, *J. Counseling & Development* 2019 — https://onlinelibrary.wiley.com/doi/10.1002/jcad.12243
- van Eerde & Klingsieck, Overcoming procrastination? *Educational Research Review* 2018 — https://www.sciencedirect.com/science/article/abs/pii/S1747938X18300472
- Targeting Procrastination Using Psychological Treatments: systematic review & meta-analysis — https://pmc.ncbi.nlm.nih.gov/articles/PMC6125391/

**Learning science**
- Dunlosky et al., Improving Students' Learning With Effective Learning Techniques, *PSPI* 2013 — https://journals.sagepub.com/doi/abs/10.1177/1529100612453266
- Cepeda et al., Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention, 2008 — https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf

**Mind wandering / vigilance / measurement cadence**
- Killingsworth & Gilbert, A Wandering Mind Is an Unhappy Mind, *Science* 2010 — https://dtg.sites.fas.harvard.edu/KILLINGSWORTH%20&%20GILBERT%20(2010).pdf
- Mind wandering is associated with worsening attentional vigilance, 2024 — https://pubmed.ncbi.nlm.nih.gov/39172363/
- Vigilance decrement and mind-wandering in sustained attention tasks — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10086236/
- Wrzus & Neubauer, Ecological Momentary Assessment: A Meta-Analysis on Designs, Samples, and Compliance, *Assessment* 2023 — https://journals.sagepub.com/doi/10.1177/10731911211067538
- Compliance With Mobile EMA: systematic review and meta-analysis — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7970161/

**Chronotype / time of day**
- May, Hasher & Healey, For Whom (and When) the Time Bell Tolls, *Perspectives on Psychological Science* 2023 — https://journals.sagepub.com/doi/10.1177/17456916231178553
- The Interplay of Time-of-day and Chronotype Results in No General and Robust Cognitive Boost, *Collabra* 2023 — https://online.ucpress.edu/collabra/article/9/1/88337/197502/The-Interplay-of-Time-of-day-and-Chronotype
- Chronotype and synchrony effects in human cognitive performance: a systematic review, 2025 — https://www.tandfonline.com/doi/full/10.1080/07420528.2025.2490495

**Hours / goals**
- Pencavel, *Diminishing Returns at Work: The Consequences of Long Working Hours*, OUP 2018 — https://global.oup.com/academic/product/diminishing-returns-at-work-9780190876166
- Locke & Latham, Building a Practically Useful Theory of Goal Setting — https://med.stanford.edu/content/dam/sm/s-spire/documents/PD.locke-and-latham-retrospective_Paper.pdf
- Utman, Performance Effects of Motivational State: A Meta-Analysis — http://selfdeterminationtheory.org/SDT/documents/1997_Utman_PSPR.pdf

**Sound**
- Should We Turn off the Music? Music with Lyrics Interferes with Cognitive Tasks, *Journal of Cognition* — https://journalofcognition.org/articles/10.5334/joc.273
- Evidence of a metacognitive illusion in judgments about the effects of music on cognitive performance — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10618565/
- A Review of the Effect of Noise on Cognitive Performance 2021–2023 (ICBEN) — https://www.icben.org/2023/presenting190.pdf

**Digital self-control**
- Wellspent RCT, *JMIR mHealth and uHealth* — https://mhealth.jmir.org/2026/1/e56824
- A Mobile Intervention for Self-Efficacious and Goal-Directed Smartphone Use: RCT — https://pmc.ncbi.nlm.nih.gov/articles/PMC8663477/
- Mind over Matter: Online RCT to Reduce Distraction from Smartphone Use — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7369880/

**Behaviour-change base rates (cross-check for pillar 2)**
- Harkin et al., Does Monitoring Goal Progress Promote Goal Attainment? — https://www.apa.org/pubs/journals/releases/bul-bul0000025.pdf
- Effectiveness of interventions using self-monitoring to reduce sedentary behavior — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6693254/
