export const meta = {
  name: 'build-wave',
  description: 'Pumori: build one wave of tasks in parallel - backend/frontend/generalist developers each in their own worktree, clean-context review, deterministic gate (test guard + merge + verify), capped fix rounds, conductor when stuck',
  whenToUse: 'Run by /pumori:factory when `pumori next` returns action "build". args: {milestone, wave, round_cap}',
  phases: [
    { title: 'Tests', detail: 'per task: Test Designer writes failing tests, red check commits and protects them' },
    { title: 'Build', detail: 'specialist developer per task (backend / frontend / generalist), each in an isolated git worktree, in parallel' },
    { title: 'Review', detail: 'read-only reviewer, severity tiers + evidence bar' },
    { title: 'Gate', detail: 'pumori gate: review pinned to sha, test guard, merge, verify on main' },
    { title: 'Conduct', detail: 'the architect unsticks a task that does not converge' },
  ],
}

// args: { milestone: "M1", wave: [task objects], round_cap: 3, max_parallel: 4, rolling: true }
const M = args.milestone
const CAP = args.round_cap || 3
const BAD = (args.wave || []).filter(t => typeof t !== 'object' || !t.id || !t.test_files)
if (!args.wave || !args.wave.length || BAD.length) {
  return { milestone: M, error: 'args.wave must be the full task objects from `pumori next --json` (got ' + JSON.stringify(BAD.slice(0, 2)) + ')', results: [] }
}

const DEV = {
  type: 'object',
  properties: {
    branch: { type: 'string' }, worktree: { type: 'string' }, tests_pass: { type: 'boolean' },
    did: { type: 'string' }, risks: { type: 'string' }, not_done: { type: 'string' },
    pushback: { type: 'array', items: { type: 'object' } },
  },
  required: ['branch', 'worktree', 'tests_pass', 'did'],
}
const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['APPROVE', 'CHANGES', 'NEEDS_HUMAN'] }, summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object' } }, pushback_rulings: { type: 'array', items: { type: 'object' } },
    gate: { type: 'object', properties: { ok: { type: 'boolean' }, stage: { type: 'string' }, why: { type: 'string' }, output: { type: 'string' }, environment: { type: 'boolean' } } },
  },
  required: ['verdict', 'findings'],
}
const GATE = { type: 'object', properties: { ok: { type: 'boolean' }, stage: { type: 'string' }, why: { type: 'string' }, output: { type: 'string' }, environment: { type: 'boolean' } }, required: ['ok'] }
const CONDUCT = {
  type: 'object',
  properties: { action: { type: 'string', enum: ['continue', 'simplify', 'revert', 'replan', 'escalate'] }, why: { type: 'string' }, instruction: { type: 'string' }, question_for_human: { type: ['string', 'null'] } },
  required: ['action', 'why'],
}

const RED = { type: 'object', properties: { ok: { type: 'boolean' }, results: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, ok: { type: 'boolean' }, why: { type: 'string' }, output: { type: 'string' } }, required: ['task', 'ok'] } } }, required: ['ok', 'results'] }
const testPrompt = (t, feedback) => `Mode: write failing tests for task ${t.id} of milestone ${M}. Respect the task's test budget and your checklist (could each test ever pass?).
Task JSON:
${JSON.stringify(t, null, 2)}
Write ONLY these files: ${t.test_files.join(', ')}.
They must typecheck/lint now (./verify --quick passes) and FAIL now (./verify --tests ${t.test_files.join(' ')}).
${feedback ? `Your previous attempt was rejected by the red check:\n${feedback}\nFix exactly that.` : ''}
Return a short summary.`

// tests → red check for one task, right before it is built (no waiting for the rest of the wave)
async function testsFirst(t) {
  if (!t.needs_tests) return { ok: true }
  let feedback = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (!(attempt === 1 && t.tests_prewritten)) await agent(testPrompt(t, feedback), { label: `tests:${t.id}${attempt > 1 ? ':fix' : ''}`, phase: 'Tests', agentType: 'pumori:test-designer' })
    const red = await agent(`Run: pumori commit-tests ${M} --tasks ${t.id}`, { label: `red:${t.id}`, phase: 'Tests', agentType: 'pumori:gatekeeper', schema: RED })
    const mine = (red?.results || []).find(r => r.task === t.id)
    if (red?.ok || (mine && mine.ok)) return { ok: true }
    feedback = mine ? `${mine.why || ''}\n${(mine.output || '').slice(-2000)}` : 'red check returned no result'
  }
  return { ok: false, why: feedback }
}

