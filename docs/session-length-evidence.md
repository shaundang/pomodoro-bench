# Session length & break evidence

Research done 2026-08-28. Written down so nobody has to search this again.

**Why this file exists:** the `PRESETS` array in [`js/app.js`](../js/app.js) carries specific
work/break minute pairs per activity. Anyone editing those numbers will want to know
what is actually backed by evidence and what is folklore. Short version: much less is
backed than the productivity internet implies, and several load-bearing numbers trace
to no study at all.

---

## Read this first if you are about to change PRESETS

1. **No study compares session lengths across activity types.** There is no research
   comparing reading vs writing vs coding block lengths. Every per-activity number in
   `PRESETS` is reasoned from mechanism, not measured. Do not add "backed by research"
   labels to them.
2. **25/5 has been tested head-to-head and it lost.** See below.
3. **The one robust ratio finding:** break length should scale with the work that
   preceded it. This is why the app has the *"Scale break to time actually focused"*
   toggle, and why every preset pair keeps at least a 1:5 ratio.
4. **A daily budget (3–4 h) has better evidence than any session length.** This is why
   the app has a daily budget bar.

---

## The one direct test of the Pomodoro preset

Smits, Wenzel & de Bruin (2025), *Behavioral Sciences*. 94 university students
randomised across an authentic 2-hour study session:

| Condition | n | Result |
|---|---|---|
| Pomodoro (fixed 25/5) | 36 | **Fastest rise in fatigue, fastest drop in motivation** |
| Flowtime (self-chosen break timing, length scaled to preceding work) | 33 | **Slowest rise in fatigue** |
| Self-regulated (student picks both) | 25 | Better than Pomodoro on fatigue and motivation |

No condition differed on productivity, task completion, or flow.

**Interpretation:** a fixed preset is a scaffold for people who will not self-regulate,
not an optimum. Duration-proportional breaks have better empirical standing than any
fixed pair.

---

## Recommended durations by activity

Evidence strength is about the **specific minute figure**, not about whether the
activity exists.

| Activity | Work (min) | Break (min) | Evidence | Rationale |
|---|---|---|---|---|
| Deep/academic reading | 30–50 | 8–10 | **Weak** | Mind-wandering takes 20–40% of reading time and rises with time-on-task (r = −0.21 with comprehension). Reading is self-paced, which protects against decrement. No study compares reading block lengths. |
| Light reading | 20–45 | 5 | **Weak** | Lower attention load. Breaks help low-demand tasks most (clerical d = .56). Length essentially unconstrained by data. |
| Study / memorisation / practice | 20–30 per block, 2–4 blocks, **spread across days** | 5–10 | **Strong for spacing, weak for block length** | Distributed practice is among the best-evidenced effects in psychology (Cepeda 2006: 839 assessments, 317 experiments). Crucially the evidence is about gaps *between* sessions (hours–days), not within-session block size. A timer's real lever here is scheduling the return visit. |
| Writing — drafting | 25–50; daily consistency matters more than length | 5–10 | **Moderate** | Boice: academics writing ~30 min/day produced 64 pages/yr vs 17 for binge writers, 157 with accountability; binge writers scored higher on depression and listed fewer creative ideas. Caveat: non-randomised, single investigator, contested by Sword (2016). |
| Writing — editing | 25–40 | 5–10 | **Weak (mechanism only)** | **No evidence that drafting and editing want different lengths.** Plausible that editing is evaluative error-detection (closer to a vigilance task, which does decay) while drafting is generative and benefits from momentum. Offer as separate presets if useful; do not claim evidence. |
| Deep work / programming | 50–90 | 10–20 | **Moderate** | Justified by *switching cost*, not flow onset: attention residue from incomplete task switches degrades the next task (Leroy 2009), and break-length meta-regression shows demanding work needs **>10 min** recovery (micro-breaks ≤10 min gave d = −.09, ns, for cognitive tasks). Skilled self-paced work resists decay, so long blocks are defensible. |
| Admin / email / shallow switching | 20–30, batched | 5 | **Moderate** | Kushlev & Dunn (N=124, within-subjects): limiting email to 3 checks/day significantly lowered daily stress vs unlimited (baseline 15.5 checks/day). Supports batching into bounded blocks; the 20–30 figure itself is not measured. |
| Planning / thinking | 25–45 | 10–15, ideally a walk | **Weak** | Breaks benefited creative tasks (d = .38, p = .006) while cognitive tasks showed nothing — the one activity where breaks have positive *performance* evidence. Length itself untested. |
| Meetings | 25–50 | 10 between | **Convention only** | The circulating "91% attentive for 15 min, attention halves after 30" figures appear only in vendor blogs with no traceable study. Calendar-default 60 min is arbitrary, but 25 is not evidence-based either. |
| Long break | trigger at ~2–3 h cumulative focused work (**not** "4 pomodoros") | 20–30 | **Weak** | Convention from Cirillo (15–30 min). Indirect support: lunch-break RCTs used 15–20 min interventions with measurable afternoon benefits; Ericsson's elite performers napped 20–30 min between blocks. |
| Daily ceiling | 3.5–4 h of genuinely demanding focused work | — | **Moderate** | Ericsson: elite violinists ~3.5 h/day in blocks with naps; benefit essentially nil past 4 h/day. Separately, an EEG study (n=18) found 7 h of mental work *with* 10-min breaks every 50 min still caused fatigue and suppressed neural network activity, cognition not recovered after 4.5 h rest. |

