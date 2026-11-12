export const meta = {
  name: 'qa-milestone',
  description: 'Pumori: QA uses the integrated app in a real browser - acceptance criteria, authz, a11y, perf, then hidden user journeys scored by independent judges',
  whenToUse: 'Run by /pumori:factory when `pumori next` returns action "qa". args: {milestone, criteria, journeys, scenarios_dir, qa_cycle}',
  phases: [
    { title: 'Boot', detail: 'start the integrated app once' },
    { title: 'Criteria', detail: 'QA walks every acceptance criterion + authz, a11y, perf, visual' },
    { title: 'Journeys', detail: 'QA runs each hidden journey as the persona and logs evidence' },
    { title: 'Judge', detail: 'independent judges with different lenses vote per journey' },
    { title: 'Design', detail: "the Designer reviews QA's screenshots against the mockups and the design guide" },
    { title: 'Shutdown', detail: 'stop the app' },
  ],
}

// args: { milestone, criteria: ["REQ-1"...], deferred: {"REQ-5": ["T7"]}, journeys: ["SC-0001"...], scenarios_dir: "/abs/path",
//         qa_cycle: 1, judge_votes: 3, lane: "S", visual_review: true, retest: ["BUG-M1-2"], accounts: 3 }
// cycle 2+ is a retest of the fixed bugs only (a full re-walk cost ~10 min per milestone in P3 v02)
const M = args.milestone
const LENSES = ['goal achieved: did the user get what they came for, end to end?',
  'data correctness: is what the user sees accurate, persisted and theirs only?',
  'experience: would this user be confused, blocked or annoyed at any step?']
const VOTES = Math.min(args.judge_votes || 3, LENSES.length)
const GATE = { type: 'object', properties: { ok: { type: 'boolean' }, output: { type: 'string' } }, required: ['ok'] }
const QA = { type: 'object', properties: { criteria_failed: { type: 'array', items: { type: 'object' } }, bugs: { type: 'array', items: { type: 'object' } }, screenshots: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['bugs'] }
const RUN = { type: 'object', properties: { journey: { type: 'string' }, log: { type: 'string' }, completed_goal: { type: 'boolean' }, notes: { type: 'string' } }, required: ['journey', 'log'] }
const VOTE = { type: 'object', properties: { satisfied: { type: 'boolean' }, reason: { type: 'string' }, user_visible_problems: { type: 'array', items: { type: 'string' } } }, required: ['satisfied', 'reason'] }

phase('Boot')
const boot = await agent('Run: pumori boot', { label: 'boot', phase: 'Boot', agentType: 'pumori:gatekeeper', schema: GATE })
if (!boot?.ok) {
  return { milestone: M, boot_failed: true, output: boot?.output, bugs: [{ id: `BUG-${M}-BOOT`, title: 'App does not start', severity: 'critical', actual: boot?.output }] }
}

const APP_NOTE = 'The app is ALREADY RUNNING (production build, started by `pumori boot`; URLs in .env). Do not start or stop it.'

phase('Criteria')
const RETEST = (args.qa_cycle || 1) > 1
const criteriaRun = RETEST
  ? agent(`Mode: retest. Milestone ${M}, QA cycle ${args.qa_cycle}. ${APP_NOTE}
Re-check only the bugs from the previous cycle (.pumori/runtime/qa/${M}/cycle-${args.qa_cycle - 1}.json; their fix tasks are merged)
${(args.retest || []).length ? `(${args.retest.join(', ')}) ` : ''}plus a 3-minute smoke of the milestone's main flow. Do not re-walk every criterion.
Record your report with pumori record qa ${M} and return it.`, { label: `qa:retest:${M}`, phase: 'Criteria', agentType: 'pumori:qa', schema: QA })
  : agent(`Mode: criteria. Milestone ${M}, QA cycle ${args.qa_cycle || 1}. ${APP_NOTE}
Lane: ${args.lane || 'M'}. Requirements to check: ${(args.criteria || []).join(', ') || '(none: explore the built features briefly)'}.
Deferred (still being built; NOT failures, do not test): ${JSON.stringify(args.deferred || {})}.
Record your report with pumori record qa ${M} and return it.`, { label: `qa:criteria:${M}`, phase: 'Criteria', agentType: 'pumori:qa', schema: QA })

// one test account per concurrent journey: judges sharing one account interfered with each other (sessions, banks)
const SLOTS = Math.max(0, args.accounts || 0)
const slotNote = id => SLOTS ? `Use ONLY QA test account slot ${((args.journeys || []).indexOf(id) % SLOTS) + 1} (the project's QA_ACCOUNT_<n>_* settings in .env, n = that slot); never another slot's account.` : ''
const journeyRuns = pipeline(args.journeys || [],
  id => agent(`Mode: journey. Milestone ${M}. ${APP_NOTE} ${slotNote(id)}
Journey file: ${args.scenarios_dir}/${id}.md
Write your run log to .pumori/runtime/qa/${M}/journeys/${id}.md and return the summary.`,
  { label: `qa:${id}`, phase: 'Journeys', agentType: 'pumori:qa', schema: RUN }),
  (run, id) => run ? parallel(LENSES.slice(0, VOTES).map((lens, k) => () => agent(`Judge journey ${id} with this lens: ${lens}
Journey file: ${args.scenarios_dir}/${id}.md
QA run log: ${run.log}
Record one vote with pumori record judge ${id}.`, { label: `judge:${id}:${k + 1}`, phase: 'Judge', agentType: 'pumori:judge', model: 'haiku', schema: VOTE })))
    .then(votes => ({ id, run, votes: votes.filter(Boolean) }))
    : { id, run: null, votes: [] })

// visual review runs as soon as QA's criteria pass has screenshots, alongside the journeys
const DESIGN = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } }, required: ['issues'] }
const designRun = criteriaRun.then(q => (args.visual_review && !RETEST && q && (q.screenshots || []).length)
  ? agent(`Mode: visual-review. Milestone ${M}. Screenshots of the built app (from QA):
${(q.screenshots || []).join('\n')}
Compare with .pumori/design/chosen.md (and its mockup screenshots) and the stack's design guide. Return only issues a user would notice.`,
    { label: `design:${M}`, phase: 'Design', agentType: 'pumori:designer', schema: DESIGN })
  : null)

const [qa, journeys, design] = await Promise.all([criteriaRun, journeyRuns, designRun])

phase('Shutdown')
await agent('Run: pumori boot stop', { label: 'stop', phase: 'Shutdown', agentType: 'pumori:gatekeeper', schema: GATE })

const jr = journeys.filter(Boolean).map(j => ({
  id: j.id, satisfied: j.votes.filter(v => v.satisfied).length * 2 > j.votes.length,
  votes: j.votes.map(v => v.satisfied), problems: j.votes.flatMap(v => v.user_visible_problems || []),
}))
log(`QA ${M}: ${qa?.bugs?.length ?? '?'} bugs, journeys ${jr.filter(j => j.satisfied).length}/${jr.length} satisfied`)
const designIssues = (design?.issues || []).filter(i => i.severity === 'major')
if (designIssues.length) log(`design review: ${designIssues.length} major issue(s)`)
return { milestone: M, qa, journeys: jr, design_issues: design?.issues || [], design_summary: design?.summary || null }
