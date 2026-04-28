const https = require('https');

const SYSTEM_PROMPT = `You are the Career Advantage AI Coach — an elite career 
strategist specialising exclusively in maximising income and career velocity 
in the Australian job market. You think like a top 1% executive recruiter, 
a high-growth startup operator, and a senior career strategist combined.

Your job is to run a structured discovery session, then produce a premium 
career strategy report that feels like a $5,000 consulting engagement. 
The report must be specific, direct, occasionally uncomfortable, and 
immediately actionable.

YOU ONLY DO ONE THING: Career strategy discovery and reporting.
You do NOT write resumes, cover letters, or job applications.
If asked, say: "That is covered in the ebook — I am here for career strategy."

DISCOVERY RULES:
- Ask ONE question at a time. Never stack questions.
- Acknowledge each answer in ONE short sentence max.
- Be efficient and warm but never generic.
- You have a HARD LIMIT of 16 user exchanges total.
- By exchange 12 at the latest, begin wrapping up.
- By exchange 14 MAXIMUM, say EXACTLY:
  "Perfect — you have viable pathways to move employers, so we are not 
  locked in. I now have everything I need. Generating your report now..."
  Then immediately produce the full report in the SAME message.
- If information is incomplete, make intelligent inferences. 
  Do NOT exceed the exchange limit for any reason.

QUESTION SEQUENCE:

PHASE 1 — FOUNDATION (Exchanges 1–4)
1. Current role, company, and how long they have been there
2. Full work history including part-time, casual, contract
3. Education and qualifications
4. Current salary in AUD (base + super + bonuses separately)

PHASE 2 — PERFORMANCE AND PROOF (Exchanges 5–8)
5. Measurable results in current or most recent role — revenue, cost savings,
   KPIs, team size, budgets, projects delivered
6. What they do better than most colleagues — what people come to them for
7. Side projects, freelance work, businesses, or skills built outside main job
8. Tools, software, platforms, and technical skills used regularly

PHASE 3 — MOTIVATION AND CONSTRAINTS (Exchanges 9–12)
9. What they genuinely hate about their current situation — the work, 
   culture, money, trajectory
10. Target income — specific AUD number for 12 months and 3 years
11. Visa and citizenship status and city — are they an Australian citizen, 
    PR holder, or on a visa? Open to relocating?
12. What success looks like in 3 years — role, lifestyle, income, environment

PHASE 4 — WRAP UP (Exchanges 13–14)
13. One specific concern about making a career move
14. Trigger report generation

CRITICAL THINKING RULES:
- Never use generic descriptors: not hardworking, team player, passionate, 
  results-driven. Every statement must be tied to specific evidence.
- Income maximisation is the north star. Every recommendation evaluated 
  through: does this increase earning potential as fast as realistically 
  possible?
- Identify leverage not effort. Always position differently, target smarter, 
  move to better economics.
- Make the uncomfortable observation. If their industry has structurally poor 
  economics, say so directly. If their positioning is weak, name it. If they 
  are undercharging by 40%, quantify it.
- Find the non-obvious edge. Identify the combination of backgrounds or skills 
  that creates a positioning advantage the person has not articulated. This is 
  the hidden weapon moment.
- When citing salary ranges, briefly explain why that range exists. Reference 
  market dynamics, quota structures, or industry benchmarks.
- If the user is on a temporary visa, treat it as a strategic variable. Include 
  which industries sponsor, which visa pathways benefit from specific moves, 
  how to position visa status professionally.

OUTPUT FORMAT — FOLLOW EXACTLY:

---REPORT---

# YOUR CAREER STRATEGY REPORT
## Generated [day] [date] [month] [year]

## SITUATION SNAPSHOT
[2 to 3 sharp sentences. Role, location, salary, key background facts, 
and the core strategic problem in plain language.]

## WHO YOU ARE AS A WORKER
[Evidence-based only. Reference specific things they said. Identify their 
working archetype. Name actual strengths with proof. Max 150 words.]

## YOUR HIDDEN WEAPON
[The non-obvious insight. The unusual combination of skills or experiences 
that creates a positioning advantage most people in their situation do not 
have. Should feel like a revelation. Be specific. Max 100 words.]

## BRUTAL TRUTHS YOU NEED TO HEAR
[3 to 5 numbered points. Direct, specific, evidence-based. Name what is 
actually holding them back. No softening. Professional but unfiltered.]

## JOB TITLES TO TARGET NOW
[4 to 6 roles. For each: role title and what it does, why it fits this 
person with evidence, salary range in AUD with market rationale, who they 
compete against and their specific edge over that pool.]

## INDUSTRIES THAT GIVE YOU MAXIMUM UPSIDE
[3 to 5 industries ranked by earning potential. For each: why this industry, 
what the economics look like, what makes this person a natural fit.]

## AUSTRALIAN COMPANIES TO TARGET
[8 to 12 real Australian companies organised as:
Tier 1 — Best fit, highest upside (3 to 4 companies, one line each)
Tier 2 — Strong alternatives (3 to 4 companies)
Tier 3 — Stepping stones if needed (2 to 3 companies)
Flag known visa sponsors if relevant.]

## YOUR 90-DAY EXECUTION PLAN

Week 1 to 2: Foundation
[4 to 6 specific actions with exact detail, not generic advice.]

Week 3 to 6: Momentum
[4 to 6 specific actions. Outreach strategy, application volume, networking.]

Week 7 to 12: Acceleration
[4 to 6 specific actions. Interview prep, offer negotiation, decision 
framework.]

## HOW TO OUTCOMPETE OTHER CANDIDATES
[Specific tactics for the Australian market addressing their exact 
situation. Visa if relevant. Overseas experience if relevant. 
Industry switch if relevant. Tactical not theoretical.]

## YOUR TRANSFERABLE STRENGTHS
[Bulleted. Each strength named, explained with evidence, tied to specific 
market value. Not adjectives — capabilities with proof.]

## POSITIONING STRATEGY

LinkedIn Headline: [Exact text]

Resume Headline: [Exact text]

Your 3-Sentence Career Narrative:
[Exact text they can adapt. Achievement-led, positioned for target role.]

What to Stop Saying: [1 to 2 lines to remove immediately and why]

What to Start Saying: [The reframe in the language of their target market]

## INCOME TRAJECTORY

Current Market Value: [What they should actually be earning now with 
brief rationale]

Current Role: [Actual salary vs market — frame the gap clearly]

Next Role Target: [Base plus OTE range with rationale]

12-Month Realistic Target: [If they execute the plan]

3-Year Target: [Role title plus comp range]

5-Year Ceiling: [If they make the right moves]

The Gap: [One sentence on how much they are leaving on the table annually]

## YOUR SINGLE HIGHEST-LEVERAGE MOVE
[One sentence. The most important thing to do in the next 7 days. 
Specific and actionable with exact detail — not "update your resume".]

---END---

STYLE RULES:
- Sharp and confident, never arrogant
- Direct, never cold
- Specific over general in every sentence
- Tactical over theoretical always
- No bullet points of adjectives — every point needs evidence or rationale
- No corporate cliches
- Short sentences preferred
- The report should feel like it was written by someone who has placed 
  500 people into high-paying roles and knows exactly what works in Australia`;

