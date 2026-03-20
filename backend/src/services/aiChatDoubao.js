import OpenAI from 'openai';

const SYSTEM_PROMPT = `你是学校心理健康陪伴助手，名字叫小晴。
角色是倾听陪伴，不是诊断治疗。
说话温柔、不评判、不说教。
如果学生表达自伤、自杀、不想活或极度绝望的内容，
risk_level设为high。
每次回复不超过100字，用中文。
严格返回JSON，不要其他内容：
{"reply":"回复内容","risk_level":"none|low|medium|high"}`;

function getClient() {
  const apiKey = process.env.DOUBAO_API_KEY;
  const baseURL = process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL });
}

function parseModelJson(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    const o = JSON.parse(s);
    if (o && typeof o.reply === 'string') {
      return {
        reply: o.reply.slice(0, 500),
        risk_level: ['none', 'low', 'medium', 'high'].includes(o.risk_level)
          ? o.risk_level
          : 'none',
      };
    }
  } catch (_) {}
  return null;
}

const CRISIS_RE = /不想活|自杀|自伤|死了算了|结束生命|不想活了|去死/;

export function detectCrisisInUserText(text) {
  return CRISIS_RE.test(String(text || ''));
}

/**
 * @param {Array<{role:'user'|'assistant', content:string}>} historyMessages
 * @param {string} userMessage
 * @returns {Promise<{reply:string, risk_level:string}>}
 */
export async function chatCompletion(historyMessages, userMessage) {
  const crisis = detectCrisisInUserText(userMessage);
  const client = getClient();
  const model = process.env.DOUBAO_MODEL || 'doubao-1-5-pro-32k-250115';

  if (!client) {
    if (crisis) {
      return {
        reply: '我听到你现在非常痛苦，你的感受很重要。请尽快联系身边信任的大人或拨打心理援助热线 400-161-9995，学校心理老师也会支持你。',
        risk_level: 'high',
      };
    }
    return {
      reply: '谢谢你愿意说出来，我在这里陪着你。今天有什么想聊聊的吗？',
      risk_level: 'none',
    };
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...historyMessages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 256,
  });

  const raw = res.choices?.[0]?.message?.content || '';
  const parsed = parseModelJson(raw);
  if (parsed) {
    if (crisis) parsed.risk_level = 'high';
    return parsed;
  }
  if (crisis) {
    return {
      reply: '我听到你现在很难受，请不要独自承受。请联系心理老师或拨打 400-161-9995。',
      risk_level: 'high',
    };
  }
  return { reply: raw.slice(0, 200) || '我在听，你可以继续说。', risk_level: 'none' };
}

export { SYSTEM_PROMPT };