---

## Work:break ratio

**No study has directly optimised a ratio.** The best-supported principle is that break
length should **scale with preceding work length** — break-length meta-regression
(b = .07, p = .006, R² = .34: longer breaks → better subsequent performance) plus
Flowtime's superior fatigue trajectory.

Practical range:

- **~1:5 as a floor** — 25/5, 50/10, 90/18
- **1:3–1:4 after cognitively demanding blocks**

DeskTime's observational figures sit at 1:3 (52/17) to 1:4.3 (112/26) — but see the
down-weighted section; their own number keeps moving.

---

## What makes a break restorative

Better evidenced than break *length*, and worth more than tuning minutes.

- **Psychological detachment is the active ingredient**, independent of break mode.
- **Movement works:** 10-min physical activity breaks improved attention and executive
  function in healthcare workers (n=27, counterbalanced).
- **Nature works at small doses:** 40-second views of a green roof vs bare concrete
  reduced omission errors and improved response consistency (n=150, randomised).
- **Lunchtime park walks and relaxation exercises** (15 min/day, 10 days, two RCTs)
  improved afternoon concentration and reduced fatigue.
- **Phones are the weakest option** but "never use your phone" is overstated: they permit
  some detachment while falling short on fatigue recovery, and one 2026 within-subjects
  experiment (Yildirim & Rummel) found *no* difference vs sitting quietly. Safe claim is
  "prefer movement or nature", not "phones are forbidden".

---

## Myths — do not re-derive these

**1. "90-minute ultradian cycles should set your work blocks."**
Kleitman's BRAC is solid for sleep, contested for waking. Kripke et al. published
*"There's no basic rest-activity cycle"* in **1977**. Waking cycles, where observed,
appear to run on different mechanisms than sleep REM/NREM, and the cited 80–120 min
range is too wide to schedule against.

**2. "It takes 15–25 minutes to enter flow, so sessions must be ≥90 min."**
**No primary peer-reviewed source exists for this number.** It traces to the Flow
Research Collective / Kotler and productivity blogs. Csikszentmihalyi did not measure
flow-onset latency. The actual peer-reviewed neuroscience proposal is titled
*"First few **seconds** for flow"* — arguing onset is a seconds-scale state transition.
The corollary ("one interruption resets the 25-minute clock") is equally unsourced.

> This is the most load-bearing fake number in deep-work advice. The argument for long
> blocks does not need it — switching cost and recovery-time evidence carry it instead.
> The old `PRESETS` note for `deep` said *"Long enough to reach flow"*; that was removed
> for exactly this reason.

**3. "23 minutes 15 seconds to recover from an interruption."**
Gloria Mark's finding is that workers typically handle ~2 intervening tasks before
returning to the original — a task-sequence observation, not a refocusing cost.

**4. "Attention drops after 10–15 minutes."**
Wilson & Korn (2007) reviewed the note-taking, observational and physiological studies
behind this claim and found **little support**. Most studies also failed to account for
individual differences. Teaching folklore.

