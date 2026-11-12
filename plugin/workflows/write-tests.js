export const meta = {
  name: 'write-tests',
  description: 'Pumori: Test Designers write failing tests for a milestone, then the red check commits and protects them',
  whenToUse: 'Run by /pumori:factory when `pumori next` returns action "tests". args: {milestone, tasks}',
  phases: [
    { title: 'Write tests', detail: 'one Test Designer per task, black-box tests from the EARS criteria' },
    { title: 'Red check', detail: 'pumori commit-tests: tests must typecheck and fail before implementation' },
  ],
}

// args: { milestone: "M1", tasks: [task objects from `pumori next --json`] }
const M = args.milestone
const TASKS = args.tasks || []
const GATE = { type: 'object', properties: { ok: { type: 'boolean' }, results: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, ok: { type: 'boolean' }, why: { type: 'string' } }, required: ['task', 'ok'] } }, output: { type: 'string' } }, required: ['ok', 'results'] }
if (!TASKS.length || TASKS.some(t => typeof t !== 'object' || !t.test_files)) {
  return { milestone: M, ok: false, error: 'args.tasks must be the full task objects from `pumori next --json`', results: [] }
}

const designPrompt = (t, feedback) => `Mode: write failing tests for task ${t.id} of milestone ${M}. Respect the task's test budget and your checklist (could each test ever pass?).
Task JSON:
${JSON.stringify(t, null, 2)}
Write ONLY these files: ${t.test_files.join(', ')}.
They must typecheck/lint now (./verify --quick passes) and FAIL now (./verify --tests ${t.test_files.join(' ')}).
${feedback ? `Your previous attempt was rejected by the red check:\n${feedback}\nFix exactly that.` : ''}
Return a short summary.`

phase('Write tests')
await parallel(TASKS.map(t => () => agent(designPrompt(t), { label: `tests:${t.id}`, phase: 'Write tests', agentType: 'pumori:test-designer' })))

phase('Red check')
let gate = await agent(`Run: pumori commit-tests ${M} --tasks ${TASKS.map(t => t.id).join(',')}`, { label: 'red-check', phase: 'Red check', agentType: 'pumori:gatekeeper', schema: GATE })

// one repair round for tasks whose tests were rejected
const failed = (gate?.results || []).filter(r => !r.ok)
if (failed.length) {
  log(`red check rejected ${failed.map(r => r.task).join(', ')}; one repair round`)
  await parallel(failed.map(r => () => {
    const t = TASKS.find(x => x.id === r.task)
    return t ? agent(designPrompt(t, `${r.why}\n${r.output || ''}`), { label: `tests-fix:${t.id}`, phase: 'Write tests', agentType: 'pumori:test-designer' }) : null
  }))
  gate = await agent(`Run: pumori commit-tests ${M} --tasks ${failed.map(r => r.task).join(',')}`, { label: 'red-check-2', phase: 'Red check', agentType: 'pumori:gatekeeper', schema: GATE })
}
return { milestone: M, ok: !!gate?.ok, results: gate?.results || [] }