const devPrompt = (t, round, wt, feedback) => (round === 1 && !wt
  ? `Implement task ${t.id} (milestone ${M}). You are in a fresh git worktree branched from main.\n`
  : `Fix round ${round} for task ${t.id}. Work ONLY in the existing worktree: cd ${wt}\n`) +
  `Task JSON:\n${JSON.stringify(t, null, 2)}\n` +
  (feedback ? `\nFeedback to address (all BLOCK items, gate errors):\n${feedback}\n` : '') +
  `\nFollow your playbook: pumori start-task ${t.id} → build until the task tests pass → commit → pumori handoff ${t.id}.`

const reviewPrompt = (t, dev, prior) => `Review task ${t.id} (milestone ${M}).
Branch: ${dev.branch}
Worktree: ${dev.worktree}
Task JSON:
${JSON.stringify(t, null, 2)}
Developer handoff:
${JSON.stringify(dev, null, 2)}
${prior ? `Your previous findings (check they are fixed; rule once on any pushback):\n${prior}` : ''}
Record your verdict with pumori record review ${t.id}. If the verdict is APPROVE, immediately run \`pumori gate ${t.id}\`
(it is deterministic: test guard, merge, verify) and put its JSON output in \`gate\`. Return the verdict.`

const fmtFindings = r => (r.findings || []).map(f => `- [${f.severity}] ${f.file || ''}:${f.line || ''} ${f.trigger || ''} → ${f.consequence || ''}. Fix: ${f.fix || ''}`).join('\n')

async function buildTask(t) {
  const tf = await testsFirst(t)
  if (!tf.ok) return { task: t.id, status: 'tests_rejected', why: tf.why }
  let wt = t.resume_worktree || null, prior = null, lastDev = null
  let feedback = t.conductor_instruction ? `Conductor instruction for this attempt: ${t.conductor_instruction}` : null
  for (let round = 1; round <= CAP; round++) {
    const dev = await agent(devPrompt(t, round, wt, feedback), {
      label: `${(t.area || 'dev').slice(0, 8)}:${t.id}:r${round}`, phase: 'Build', agentType: t.dev_agent || 'pumori:developer', schema: DEV,
      ...(wt ? {} : { isolation: 'worktree' }),
    })
    if (!dev) { feedback = 'previous developer run died; start again'; continue }
    lastDev = dev
    wt = dev.worktree || wt
    if (!dev.tests_pass) { feedback = `Task tests are still failing after your round. Not done: ${dev.not_done || '?'}`; continue }

    // risk-based model from `pumori next` (Opus for contract/backend/auth/money, Sonnet for other frontend work)
    const rv = await agent(reviewPrompt(t, dev, prior), { label: `review:${t.id}:r${round}`, phase: 'Review', agentType: 'pumori:reviewer', schema: REVIEW,
      ...(t.review_model ? { model: t.review_model } : {}) })
    if (!rv) { feedback = null; continue }
    if (rv.verdict === 'NEEDS_HUMAN') return { task: t.id, status: 'needs_human', review: rv }
    if (rv.verdict === 'CHANGES') { prior = fmtFindings(rv); feedback = prior; continue }

    // the reviewer runs the gate right after approving (one fewer hand-off); fall back to the gatekeeper
    const gate = (rv.gate && typeof rv.gate.ok === 'boolean') ? rv.gate
      : await agent(`Run: pumori gate ${t.id}`, { label: `gate:${t.id}:r${round}`, phase: 'Gate', agentType: 'pumori:gatekeeper', schema: GATE })
    if (gate && gate.ok) return { task: t.id, status: 'passed', rounds: round, scope_warnings: gate.scope_warnings || [] }
    // main is dirty or not on main: not the developer's fault and a new round can't fix it (P3 v02 burned 10 rounds).
    // Retry the gate once (the next gate auto-commits team notes), then hand it to the orchestrator.
    // main is red / breaker open: a retry can't help; hand it to the orchestrator at once (it adds one fixes_main task)
    if (gate && (gate.stage === 'main-red' || gate.stage === 'circuit-open')) {
      return { task: t.id, status: 'env_blocked', stage: gate.stage, why: gate.why, output: (gate.output || '').slice(-1500),
        note: 'code is approved; once a fixes_main task lands, run pumori gate ' + t.id }
    }
    if (gate && (gate.environment || gate.stage === 'main-clean' || gate.stage === 'main-branch')) {
      const again = await agent(`Run: pumori gate ${t.id}`, { label: `gate:${t.id}:env-retry`, phase: 'Gate', agentType: 'pumori:gatekeeper', schema: GATE })
      if (again && again.ok) return { task: t.id, status: 'passed', rounds: round, scope_warnings: again.scope_warnings || [] }
      return { task: t.id, status: 'env_blocked', why: (again || gate).why, note: 'code is approved; clean main, then run pumori gate ' + t.id }
    }
    feedback = `pumori gate failed at stage "${gate?.stage}": ${gate?.why}\n${(gate?.output || '').slice(-2500)}` +
      (gate?.stage === 'merge' ? '\nRebase your branch on main (git rebase main), resolve conflicts, re-verify, commit, hand off.' : '')
    prior = null // a new head sha always needs a fresh review
  }
  const c = await agent(`Mode: unstick. Task ${t.id} did not converge in ${CAP} rounds.
Task JSON:\n${JSON.stringify(t, null, 2)}
Worktree: ${wt}\nLast developer report:\n${JSON.stringify(lastDev, null, 2)}\nLast feedback:\n${feedback}
Run your retrospective and record a decision with pumori record conductor ${t.id}.`,
  { label: `unstick:${t.id}`, phase: 'Conduct', agentType: 'pumori:architect', schema: CONDUCT })
  return { task: t.id, status: 'stuck', conductor: c }
}

