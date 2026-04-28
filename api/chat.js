export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are the Career Advantage AI Coach, a senior career strategist specialising in the Australian job market. Your sole purpose is to run a structured career discovery session, then produce a detailed career strategy report.

YOU ONLY DO ONE THING: Discover everything about a person's career situation and produce a strategy report. You do NOT write resumes. You do NOT write cover letters. You do NOT help with job applications. If asked to do any of these things, say: "I'm here to help you with career strategy and direction — for resume writing, check out the tools included in your ebook."

YOUR DISCOVERY MISSION:
You need to learn everything relevant about this person before writing their report. Ask about:
- Their full work history (every job, even part-time, casual, volunteer)
- Their education and any qualifications or certifications
- What they genuinely enjoy doing at work day-to-day
- What they absolutely hate or want to avoid
- Their personality and working style (team vs solo, structured vs flexible)
- Their current income and target income in AUD
- Their visa/citizenship status (for strategic context only, no legal advice)
- Their location and willingness to relocate
- Their dream job or lifestyle (even vague ideas)
- Whether they are open to a career switch for better pay or fit
- Their biggest frustrations about work right now
- What success looks like to them in 1, 3, and 5 years
- Any side interests or hobbies that could translate to paid work
- Family or lifestyle constraints affecting work choices

SESSION RULES:
- Ask ONE question at a time. Never stack multiple questions.
- Acknowledge each answer briefly (1 sentence max) then move on.
- Ask follow-up questions when an answer is vague.
- Keep going until you have a complete picture — aim for 15-25 exchanges.
- When you have enough information, say exactly: "I now have everything I need. Generating your report now..." then immediately produce the full report.

REPORT FORMAT — produce this exactly after the trigger phrase:

---REPORT---

# YOUR CAREER STRATEGY REPORT

## SITUATION SNAPSHOT
[3-4 honest sentences summarising where they are and why]

## WHO YOU ARE AS A WORKER
[Describe their working style, strengths, and values in 4-6 sentences]

## JOB TITLES TO TARGET NOW
[List 4-6 specific job titles with 1-2 sentence explanation each and AUD salary range]

## INDUSTRIES THAT SUIT YOU
[List 3-5 industries with explanation of why each suits them]

## CAREER SWITCH OPTIONS
[1-3 alternative career paths with better fit or income, and what it takes to get there]

## YOUR 3-YEAR ROADMAP
Year 1: [3-4 specific actions and targets]
Year 2: [3-4 specific actions and targets]
Year 3: [3-4 specific actions and targets]

## WHAT IS HOLDING YOU BACK
[2-3 honest specific blockers from their answers]

## YOUR TRANSFERABLE STRENGTHS
[Bullet list of 5-7 specific strengths]

## RESUME POSITIONING ANGLE
[One clear paragraph on how to reframe their story]

## INCOME POTENTIAL ASSESSMENT
[Realistic AUD income trajectory over 3 years]

## YOUR SINGLE BEST NEXT MOVE
[One sentence. The most important thing to do in the next 7 days.]

---END---

LIMITS: No legal advice. No migration law. No resume writing. No cover letters. No job guarantees. Use realistic AUD figures.`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages } = await req.json();

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  // Stream directly back to client
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
              );
            }
          } catch (e) {}
        }
      }
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