> The old `PRESETS` note for `study` said *"matches a typical attention span"* — removed
> for this reason.

**5. "25/5 specifically."**
Convention. Cirillo experimented from 2 minutes up to an hour and settled on 25 by
personal trial — reportedly constrained partly by kitchen timers maxing out near 30
minutes. Cirillo frames 25 as a starting point, not a rule. The official site gives no
rationale or evidence.

**6. "Long break after 4 pomodoros."**
Pure convention from Cirillo's book (15–30 min). No study tests the number 4, or any
pomodoro count. A cumulative-time trigger is better founded.

**7. Meeting-length numbers.** Vendor-blog citation loops, no traceable primary research.

---

## What *is* supported

**Vigilance decrement is real — in forced-pace monitoring tasks.** Well-replicated and
meta-analysed (See, Howe, Warm & Dember 1995, *Psychological Bulletin*), onset detectable
within ~10–15 min.

**But its generalisation to self-paced knowledge work is the field's known weak point.**
The strongest counter-evidence is large: 360 breast-screening experts reading mammograms
from 1,069,566 women showed accuracy *improving* with time on task — recall rate falling
4.66% → 3.24% over 200 consecutive cases, i.e. better specificity without losing
sensitivity. Authors attribute this to self-pacing and voluntary breaks.

> Do not justify short sessions by citing radar-operator vigilance studies.

**Breaks improve well-being reliably, performance unreliably.** Albulescu et al. (2022,
PLOS ONE; 22 samples, N=2,335): vigor d = .36, fatigue d = .35 (both p < .001);
**overall performance d = .16, p = .116 — not significant.** Performance gains appeared
only for creative (d = .38) and clerical (d = .56, k=2) tasks, not cognitive (d = −.09).

**Individual variation is large and partly predictable.** The vigilance decrement in
executive function is **attenuated when people work at their own chronotype's optimal
time of day**. Working memory tends to favour mornings; long-term declarative memory,
afternoons. This is the strongest single argument that one global preset is wrong.

**Spacing and retrieval practice** are the two best-evidenced learning techniques
(242 studies, 1,619 effects, 169,179 participants in the underlying reviews).

---

## Evidence deliberately down-weighted

- **DeskTime 52/17.** Large (36,000+ users) but productivity is proxied by app-category
  time, it is correlational (habits of top performers, not a causal test), and
  **DeskTime's own repeats produced 80/17 pre-pandemic and 112/26 post**. The instability
  of their own headline number is the best argument against treating any specific ratio
  as optimal. DeskTime now say there is no one-size-fits-all.
- **Pomodoro scoping review** (32 studies, N=5,270; reported r = .65 performance,
  .72 focus, −.55 fatigue). Mostly observational/self-report with only 3 RCTs; pooled
  correlations from 24 observational studies do not support causal claims.
- **Classroom micro-break study** (n=253; 90-s break every 10 min beat one 10-min break
  at the 45-min mark, 65.1% vs 56.4%). Reported d = 1.784 is implausibly large because
  analysis used *group* quiz averages, not individual data. Passive-lecture context —
  does not port to self-directed focused work.
- **"500% productivity increase in flow"** and **"90-min blocks resolve bugs 2.4× faster"**
  — no primary sources locatable; circulate only in vendor/blog material.

---

## Self-calibration guidance

Variation is large enough that per-person calibration beats any preset, and the one
experiment that tested it found self-regulated breaks beat a fixed 25/5 timer.

1. **Anchor to chronotype, not clock time** — schedule the hardest block at your personal
   peak. Most direct evidence of any personalisation lever.
2. **Use a subjective break trigger alongside the timer.** First re-read of a sentence, or
   noticing mind-wandering, beats the bell. Treat the timer as a *maximum*, not a target.
3. **Scale break length to the block just finished** (~1:5, more after demanding work).
4. **Calibrate by single-variable A/B over ~2 weeks:** hold task type and time of day
   constant, vary only block length between two candidates, track one outcome (self-rated
   fatigue at block end, or a task-specific output count). Two weeks is roughly the
   minimum for day-to-day noise to average out.
5. **Track a daily focused-work budget** (3–4 h), not just session count.

---

## What this app does as a result

