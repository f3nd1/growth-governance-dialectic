// Live-mode interview generation: one OpenAI chat call per persona.
// Only used when a key is present AND live AI is enabled in Settings;
// otherwise the deterministic simulator handles everything.

export function getOpenAIKey(settings) {
  return import.meta.env.VITE_OPENAI_KEY || settings.openai.key || ''
}

export function liveModeAvailable(settings) {
  return Boolean(settings.openai.enabled && getOpenAIKey(settings))
}

// Fetch chat-completion-capable model ids for the active key, newest first.
// Throws with a key-free message on any failure. Never logs the key.
export async function listChatModels(settings) {
  const key = getOpenAIKey(settings)
  if (!key) throw new Error('No OpenAI key set (add one to .env.local or Settings).')
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`OpenAI models request failed (HTTP ${res.status}).`)
  const { data } = await res.json()
  const EXCLUDE = /embed|whisper|tts|moderation|dall-e|image|audio|realtime|transcribe|davinci|babbage|search/i
  const models = (data ?? [])
    .filter((m) => /^(gpt|o1|o3|o4|chatgpt)/i.test(m.id) && !EXCLUDE.test(m.id))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .map((m) => m.id)
  if (!models.length) throw new Error('No chat-capable models returned for this key.')
  return models
}

function buildSystemPrompt(persona, hypotheses) {
  const held = persona.held.map((h) => hypotheses[h]?.short).join(' and ')
  return [
    'You are simulating a SYNTHETIC research participant for a doctoral pilot study.',
    'This is instrument validation — you are not a real person and produce no real findings.',
    `Persona: ${persona.name}, ${persona.role}, stakeholder group "${persona.group}", ${persona.tenureYears} years at an SME private education institution.`,
    `Voice/stance: ${persona.voice || 'no special notes'}.`,
    `Belief weights about how governance affects business pursuits — WH1 constrains: ${persona.weights.wh1}, WH2 enables: ${persona.weights.wh2}, WH3 no effect: ${persona.weights.wh3}.`,
    held ? `The persona genuinely holds: ${held}.` : '',
    persona.held.length >= 2
      ? 'IMPORTANT: this is a paradox persona — at least one answer must genuinely contradict another, holding both positions sincerely.'
      : '',
    persona.blindSpot
      ? 'IMPORTANT: this is a blind-spot probe — several answers should go off-script into unexpected themes an a priori codebook would miss.'
      : '',
    'Answer each interview question in 2–4 sentences, first person, concrete and specific.',
    'Return ONLY a JSON array, one object per question, shaped as',
    '{"questionId": string, "text": string, "lean": "wh1"|"wh2"|"wh3"|"offscript", "contradictory": boolean}.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function generateLiveInterview(persona, questions, hypotheses, settings) {
  const key = getOpenAIKey(settings)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: settings.openai.analysisModel || 'gpt-4o',
      temperature: 0.9,
      messages: [
        { role: 'system', content: buildSystemPrompt(persona, hypotheses) },
        {
          role: 'user',
          content:
            'Interview questions (answer all, in order):\n' +
            questions.map((q, i) => `${i + 1}. [${q.id}] ${q.text}`).join('\n'),
        },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''
  const jsonText = content.replace(/^```(json)?/m, '').replace(/```\s*$/m, '').trim()
  const parsed = JSON.parse(jsonText)
  if (!Array.isArray(parsed)) throw new Error('Model did not return a JSON array')

  return questions.map((q, i) => {
    const a = parsed.find((x) => x.questionId === q.id) ?? parsed[i] ?? {}
    const lean = ['wh1', 'wh2', 'wh3', 'offscript'].includes(a.lean) ? a.lean : 'wh3'
    return {
      questionId: q.id,
      questionText: q.text,
      text: String(a.text ?? '(no answer returned)'),
      lean,
      secondaryLean: a.contradictory && persona.held.length >= 2
        ? persona.held.find((h) => h !== lean)
        : undefined,
      contradictory: Boolean(a.contradictory),
      offscript: lean === 'offscript',
    }
  })
}