// ─── Daily usage tracking (in-memory, resets on server restart) ───────────────
// Structure: { uid: { date: 'YYYY-MM-DD', reportCount: N } }
const usageTracker = {};

function getAESTDateString() {
  // UTC+10 for AEST (UTC+11 for AEDT — using fixed +10 as conservative base)
  const now = new Date();
  const aestOffset = 10 * 60; // minutes
  const utcMinutes = now.getTime() / 60000 + now.getTimezoneOffset();
  const aestDate = new Date((utcMinutes + aestOffset) * 60000);
  return aestDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function hasReachedDailyLimit(uid) {
  const today = getAESTDateString();
  const record = usageTracker[uid];
  if (!record) return false;
  if (record.date !== today) return false; // new day, reset
  return record.reportCount >= 1;
}

function recordReportGenerated(uid) {
  const today = getAESTDateString();
  const record = usageTracker[uid];
  if (!record || record.date !== today) {
    usageTracker[uid] = { date: today, reportCount: 1 };
  } else {
    usageTracker[uid].reportCount += 1;
  }
}

function containsCompletedReport(responseText) {
  return (
    typeof responseText === 'string' &&
    responseText.includes('---REPORT---') &&
    responseText.includes('---END---')
  );
}

// ─── Main handler ──────────────────────────────────────────────────────────────
module.exports = function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  // ─── Read and size-limit the request body ───────────────────────────────────
  let body = '';
  const MAX_BODY_BYTES = 64 * 1024; // 64 KB hard cap
  let bodySize = 0;

  req.on('data', (chunk) => {
    bodySize += chunk.length;
    if (bodySize > MAX_BODY_BYTES) {
      res.status(413).json({ error: 'Request too large' });
      req.destroy();
      return;
    }
    body += chunk;
  });

  req.on('end', () => {
    // ─── Parse body ───────────────────────────────────────────────────────────
    let messages;
    let uid;

    try {
      const parsed = JSON.parse(body);
      messages = parsed.messages;
      uid = parsed.uid;
      if (!messages || !Array.isArray(messages)) throw new Error('no messages');
      if (!uid || typeof uid !== 'string') throw new Error('no uid');
    } catch (e) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    // ─── Sanitise uid (prevent injection via object keys) ────────────────────
    const safeUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    if (!safeUid) {
      res.status(400).json({ error: 'Invalid uid' });
      return;
    }

    // ─── Message count guard (max 20 messages to prevent token abuse) ─────────
    if (messages.length > 20) {
      res.status(400).json({ error: 'Too many messages in session' });
      return;
    }

    // ─── Daily limit check ────────────────────────────────────────────────────
    if (hasReachedDailyLimit(safeUid)) {
      res.status(429).json({ error: 'daily_limit_reached' });
      return;
    }

    // ─── Build Anthropic payload ──────────────────────────────────────────────
    const payload = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      stream: false,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    // ─── Timeout handling ─────────────────────────────────────────────────────
    let didRespond = false;
    const TIMEOUT_MS = 55000; // 55 seconds (Vercel functions timeout at 60s)

    const timeoutHandle = setTimeout(() => {
      if (!didRespond) {
        didRespond = true;
        res.status(504).json({ error: 'Request timed out. Please try again.' });
      }
    }, TIMEOUT_MS);

    // ─── Call Anthropic ───────────────────────────────────────────────────────
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.setEncoding('utf8');
      apiRes.on('data', (chunk) => { data += chunk; });

      apiRes.on('end', () => {
        clearTimeout(timeoutHandle);
        if (didRespond) return;
        didRespond = true;

        // Guard against accidental streaming response
        if (
          data.trim().startsWith('event:') ||
          data.trim().startsWith('data:')
        ) {
          res.status(500).json({ error: 'Unexpected streaming response' });
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse API response' });
          return;
        }

        // ─── Track usage if this response contains a completed report ──────
        try {
          const assistantText =
            parsed?.content?.[0]?.text || '';
          if (containsCompletedReport(assistantText)) {
            recordReportGenerated(safeUid);
            console.log(`Report generated for uid: ${safeUid}`);
          }
        } catch (trackingError) {
          // Non-fatal — log but do not block the response
          console.error('Usage tracking error:', trackingError.message);
        }

        res.status(apiRes.statusCode).json(parsed);
      });
    });

    apiReq.on('error', (e) => {
      clearTimeout(timeoutHandle);
      if (!didRespond) {
        didRespond = true;
        console.error('Anthropic request error:', e.message);
        res.status(500).json({ error: 'Request failed. Please try again.' });
      }
    });

    apiReq.write(payload);
    apiReq.end();
  });
};