Changes made on 2026-08-28 from the findings above:

| Preset | Before | After | Reason |
|---|---|---|---|
| Reading | 30/5 | **30/8** | 1:6 was below the 1:5 ratio floor |
| Admin & email | 15/3 | **25/5** | 15 min is too short; it invites the switching that batching is meant to prevent |
| Planning | 20/5 | **30/10** | The one activity with positive break-performance evidence |
| Long break floor | 15 | **20** | Recommended long break is 20–30 min |

Deep (50/10), Writing (45/15) and Study (25/5) kept their numbers.

Also added:

- **`Scale break to time actually focused`** toggle — applies the current preset's own
  `brk/work` ratio to the minutes actually focused, so cutting a 50-min block short at
  10 min yields a 2-min break rather than the full 10. This is the Flowtime-style
  proportional rule, the best-evidenced finding in the review.
- **Daily budget bar**, default 240 min, turning `--good` at target with a note that
  further focused work buys little. Better founded than session length.
- **Rewritten `PRESETS` notes** — removed the flow-onset and "typical attention span"
  claims (myths 2 and 4), and added a comment above the array stating the numbers are
  mechanism-based inference rather than measured.

Still convention-only in the code, flagged rather than fixed:

- Long break still triggers on `completedInCycle % 4 === 0`. A cumulative-time trigger
  (~2–3 h of focused work) would be better founded, but the 4-pomodoro cycle is also what
  the dot indicator visualises, so changing it is a UI change too.

---

## Sources

**Directly relevant trials and meta-analyses**

- Smits, Wenzel & de Bruin (2025), Pomodoro vs Flowtime vs self-regulated —
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12292963/
  (preprint: https://www.preprints.org/manuscript/202503.0845)
- Albulescu et al. (2022), micro-break meta-analysis —
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460
- Mammography vigilance, 360 experts, >1M screens —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10945845/
- Chronotype × vigilance decrement —
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3929366/
- EEG, 7 h work with 10-min breaks every 50 min —
  https://pubmed.ncbi.nlm.nih.gov/36948417/

**Myth-busting**

- Wilson & Korn (2007), attention beyond ten minutes —
  https://journals.sagepub.com/doi/10.1080/00986280701291291
- Basic rest–activity cycle, incl. Kripke et al. 1977 critique —
  https://en.wikipedia.org/wiki/Basic_rest%E2%80%93activity_cycle
- "First few seconds for flow" —
  https://www.sciencedirect.com/science/article/pii/S0149763422004456
- Interruption "23 minutes" misquote traced —
  https://blog.oberien.de/2023/11/05/23-minutes-15-seconds.html
- DeskTime's own revision of 52/17 — https://desktime.com/blog/52-17-updated/

**Mechanism and per-activity**

- See et al. (1995), sensitivity decrement meta-analysis —
  https://psycnet.apa.org/record/1995-20193-001
- Cepeda et al. (2006), distributed practice —
  https://www.yorku.ca/ncepeda/publications/CPVWR2006.html
- Leroy (2009), attention residue —
  https://ideas.repec.org/a/eee/jobhdp/v109y2009i2p168-181.html
- Kushlev & Dunn (2015), email frequency and stress —
  https://www.interruptions.net/literature/Kushlev-ComputHumBehav15.pdf
- Mind wandering × reading comprehension meta-analysis —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9971160/
- Boice (1997), binge vs moderation in writing —
  https://gwern.net/doc/psychology/writing/1997-boice.pdf
  (critique: https://www.research.ucsb.edu/sites/default/files/RD/docs/Write-every-day-a-mantra-dismantled.pdf)
- Ericsson 1993, replication and criticisms —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC6731745/

**Break quality**

- Lee et al., 40-second green roof micro-break —
  https://www.sciencedirect.com/science/article/abs/pii/S0272494415000328
- Sianoja et al., park walks and relaxation RCTs —
  https://www.sciencedirect.com/science/article/abs/pii/S0272494417300294
- 10-min physical activity breaks —
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11205001/
- Social media micro-breaks and incomplete recovery —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC11405873/
- Nature exposure duration as moderator (2025 meta-analysis, 93 studies; paywalled) —
  https://www.sciencedirect.com/science/article/pii/S027249442500115X
