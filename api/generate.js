import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { action, data } = req.body || {};

  let systemPrompt;
  let userPrompt;
  let maxTokens;

  if (action === 'generate') {
    const { userName, userContact, jobTitle, company, background } = data || {};
    if (!userName || !jobTitle || !background) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    systemPrompt =
      'You are a professional CV writer for the Nigerian job market. Generate a complete, well-structured CV in HTML using only inline styles and basic tags (div, p, strong, ul, li, span). The CV must be tailored specifically to the role the candidate is applying for. Use clean, professional language. Only use information the candidate provides — do not fabricate experience, dates, or qualifications. If a section has no information, omit it entirely. Use ONLY black text (#000000) on a white background. Do not use coloured text, coloured backgrounds, or coloured borders anywhere. Use bold (<strong>) and uppercase for section headings and emphasis instead of colour. Return ONLY the HTML body content for the CV — no explanation, no markdown fences, no outer html/body tags.';
    userPrompt = `Generate a professional CV for the following person:
Name: ${userName}
Contact: ${userContact || '(none provided)'}
Applying for: ${jobTitle}${company ? ' at ' + company : ''}

Background (in their own words):
"""
${background}
"""

Structure the CV with these sections (omit any that have no information):
1. Professional summary (3–4 sentences, tailored to ${jobTitle})
2. Work Experience
3. Education
4. Skills (relevant to ${jobTitle})
5. Additional Information

Use a clean single-column layout. Wrap the entire CV in a single outer <div> with inline style "font-family: Arial, Helvetica, sans-serif; color: #000; line-height: 1.5; font-size: 12pt;". All text must be black on white — no colours of any kind. Section headings should be bold, uppercase, slightly larger (font-size: 13pt), and separated from body text by a thin black underline (border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 8px). Return clean HTML only.`;
    maxTokens = 2000;
  } else if (action === 'modify') {
    const { currentCV, request: changeReq } = data || {};
    if (!currentCV || !changeReq) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    systemPrompt =
      'You are a professional CV editor. The user will give you a CV in HTML and a requested change. Apply the change and return the updated CV HTML only. Preserve the styling and structure unless the user explicitly asks to change them. Do not fabricate information. Return only the HTML, no explanation, no markdown fences.';
    userPrompt = `Current CV HTML:
${currentCV}

Requested change: "${changeReq}"

Return the updated CV HTML only.`;
    maxTokens = 2500;
  } else if (action === 'cover-letter') {
    const { userName, jobTitle, company, background } = data || {};
    if (!userName || !jobTitle || !background) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    systemPrompt =
      'You are a professional cover letter writer for Nigerian job seekers. Write a compelling, genuine cover letter. Only use information the candidate provides — do not fabricate. Keep to 3 short paragraphs. Professional but warm tone. Return plain text only — no HTML, no markdown.';
    userPrompt = `Write a cover letter for ${userName} applying for ${jobTitle}${
      company ? ' at ' + company : ''
    }.

Their background:
"""
${background}
"""

3 paragraphs:
1. Open with why they are a fit for the role
2. Specific relevant experience and skills
3. Enthusiasm and call to action

Sign off with their name.`;
    maxTokens = 1000;
  } else {
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content.find((b) => b.type === 'text')?.text || '';
    return res.status(200).json({ ok: true, content });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
