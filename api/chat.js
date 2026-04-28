const https = require('https');

const SYSTEM_PROMPT = `You are the Career Advantage AI Coach, a senior career strategist specialising in the Australian job market. Your sole purpose is to run a structured career discovery session, then produce a detailed career strategy report.

YOU ONLY DO ONE THING: Discover everything about a person's career situation and produce a strategy report. You do NOT write resumes, cover letters, or job applications. If asked, say: "I'm here for career strategy — check the ebook for resume tools."

Ask ONE question at a time about:
- Full work history (every job including part-time, casual, volunteer)
- Education and qualifications
- What they enjoy and hate at work
- Working style (team vs solo, structured vs flexible)
- Current and target income in AUD
- Visa/citizenship status (strategic context only, no legal advice)
- Location and willingness to relocate
- Dream job or lifestyle
- Openness to career switch for better pay or fit
- Biggest work frustrations
- What success looks like in 1, 3, 5 years
- Hobbies that could become paid work
- Lifestyle constraints affecting work

RULES:
- ONE question at a time, never stack questions
- Acknowledge each answer in 1 sentence then move on
- After 15-25 exchanges when you have a complete picture, say exactly: "I now have everything I need. Generating your report now..." then write the full report.

REPORT FORMAT:
---REPORT---
# YOUR CAREER STRATEGY REPORT
## SITUATION SNAPSHOT
## WHO YOU ARE AS A WORKER
## JOB TITLES TO TARGET NOW
[4-6 roles with explanation and AUD salary range each]
## INDUSTRIES THAT SUIT YOU
[3-5 industries with explanation]
## CAREER SWITCH OPTIONS
[1-3 alternatives if relevant]
## YOUR 3-YEAR ROADMAP
Year 1: [3-4 actions]
Year 2: [3-4 actions]
Year 3: [3-4 actions]
## WHAT IS HOLDING YOU BACK
## YOUR TRANSFERABLE STRENGTHS
## RESUME POSITIONING ANGLE
## INCOME POTENTIAL ASSESSMENT
## YOUR SINGLE BEST NEXT MOVE
[One sentence - most important thing to do in next 7 days]
---END---`;

module.exports = function(req, res) {
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

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let messages;
    try {
      const parsed = JSON.parse(body);
      messages = parsed.messages;
      if (!messages || !Array.isArray(messages)) throw new Error('no messages');
    } catch(e) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    const payload = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      stream: false,
      system: SYSTEM_PROMPT,
      messages: messages
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.setEncoding('utf8');
      apiRes.on('data', chunk => { data += chunk; });
      apiRes.on('end', () => {
        // Log status for debugging in Vercel logs
        console.log('Anthropic status:', apiRes.statusCode);
        console.log('Anthropic response (first 500 chars):', data.substring(0, 500));

        // If response is streaming format (starts with "event:" or "data:"), surface a clear error
        if (data.trim().startsWith('event:') || data.trim().startsWith('data:')) {
          res.status(500).json({
            error: 'Got streaming response unexpectedly',
            preview: data.substring(0, 300)
          });
          return;
        }

        try {
          const parsed = JSON.parse(data);
          // Pass through Anthropic's status code so frontend sees errors properly
          res.status(apiRes.statusCode).json(parsed);
        } catch(e) {
          res.status(500).json({
            error: 'Failed to parse Anthropic response',
            preview: data.substring(0, 300)
          });
        }
      });
    });

    apiReq.on('error', (e) => {
      res.status(500).json({ error: 'Request failed: ' + e.message });
    });

    apiReq.write(payload);
    apiReq.end();
  });
};