phase('Tests')
// tests for the NEXT wave are written now, while this wave (usually the contract) builds; their red check
// runs later, once their dependencies are merged
const prewritePrompt = t => `Mode: write failing tests for task ${t.id} of milestone ${M}, AHEAD of time.
Its dependencies (${(t.deps || []).join(', ')}) are being built right now and aren't merged yet. Write against
the names in docs/architecture.md and the task JSON (shared schema names, routes, component stub paths/props).
Write the files under the HOLDING FOLDER ${t.prewrite_dir}/ (keeping their paths, e.g. ${t.prewrite_dir}/${t.test_files[0]}), NOT in place:
unmerged references would break the project's type check. The red check moves them into place once the dependencies merge.
Do NOT run ./verify or any tests now.
Respect the test budget and your checklist (could each test ever pass?).
Task JSON:
${JSON.stringify(t, null, 2)}
Write ONLY these files (under the holding folder): ${t.test_files.join(', ')}. Return a short summary.`
// Rolling scheduling: keep up to max_parallel tasks running; after every merge, ask `pumori ready` for tasks of
// this milestone that just became unblocked and start them at once, instead of waiting for the whole wave.
const CAPN = Math.max(1, args.max_parallel || 4)
const READY = { type: 'object', properties: { milestone: { type: 'string' }, ready: { type: 'array', items: { type: 'object' } } }, required: ['ready'] }
const queue = [...(args.wave || [])]
const started = new Set()
const running = new Map()
const results = []
const startTask = t => {
  started.add(t.id)
  running.set(t.id, buildTask(t).then(r => ({ t, r }), e => ({ t, r: { task: t.id, status: 'error', why: String(e) } })))
}
const fetchReady = async () => {
  const r = await agent(`Run: pumori ready ${M} --exclude ${[...started].join(',') || 'none'} --limit ${CAPN}`,
    { label: `ready:${M}`, phase: 'Build', agentType: 'pumori:gatekeeper', schema: READY })
  return (r?.ready || []).filter(t => t && t.id && Array.isArray(t.test_files) && !started.has(t.id) && !queue.some(q => q.id === t.id))
}
const prewriting = parallel((args.prewrite || []).map(t => () => agent(prewritePrompt(t), { label: `pretests:${t.id}`, phase: 'Tests', agentType: 'pumori:test-designer' })))
while (queue.length || running.size) {
  while (queue.length && running.size < CAPN) startTask(queue.shift())
  if (!running.size) break
  const { t, r } = await Promise.race(running.values())
  running.delete(t.id)
  results.push(r || { task: t.id, status: 'error' })
  if (args.rolling !== false && r && r.status === 'passed' && running.size + queue.length < CAPN) {
    for (const n of await fetchReady()) queue.push(n)
  }
}
await prewriting
const summary = results
log(summary.map(r => `${r.task}: ${r.status}`).join(' · '))
return { milestone: M, results: summary }
