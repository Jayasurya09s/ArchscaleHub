import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import whatsappWeb from 'whatsapp-web.js';

const app = express();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[API] ${req.method} ${req.url} - started`);
  res.on('finish', () => {
    console.log(`[API] ${req.method} ${req.url} - finished in ${Date.now() - start}ms with status ${res.statusCode}`);
  });
  next();
});
app.use(express.json({ limit: '60mb' }));

const supabase =
  process.env.SUPABASE_URL && supabaseSecretKey
    ? createClient(process.env.SUPABASE_URL, supabaseSecretKey)
    : null;

const { Client: WhatsAppWebClient, LocalAuth, MessageMedia } = whatsappWeb;
const whatsappWebState = {
  client: null,
  status: 'disconnected',
  qr: '',
  qrDataUrl: '',
  lastReadyAt: null,
  lastError: '',
  me: null,
};

const WHATSAPP_WEB_SESSION_PATHS = [
  '.wwebjs_auth/session-orbit-demo',
  '.wwebjs_cache',
];

const chatbotRuntime = {
  inbox: [],
  replies: [],
};

const COUNT_TABLES = [
  'workspaces',
  'users',
  'departments',
  'tasks',
  'task_templates',
  'ideas',
  'pipelines',
  'companies',
  'contacts',
  'deals',
  'activities',
  'message_templates',
  'reminder_rules',
  'drip_campaigns',
  'drip_nodes',
  'drip_edges',
  'drip_events',
  'drip_enrolments',
  'wa_connections',
  'message_logs',
  'portfolio_items',
  'portfolio_assets',
  'portfolio_tags',
  'portfolio_item_tags',
  'portfolio_share_links',
  'portfolio_view_events',
  'workspace_files',
  'task_attachments',
  'intranet_sections',
  'intranet_content',
  'intranet_content_attachments',
  'announcements',
  'quick_links',
  'important_dates',
  'workspace_settings',
];

const STATE_ROW_NAME = 'Orbit App State Snapshot';
const WORKSPACE_LEGACY_ID = 'orbit-default-workspace';
const DEFAULT_PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000101';
const DEFAULT_PLATFORM_WORKSPACE_ID = '00000000-0000-0000-0000-000000000201';

const DEFAULT_PIPELINE_STAGES = [
  { id: 'cold', label: 'Cold / Prospect', tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', kind: 'entry' },
  { id: 'subscriber', label: 'Subscriber', tone: 'bg-cyan-50 text-cyan-700 ring-cyan-200', dot: 'bg-cyan-500', kind: 'entry' },
  { id: 'lead', label: 'Lead', tone: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500', kind: 'normal' },
  { id: 'mql', label: 'MQL', tone: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', kind: 'normal' },
  { id: 'sql', label: 'SQL', tone: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', kind: 'normal' },
  { id: 'customer', label: 'Customer', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', kind: 'won' },
  { id: 'unqualified', label: 'Unqualified', tone: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', kind: 'dead' },
];

const DEFAULT_CRM = {
  pipelines: [
    { id: 'pl_default', name: 'Default funnel', stages: DEFAULT_PIPELINE_STAGES, form: null },
  ],
  companies: [
    { id: 'co1', name: 'Asha Interiors', city: 'Jaipur', type: 'Interior Design Studio', notes: '' },
    { id: 'co2', name: 'Verma Architects', city: 'Indore', type: 'Architecture Firm', notes: '' },
    { id: 'co3', name: 'Nirman Builders', city: 'Nagpur', type: 'Builder / Developer', notes: '' },
    { id: 'co4', name: 'Studio Saaya', city: 'Surat', type: 'Interior Design Studio', notes: '' },
  ],
  contacts: [
    { id: 'ct1', name: 'Rohit Asha', email: 'rohit@ashainteriors.in', whatsapp: '+91 98290 11111', companyId: 'co1', role: 'Principal Designer', stage: 'sql', pipelineId: 'pl_default', tags: ['studio-owner', 'tier-2'], city: 'Jaipur', source: 'Referral', notes: 'Looking to scale studio ops.', createdAt: '2026-05-02' },
    { id: 'ct2', name: 'Meena Verma', email: 'meena@vermaarch.in', whatsapp: '+91 99931 22222', companyId: 'co2', role: 'Founder', stage: 'mql', pipelineId: 'pl_default', tags: ['architect', 'tier-2'], city: 'Indore', source: 'Webinar', notes: 'Downloaded pricing guide.', createdAt: '2026-05-10' },
    { id: 'ct3', name: 'Sanjay Nirman', email: 'sanjay@nirmanbuilders.in', whatsapp: '+91 90040 33333', companyId: 'co3', role: 'MD', stage: 'lead', pipelineId: 'pl_default', tags: ['builder'], city: 'Nagpur', source: 'Cold outreach', notes: '', createdAt: '2026-05-15' },
    { id: 'ct4', name: 'Pooja Saaya', email: 'pooja@studiosaaya.in', whatsapp: '+91 97250 44444', companyId: 'co4', role: 'Creative Head', stage: 'mql', pipelineId: 'pl_default', tags: ['studio-owner', 'tier-3'], city: 'Surat', source: 'Instagram', notes: 'Engaged with reels.', createdAt: '2026-05-20' },
    { id: 'ct5', name: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', whatsapp: '+91 98111 55555', companyId: '', role: 'Independent Designer', stage: 'subscriber', pipelineId: 'pl_default', tags: ['newsletter'], city: 'Bhopal', source: 'Website', notes: '', createdAt: '2026-05-28' },
    { id: 'ct6', name: 'Kavya Rao', email: 'kavya@studiosaaya.in', whatsapp: '+91 96550 66666', companyId: 'co4', role: 'Project Manager', stage: 'customer', pipelineId: 'pl_default', tags: ['existing-client'], city: 'Surat', source: 'Referral', notes: 'Past project delivered.', createdAt: '2026-03-12' },
  ],
  deals: [
    { id: 'dl1', title: 'Studio growth program — Asha', contactId: 'ct1', companyId: 'co1', stage: 'proposal', value: 180000, expectedClose: '2026-06-20', owner: 'u1', notes: 'Proposal sent, awaiting response.', createdAt: '2026-05-18' },
    { id: 'dl2', title: 'Coaching retainer — Verma', contactId: 'ct2', companyId: 'co2', stage: 'qualified', value: 120000, expectedClose: '2026-07-05', owner: 'u1', notes: '', createdAt: '2026-05-22' },
    { id: 'dl3', title: 'Brand revamp — Saaya', contactId: 'ct4', companyId: 'co4', stage: 'new', value: 90000, expectedClose: '2026-07-15', owner: 'u1', notes: '', createdAt: '2026-05-26' },
    { id: 'dl4', title: 'Repeat project — Saaya (Kavya)', contactId: 'ct6', companyId: 'co4', stage: 'won', value: 250000, expectedClose: '2026-04-30', owner: 'u1', notes: 'Closed, delivered.', createdAt: '2026-03-15' },
  ],
  activities: [
    { id: 'ac1', contactId: 'ct1', dealId: 'dl1', type: 'email', note: 'Sent proposal PDF', at: '2026-05-18', by: 'u1' },
    { id: 'ac2', contactId: 'ct2', dealId: '', type: 'whatsapp', note: 'Shared pricing guide on WhatsApp', at: '2026-05-12', by: 'u1' },
    { id: 'ac3', contactId: 'ct4', dealId: 'dl3', type: 'note', note: 'Engaged heavily with Instagram content', at: '2026-05-25', by: 'u1' },
    { id: 'ac4', contactId: 'ct1', dealId: 'dl1', type: 'call', note: 'Discovery call — 30 min', at: '2026-05-16', by: 'u1' },
  ],
};

const DEFAULT_MESSAGING = {
  waConnection: {
    status: 'disconnected',
    provider: 'cloud',
    phoneNumber: '',
    phoneNumberId: '',
    wabaId: '',
    health: 'unknown',
    lastConnectedAt: '',
    lastMessageAt: '',
    dailyLimit: 250,
    sentToday: 0,
  },
  waTemplates: [
    { id: 'wt1', name: 'Proposal follow-up', useCase: 'proposal_sent', status: 'active', body: 'Hi {{client_name}}, just checking in regarding the proposal we shared for {{proposal_name}}. Please let us know if you would like us to clarify anything or move to the next step.' },
    { id: 'wt2', name: 'Payment reminder', useCase: 'invoice_due', status: 'active', body: 'Hi {{client_name}}, a gentle reminder that the payment of {{amount}} for {{project_name}} is due on {{due_date}}. Do reach out if you need anything.' },
    { id: 'wt3', name: 'Task reminder', useCase: 'task_due', status: 'approved', body: 'Hi {{assigned_person}}, your task "{{task_name}}" is due by {{due_date}}. Please update the status once done.' },
    { id: 'wt4', name: 'Meeting reminder', useCase: 'meeting_soon', status: 'draft', body: 'Hi {{client_name}}, reminder for our meeting at {{meeting_time}}. Looking forward to it!' },
  ],
  waRules: [
    { id: 'wr1', name: 'Proposal follow-up (2 days)', triggerType: 'proposal_sent', condition: 'Client has not responded', delayMinutes: 2880, recipientType: 'client', templateId: 'wt1', active: true },
    { id: 'wr2', name: 'Payment reminder (1 day before)', triggerType: 'invoice_due', condition: 'Payment status is Unpaid', delayMinutes: -1440, recipientType: 'client', templateId: 'wt2', active: true },
    { id: 'wr3', name: 'Task reminder (6h before)', triggerType: 'task_due', condition: 'Task not Completed', delayMinutes: -360, recipientType: 'team', templateId: 'wt3', active: false },
  ],
  waLogs: [
    { id: 'wl1', recipient: 'Acme Interiors (client)', number: '+91 98765 11111', type: 'Proposal follow-up', module: 'Proposal', sentBy: 'System', at: '2m ago', status: 'delivered', msgId: 'wamid.A1', error: '' },
    { id: 'wl2', recipient: 'Junaid Ali (team)', number: '+91 98765 43210', type: 'Task reminder', module: 'Task', sentBy: 'System', at: '15m ago', status: 'read', msgId: 'wamid.A2', error: '' },
    { id: 'wl3', recipient: 'Rao Builders (client)', number: '+91 99888 77665', type: 'Payment reminder', module: 'Payment', sentBy: 'System', at: '1h ago', status: 'sent', msgId: 'wamid.A3', error: '' },
    { id: 'wl4', recipient: 'Priya Kapoor (lead)', number: '+91 98700 00000', type: 'Meeting reminder', module: 'Meeting', sentBy: 'Shanker De', at: 'yest', status: 'failed', msgId: '', error: 'Recipient not on WhatsApp' },
  ],
  dripCampaigns: [
    {
      id: 'dr1',
      name: 'New lead nurture (WhatsApp)',
      channel: 'whatsapp',
      status: 'active',
      pipelineId: 'pl_default',
      audience: { stages: ['lead'], tags: [] },
      steps: [
        { id: 's1', type: 'send', templateId: 'wt1' },
        { id: 's2', type: 'wait', mins: 360 },
        { id: 's3', type: 'condition', cond: 'opened' },
        { id: 's4', type: 'stage', toStage: 'mql' },
        { id: 's5', type: 'send', templateId: 'wt3' },
        { id: 's6', type: 'wait', mins: 1440 },
        { id: 's7', type: 'exit' },
      ],
    },
  ],
  dripEnrolments: [
    { id: 'en1', campaignId: 'dr1', contactId: 'ct3', stepIndex: 2, status: 'active', lastOpened: false, lastClicked: false, enrolledAt: '2026-05-30' },
  ],
};

const DEFAULT_CONTENT = {
  announcements: [
    { id: 'an1', title: 'New BOQ template published', body: 'The updated interior BOQ template is now in Templates.', at: '2026-05-22' },
    { id: 'an2', title: 'Office closed for Republic Day', body: 'The studio will be closed on 26 Jan.', at: '2026-05-15' },
  ],
  quickLinks: [
    { id: 'ql1', label: 'Submit Helpdesk Ticket', url: '#' },
    { id: 'ql2', label: 'PTO + Benefits', url: '#' },
    { id: 'ql3', label: 'Brand Guidelines', url: '#' },
  ],
};

async function writeMessageLog(row) {
  const organizationId = isUuid(row.organization_id || row.organizationId)
    ? (row.organization_id || row.organizationId)
    : DEFAULT_PLATFORM_ORG_ID;
  const workspaceId = isUuid(row.workspace_id || row.workspaceId)
    ? (row.workspace_id || row.workspaceId)
    : DEFAULT_PLATFORM_WORKSPACE_ID;
  const tenantRow = {
    ...row,
    organization_id: organizationId,
    workspace_id: workspaceId,
  };
  delete tenantRow.organizationId;
  delete tenantRow.workspaceId;

  if (!supabase) return { data: { id: `local_${Date.now()}`, ...tenantRow }, error: null };
  const safeRow = { ...tenantRow };
  if (safeRow.related_record_id && !isUuid(safeRow.related_record_id)) {
    delete safeRow.related_record_id;
  }
  const result = await supabase.from('message_logs').insert(safeRow).select('*').single();
  if (result.error && /organization_id|schema cache|column/i.test(result.error.message || '')) {
    const fallbackRow = { ...safeRow };
    delete fallbackRow.organization_id;
    return supabase.from('message_logs').insert(fallbackRow).select('*').single();
  }
  return result;
}

function emailProviderStatus() {
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || '';
  return {
    provider: 'resend',
    configured: Boolean(process.env.RESEND_API_KEY),
    from,
    mode: process.env.RESEND_API_KEY ? 'live' : 'mock',
  };
}

async function sendEmail({ to, subject, text, html, from }) {
  const status = emailProviderStatus();
  if (!to) throw new Error('to is required');
  if (!subject) throw new Error('subject is required');
  const bodyText = text || String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!bodyText && !html) throw new Error('text or html is required');
  if (!status.configured) {
    return {
      id: `mock_email_${Date.now()}`,
      provider: 'mock',
      status: 'queued',
      to,
      subject,
      from: from || status.from || 'Orbit <mock@orbit.local>',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || status.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(html ? { html } : { text: bodyText }),
      ...(html && bodyText ? { text: bodyText } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Resend failed with ${response.status}`);
  return {
    id: payload.id,
    provider: 'resend',
    status: 'sent',
    to,
    subject,
    from: from || status.from,
    raw: payload,
  };
}

const FILE_BUCKET = process.env.SUPABASE_FILE_BUCKET || 'orbit-task-attachments';

function safeFileName(name = 'upload.bin') {
  const clean = String(name || 'upload.bin')
    .replace(/[^\w.\-()\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 120);
  return clean || 'upload.bin';
}

function extensionForMime(mimeType = '') {
  const map = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'video/mp4': 'mp4',
    'text/plain': 'txt',
  };
  return map[String(mimeType).toLowerCase()] || 'bin';
}

function decodeBase64Payload(value = '') {
  const text = String(value || '');
  const match = text.match(/^data:([^;,]+)?;base64,(.+)$/);
  const base64 = match ? match[2] : text;
  return Buffer.from(base64, 'base64');
}

function escapePdfText(value = '') {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?');
}

function wrapPdfLines(text = '', max = 82) {
  const out = [];
  String(text || '').split(/\r?\n/).forEach((raw) => {
    const words = raw.split(/\s+/);
    let line = '';
    words.forEach((word) => {
      if (!word) return;
      if ((line + ' ' + word).trim().length > max) {
        if (line) out.push(line);
        line = word;
      } else {
        line = (line ? `${line} ` : '') + word;
      }
    });
    out.push(line);
  });
  return out.length ? out : [''];
}

function createSimplePdf({ title = 'Document', lines = [] }) {
  const pageLines = [
    title,
    '',
    ...lines.flatMap((line) => wrapPdfLines(line)),
  ].slice(0, 48);
  const content = [
    'BT',
    '/F1 12 Tf',
    '72 760 Td',
    '16 TL',
    ...pageLines.map((line, index) => `${index === 0 ? '/F1 18 Tf ' : index === 1 ? '/F1 12 Tf ' : ''}(${escapePdfText(line)}) Tj T*`),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

async function ensureFileBucket() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.storage.createBucket(FILE_BUCKET, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
  });
  if (error && !/already exists|duplicate/i.test(error.message || '')) throw error;
}

async function signedFileUrl(path, expiresInSeconds = 7 * 24 * 60 * 60) {
  const { data, error } = await supabase.storage.from(FILE_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return {
    url: data?.signedUrl || '',
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

function stableUuid(kind, legacyId) {
  const hash = crypto.createHash('sha256').update(`orbit:${kind}:${legacyId}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-');
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function entityId(kind, value) {
  if (!value) return null;
  return isUuid(value) ? value : stableUuid(kind, value);
}

function dateOnly(value) {
  if (!value) return null;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function timestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function relativeTimestamp(value) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  const now = Date.now();
  if (text === 'yest' || text === 'yesterday') return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const match = text.match(/^(\d+)\s*(m|min|mins|h|hr|hrs|d|day|days)\s*ago$/);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2][0];
    const minutes = unit === 'm' ? amount : unit === 'h' ? amount * 60 : amount * 1440;
    return new Date(now - minutes * 60 * 1000).toISOString();
  }
  return timestamp(value);
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

async function readSnapshotState() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('workspace_settings')
    .select('permissions')
    .eq('name', STATE_ROW_NAME)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.permissions?.orbitAppState?.data || null;
}

function renderTemplateText(text = '', vars = {}) {
  return String(text || '').replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function pickReplyMaterial(state, bot) {
  const materials = Array.isArray(state?.marketingReplyMaterials) ? state.marketingReplyMaterials : [];
  const direct = materials.find((m) => m.id === bot.replyMaterialId);
  if (direct) return direct;
  const keyword = String(bot.triggerWord || '').toLowerCase();
  return materials.find((m) => String(m.title || '').toLowerCase().includes(keyword)) || materials[0] || null;
}

function buildChatbotReply({ state, bot, incomingText, from }) {
  const material = pickReplyMaterial(state, bot);
  if (material) {
    const body = material.body || material.url || material.title || '';
    return renderTemplateText(body, {
      contact_name: from,
      trigger_word: bot.triggerWord || '',
      incoming_message: incomingText,
    });
  }
  return `Thanks for your message. We received "${incomingText}". Our team will get back to you shortly.`;
}

function findMatchingChatbot(state, incomingText) {
  const text = String(incomingText || '').toLowerCase();
  const bots = Array.isArray(state?.marketingChatbots) ? state.marketingChatbots : [];
  return bots.find((bot) => {
    if (!bot?.active) return false;
    const trigger = String(bot.triggerWord || '').trim().toLowerCase();
    if (!trigger) return false;
    const type = String(bot.triggerType || '').toUpperCase();
    if (type.includes('EXACT')) return text === trigger;
    return text.includes(trigger);
  }) || null;
}

async function recordChatbotRuntimeEvent(event) {
  const row = { id: `chatbot_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, at: new Date().toISOString(), ...event };
  chatbotRuntime.inbox.unshift(row);
  chatbotRuntime.inbox = chatbotRuntime.inbox.slice(0, 200);
  return row;
}

async function handleIncomingWhatsAppMessage(message) {
  const body = String(message?.body || '').trim();
  const from = message?.from || message?.author || '';
  if (!body || !from) return null;
  const state = await readSnapshotState();
  const bot = findMatchingChatbot(state, body);
  const event = await recordChatbotRuntimeEvent({
    from,
    body,
    matched: Boolean(bot),
    chatbotId: bot?.id || null,
    chatbotName: bot?.name || null,
  });
  if (!bot) return event;

  const reply = buildChatbotReply({ state, bot, incomingText: body, from });
  let sent = null;
  try {
    sent = await sendWhatsAppWeb({ to: from, message: reply });
    chatbotRuntime.replies.unshift({ ...event, reply, providerMessageId: sent.id, status: sent.status || 'sent' });
    chatbotRuntime.replies = chatbotRuntime.replies.slice(0, 200);
    await writeMessageLog({
      recipient: from,
      number: from,
      type: 'chatbot_auto_reply',
      related_module: 'marketing_chatbot',
      related_record_id: bot.id,
      provider_message_id: sent.id,
      status: sent.status || 'sent',
      error: JSON.stringify({ bot: bot.name, incoming: body }).slice(0, 1000),
      sent_by: 'orbit-chatbot',
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    chatbotRuntime.replies.unshift({ ...event, reply, status: 'failed', error: error.message });
    await writeMessageLog({
      recipient: from,
      number: from,
      type: 'chatbot_auto_reply',
      related_module: 'marketing_chatbot',
      related_record_id: bot.id,
      provider_message_id: null,
      status: 'failed',
      error: error.message,
      sent_by: 'orbit-chatbot',
      failed_at: new Date().toISOString(),
    });
  }
  return { ...event, reply, sent };
}

async function upsertRows(table, rows) {
  if (!rows.length) return { table, count: 0 };
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
  return { table, count: rows.length };
}

function portfolioItemRow(item, workspaceId) {
  const id = String(item?.id || `pf-${Date.now()}`);
  return compactObject({
    id,
    workspace_id: workspaceId,
    title: item.title || item.projectName || item.clientName || 'Untitled Brand World',
    project_name: item.projectName || item.project_name || item.title || null,
    client_name: item.clientName || item.client_name || null,
    project_category: item.projectCategory || item.project_category || null,
    section: item.section || null,
    property_type: item.propertyType || item.property_type || null,
    service_type: item.serviceType || item.service_type || null,
    city: item.city || null,
    state_ut: item.state_ut || item.stateUt || null,
    tier_category: item.tier_category || item.tierCategory || null,
    project_size: item.projectSize || item.project_size || null,
    year_completed: item.yearCompleted || item.year_completed || null,
    short_writeup: item.shortWriteup || item.short_writeup || null,
    challenge: item.challenge || null,
    solution: item.solution || null,
    outcome: item.outcome || null,
    cover_image_url: item.coverImageUrl || item.cover_image_url || item.cover || null,
    cover_image_storage_bucket: item.coverImageStorageBucket || item.cover_image_storage_bucket || null,
    cover_image_storage_path: item.coverImageStoragePath || item.cover_image_storage_path || null,
    visibility_status: item.visibilityStatus || item.visibility_status || 'Private',
    portfolio_status: item.portfolioStatus || item.portfolio_status || item.contentStatus || item.content_status || 'Saved',
    created_by: item.createdBy || item.created_by || null,
    payload: item,
    created_at: timestamp(item.createdDate || item.created_at) || new Date().toISOString(),
    updated_at: timestamp(item.updatedDate || item.updated_at) || new Date().toISOString(),
  });
}

function portfolioAssetRow(asset, workspaceId) {
  const id = String(asset?.id || `pa-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`);
  return compactObject({
    id,
    workspace_id: workspaceId,
    portfolio_item_id: asset.portfolioItemId || asset.portfolio_item_id,
    asset_type: asset.asset_type || asset.assetType || 'External Link',
    file_name: asset.file_name || asset.fileName || 'Asset',
    file_url: asset.file_url || asset.fileUrl || null,
    external_url: asset.external_url || asset.externalUrl || null,
    thumbnail_url: asset.thumbnail_url || asset.thumbnailUrl || null,
    storage_bucket: asset.storage_bucket || asset.storageBucket || null,
    storage_path: asset.storage_path || asset.storagePath || null,
    file_size: Number.isFinite(Number(asset.file_size || asset.fileSize)) ? Number(asset.file_size || asset.fileSize) : null,
    display_order: Number.isFinite(Number(asset.display_order || asset.displayOrder)) ? Number(asset.display_order || asset.displayOrder) : 0,
    is_primary: Boolean(asset.is_primary ?? asset.isPrimary),
    payload: asset,
    created_at: timestamp(asset.created_at || asset.createdAt) || new Date().toISOString(),
  });
}

function portfolioTagRow(tag, workspaceId) {
  const rawId = tag?.id ?? tag?.tag_name ?? tag?.name ?? `tag-${Date.now()}`;
  return {
    id: String(rawId),
    workspace_id: workspaceId,
    tag_name: tag.tag_name || tag.name || String(rawId),
    payload: tag,
    created_at: timestamp(tag.created_at || tag.createdAt) || new Date().toISOString(),
  };
}

function portfolioShareLinkRow(link, workspaceId) {
  return compactObject({
    id: String(link?.id || `psl-${Date.now()}`),
    workspace_id: workspaceId,
    portfolio_item_id: link.portfolioItemId || link.portfolio_item_id,
    token: link.token || `PF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    public_url: link.public_url || link.publicUrl || null,
    is_active: link.is_active ?? link.isActive ?? true,
    allow_download: link.allow_download ?? link.allowDownload ?? true,
    total_views: Number(link.total_views || link.totalViews || 0),
    unique_views: Number(link.unique_views || link.uniqueViews || 0),
    last_viewed_at: timestamp(link.last_viewed_at || link.lastViewedAt),
    currently_viewing_count: Number(link.currently_viewing_count || link.currentlyViewingCount || 0),
    created_by: link.created_by || link.createdBy || null,
    payload: link,
    created_at: timestamp(link.created_at || link.createdAt) || new Date().toISOString(),
    updated_at: timestamp(link.updated_at || link.updatedAt) || new Date().toISOString(),
  });
}

function portfolioViewEventRow(event, workspaceId) {
  return compactObject({
    id: String(event?.id || `pve-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`),
    workspace_id: workspaceId,
    share_link_id: event.share_link_id || event.shareLinkId,
    portfolio_item_id: event.portfolioItemId || event.portfolio_item_id,
    visitor_id: event.visitor_id || event.visitorId || null,
    session_id: event.session_id || event.sessionId || null,
    device_type: event.device_type || event.deviceType || null,
    browser: event.browser || null,
    user_agent: event.user_agent || event.userAgent || null,
    opened_at: timestamp(event.opened_at || event.openedAt) || new Date().toISOString(),
    last_activity_at: timestamp(event.last_activity_at || event.lastActivityAt),
    closed_at: timestamp(event.closed_at || event.closedAt),
    duration_seconds: Number(event.duration_seconds || event.durationSeconds || 0),
    is_currently_viewing: Boolean(event.is_currently_viewing ?? event.isCurrentlyViewing),
    payload: event,
  });
}

function portfolioItemFromRow(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    title: row.title,
    projectName: row.project_name || row.payload?.projectName || row.title,
    clientName: row.client_name || row.payload?.clientName || '',
    projectCategory: row.project_category || row.payload?.projectCategory || '',
    section: row.section || row.payload?.section || '',
    propertyType: row.property_type || row.payload?.propertyType || '',
    serviceType: row.service_type || row.payload?.serviceType || '',
    city: row.city || row.payload?.city || '',
    state_ut: row.state_ut || row.payload?.state_ut || '',
    tier_category: row.tier_category || row.payload?.tier_category || '',
    projectSize: row.project_size || row.payload?.projectSize || '',
    yearCompleted: row.year_completed || row.payload?.yearCompleted || '',
    shortWriteup: row.short_writeup || row.payload?.shortWriteup || '',
    challenge: row.challenge || row.payload?.challenge || '',
    solution: row.solution || row.payload?.solution || '',
    outcome: row.outcome || row.payload?.outcome || '',
    coverImageUrl: row.cover_image_url || row.payload?.coverImageUrl || row.payload?.cover_image_url || row.payload?.cover || '',
    cover_image_url: row.cover_image_url || row.payload?.cover_image_url || '',
    coverImageStorageBucket: row.cover_image_storage_bucket || row.payload?.coverImageStorageBucket || '',
    coverImageStoragePath: row.cover_image_storage_path || row.payload?.coverImageStoragePath || '',
    visibilityStatus: row.visibility_status || row.payload?.visibilityStatus || 'Private',
    portfolioStatus: row.portfolio_status || row.payload?.portfolioStatus || row.payload?.contentStatus || 'Saved',
    createdBy: row.created_by || row.payload?.createdBy || '',
    createdDate: row.created_at,
    updatedDate: row.updated_at,
  };
}

function portfolioAssetFromRow(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    portfolioItemId: row.portfolio_item_id,
    asset_type: row.asset_type,
    file_name: row.file_name,
    file_url: row.file_url || '',
    external_url: row.external_url || '',
    thumbnail_url: row.thumbnail_url || '',
    storage_bucket: row.storage_bucket || '',
    storage_path: row.storage_path || '',
    file_size: row.file_size || 0,
    display_order: row.display_order || 0,
    is_primary: Boolean(row.is_primary),
    created_at: row.created_at,
  };
}

function portfolioShareLinkFromRow(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    portfolioItemId: row.portfolio_item_id,
    portfolio_item_id: row.portfolio_item_id,
    token: row.token,
    publicUrl: row.public_url || '',
    public_url: row.public_url || '',
    is_active: Boolean(row.is_active),
    allow_download: Boolean(row.allow_download),
    total_views: row.total_views || 0,
    unique_views: row.unique_views || 0,
    last_viewed_at: row.last_viewed_at || '',
    currently_viewing_count: row.currently_viewing_count || 0,
    created_by: row.created_by || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function deleteMissingRows(table, workspaceId, keepIds = []) {
  const keep = new Set((keepIds || []).map(String));
  const { data, error } = await supabase.from(table).select('id').eq('workspace_id', workspaceId);
  if (error) throw new Error(`${table}: ${error.message}`);
  const stale = (data || []).map((r) => r.id).filter((id) => !keep.has(String(id)));
  if (!stale.length) return { table, deleted: 0 };
  const { error: deleteError } = await supabase.from(table).delete().in('id', stale);
  if (deleteError) throw new Error(`${table}: ${deleteError.message}`);
  return { table, deleted: stale.length };
}

async function ensureDefaultWorkspaceRow() {
  if (!supabase) throw new Error('Supabase is not configured');
  const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
  const { error } = await supabase.from('workspaces').upsert({
    id: workspaceId,
    name: 'Orbit Workspace Hub',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw new Error(`workspaces: ${error.message}`);
  return workspaceId;
}

function isSchemaCacheMissing(error) {
  return error?.code === 'PGRST205' || /schema cache|Could not find the table/i.test(error?.message || '');
}

function brandSchemaPendingResponse(res, error) {
  return res.status(424).json({
    ok: false,
    status: 'schema_pending',
    error: error?.message || 'Brand portfolio tables are not available yet.',
    sqlFile: 'supabase/brand_portfolio_schema.sql',
    tables: [
      'portfolio_items',
      'portfolio_assets',
      'portfolio_tags',
      'portfolio_item_tags',
      'portfolio_share_links',
      'portfolio_view_events',
    ],
  });
}

function normalizeWhatsAppWebNumber(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (!digits) throw new Error('WhatsApp number is required');
  return `${digits}@c.us`;
}

function publicWhatsappWebStatus() {
  return {
    status: whatsappWebState.status,
    qrDataUrl: whatsappWebState.qrDataUrl,
    lastReadyAt: whatsappWebState.lastReadyAt,
    lastError: whatsappWebState.lastError,
    me: whatsappWebState.me,
    connected: whatsappWebState.status === 'ready',
  };
}

async function ensureWhatsAppWebClient({ reset = false } = {}) {
  if (reset && whatsappWebState.client) {
    try { await whatsappWebState.client.destroy(); } catch (_) {}
    whatsappWebState.client = null;
  }
  if (whatsappWebState.client) return whatsappWebState.client;

  whatsappWebState.status = 'starting';
  whatsappWebState.lastError = '';
  whatsappWebState.qr = '';
  whatsappWebState.qrDataUrl = '';

  const client = new WhatsAppWebClient({
    authStrategy: new LocalAuth({ clientId: 'orbit-demo' }),
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    puppeteer: {
      headless: true,
      protocolTimeout: Number(process.env.WHATSAPP_WEB_PROTOCOL_TIMEOUT_MS || 120000),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
      ],
    },
  });

  client.on('qr', async (qr) => {
    whatsappWebState.status = 'qr';
    whatsappWebState.qr = qr;
    whatsappWebState.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
  });
  client.on('authenticated', () => {
    whatsappWebState.status = 'authenticated';
    whatsappWebState.lastError = '';
  });
  client.on('ready', async () => {
    whatsappWebState.status = 'ready';
    whatsappWebState.qr = '';
    whatsappWebState.qrDataUrl = '';
    whatsappWebState.lastReadyAt = new Date().toISOString();
    try {
      const info = client.info;
      whatsappWebState.me = info?.wid?.user ? `+${info.wid.user}` : info?.pushname || 'Linked WhatsApp';
    } catch (_) {
      whatsappWebState.me = 'Linked WhatsApp';
    }
  });
  client.on('auth_failure', (message) => {
    whatsappWebState.status = 'error';
    whatsappWebState.lastError = message || 'WhatsApp authentication failed';
  });
  client.on('disconnected', (reason) => {
    whatsappWebState.status = 'disconnected';
    whatsappWebState.lastError = reason || '';
    whatsappWebState.client = null;
  });
  client.on('message', async (message) => {
    try {
      await handleIncomingWhatsAppMessage(message);
    } catch (error) {
      chatbotRuntime.inbox.unshift({
        id: `chatbot_error_${Date.now()}`,
        at: new Date().toISOString(),
        from: message?.from || '',
        body: message?.body || '',
        matched: false,
        error: error.message,
      });
      chatbotRuntime.inbox = chatbotRuntime.inbox.slice(0, 200);
    }
  });

  whatsappWebState.client = client;
  client.initialize().catch((error) => {
    whatsappWebState.status = 'error';
    whatsappWebState.lastError = error.message;
    whatsappWebState.client = null;
  });
  return client;
}

async function resetWhatsAppWebSession({ clearAuth = false } = {}) {
  if (whatsappWebState.client) {
    try { await whatsappWebState.client.logout(); } catch (_) {}
    try { await whatsappWebState.client.destroy(); } catch (_) {}
  }
  whatsappWebState.client = null;
  whatsappWebState.status = 'disconnected';
  whatsappWebState.qr = '';
  whatsappWebState.qrDataUrl = '';
  whatsappWebState.lastReadyAt = null;
  whatsappWebState.lastError = '';
  whatsappWebState.me = null;

  if (clearAuth) {
    for (const sessionPath of WHATSAPP_WEB_SESSION_PATHS) {
      try {
        await fs.rm(sessionPath, { recursive: true, force: true });
      } catch (_) {
        // Best effort only. A fresh start below will recreate the session folders.
      }
    }
  }
}

async function sendWhatsAppWeb({ to, message, media = [] }) {
  if (!whatsappWebState.client || whatsappWebState.status !== 'ready') {
    throw new Error('WhatsApp QR sender is not connected. Open QR Sender and scan first.');
  }
  const chatId = normalizeWhatsAppWebNumber(to);
  const mediaItems = normalizeDripMediaItems(media);
  try {
    const sent = await whatsappWebState.client.sendMessage(chatId, appendMediaLinksToMessage(message, mediaItems));
    const mediaResults = [];
    for (const item of mediaItems.filter((m) => ['image', 'pdf', 'video'].includes(m.type))) {
      try {
        const mediaMessage = await MessageMedia.fromUrl(item.url, { unsafeMime: true });
        const mediaSent = await whatsappWebState.client.sendMessage(chatId, mediaMessage, { caption: item.caption || item.title || '' });
        mediaResults.push({ id: item.id, status: 'sent', providerMessageId: mediaSent?.id?._serialized || null });
      } catch (error) {
        mediaResults.push({ id: item.id, status: 'link_only', error: error.message });
      }
    }
    return {
      provider: 'whatsapp-web',
      id: sent?.id?._serialized || `waweb_${Date.now()}`,
      status: 'sent',
      media: mediaResults,
    };
  } catch (error) {
    const messageText = String(error?.message || error || '');
    const staleSession = /detached frame|execution context|target closed|session closed|browser has disconnected|protocol error/i.test(messageText);
    if (staleSession) {
      whatsappWebState.status = 'error';
      whatsappWebState.lastError = 'WhatsApp QR session went stale. Open QR Sender, click New QR, scan again, then retry.';
      const staleClient = whatsappWebState.client;
      whatsappWebState.client = null;
      try {
        await staleClient?.destroy?.();
      } catch (_) {
        // Best-effort cleanup only; the next QR start will create a fresh browser session.
      }
      throw new Error(whatsappWebState.lastError);
    }
    throw error;
  }
}

async function sendWhatsApp({ to, message, media = [] }) {
  if (whatsappWebState.client && whatsappWebState.status === 'ready') {
    return sendWhatsAppWeb({ to, message, media });
  }

  const provider = process.env.WHATSAPP_PROVIDER || 'mock';
  if (provider === 'mock') {
    return {
      provider,
      id: `mock_${Date.now()}`,
      status: 'sent',
      note: 'Mock send only. Add provider credentials in .env to send real WhatsApp messages.',
    };
  }

  if (provider === 'meta') {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) throw new Error('Missing META_WHATSAPP_TOKEN or META_PHONE_NUMBER_ID');

    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: appendMediaLinksToMessage(message, media) },
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'WhatsApp provider rejected the message');
    return { provider, id: payload.messages?.[0]?.id, status: 'sent', raw: payload };
  }

  throw new Error(`Unsupported WHATSAPP_PROVIDER: ${provider}`);
}

function normalizeDripMediaItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && String(item.url || '').trim())
    .map((item, index) => {
      const type = ['image', 'pdf', 'video', 'link'].includes(String(item.type)) ? String(item.type) : 'link';
      return {
        id: item.id || `media_${index + 1}`,
        type,
        title: item.title || (type === 'pdf' ? 'PDF / Document' : type === 'video' ? 'Video' : type === 'image' ? 'Image' : 'Link'),
        url: String(item.url || '').trim(),
        caption: item.caption || '',
        track: item.track !== false,
      };
    });
}

function appendMediaLinksToMessage(message, media = []) {
  const items = normalizeDripMediaItems(media);
  if (!items.length) return String(message || '');
  const lines = items.map((item, index) => {
    const label = item.title || item.type || 'Media';
    const caption = item.caption ? ` - ${item.caption}` : '';
    return `${index + 1}. ${label}${caption}: ${item.url}`;
  });
  return [String(message || '').trim(), `Media / resources:\n${lines.join('\n')}`].filter(Boolean).join('\n\n');
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + Number(minutes || 0) * 60 * 1000).toISOString();
}

function renderTemplate(body, variables = {}) {
  return String(body || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = variables[key];
    return value == null || value === '' ? `{{${key}}}` : String(value);
  });
}

function normalizeFlow(campaign, nodes = [], edges = []) {
  if (nodes.length || edges.length) {
    return {
      version: 1,
      nodes: nodes.map((node) => ({
        id: node.node_key,
        type: 'dripNode',
        position: node.position || { x: 0, y: 0 },
        data: {
          kind: node.node_type,
          title: node.title,
          ...(node.config || {}),
        },
      })),
      edges: edges.map((edge) => ({
        id: edge.edge_key,
        type: edge.config?.type || 'smoothstep',
        source: edge.source_node_key,
        target: edge.target_node_key,
        sourceHandle: edge.source_handle,
        label: edge.label,
        animated: Boolean(edge.config?.animated),
      })),
    };
  }
  return campaign?.flow || { version: 1, nodes: [], edges: [] };
}

function nextNode(flow, currentNode, handle = null) {
  const edge = (flow.edges || []).find((item) =>
    item.source === currentNode?.id && (handle ? item.sourceHandle === handle : !item.sourceHandle)
  ) || (flow.edges || []).find((item) => item.source === currentNode?.id);
  if (!edge) return null;
  return (flow.nodes || []).find((node) => node.id === edge.target) || null;
}

function firstFlowNode(flow) {
  return (flow.nodes || []).find((node) => node.data?.kind === 'trigger') || flow.nodes?.[0] || null;
}

function flowNodeIndex(flow, nodeKey) {
  const index = (flow.nodes || []).findIndex((node) => node.id === nodeKey);
  return index < 0 ? 0 : index;
}

async function updateEnrolmentProgress(id, patch) {
  const withBranchColumns = {
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('drip_enrolments').update(withBranchColumns).eq('id', id);
  if (!error) return;
  if (!/current_node_key|last_node_key|context/i.test(error.message || '')) throw error;
  const { current_node_key, last_node_key, context, ...legacyPatch } = withBranchColumns;
  const retry = await supabase.from('drip_enrolments').update(legacyPatch).eq('id', id);
  if (retry.error) throw retry.error;
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    supabase: Boolean(supabase),
    whatsappProvider: process.env.WHATSAPP_PROVIDER || 'mock',
  });
});

app.get('/db/counts', async (_req, res) => {
  if (!supabase) {
    return res.json({ ok: true, connected: false, totalRows: 0, counts: {} });
  }

  const counts = {};
  const errors = {};
  await Promise.all(COUNT_TABLES.map(async (table) => {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) errors[table] = error.message;
    else counts[table] = count || 0;
  }));

  res.json({
    ok: Object.keys(errors).length === 0,
    connected: true,
    totalRows: Object.values(counts).reduce((sum, n) => sum + n, 0),
    activeTables: Object.values(counts).filter((n) => n > 0).length,
    totalTables: COUNT_TABLES.length,
    counts,
    errors,
  });
});

app.get('/platform/context', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      ok: false,
      connected: false,
      error: 'Supabase is not configured for the local API.',
      organizations: [],
      workspaces: [],
      memberships: [],
    });
  }

  const email = String(req.query.email || '').trim().toLowerCase();
  const includeAll = ['1', 'true', 'yes'].includes(String(req.query.includeAll || '').toLowerCase());

  const [organizationsResult, workspacesResult, membershipsResult] = await Promise.all([
    supabase.from('platform_organizations').select('*').order('created_at', { ascending: true }),
    supabase.from('platform_workspaces').select('*').order('created_at', { ascending: true }),
    supabase.from('platform_memberships').select('*').order('created_at', { ascending: true }),
  ]);

  const errors = {};
  if (organizationsResult.error) errors.platform_organizations = organizationsResult.error.message;
  if (workspacesResult.error) errors.platform_workspaces = workspacesResult.error.message;
  if (membershipsResult.error) errors.platform_memberships = membershipsResult.error.message;

  let memberships = membershipsResult.data || [];
  if (!includeAll && email) {
    memberships = memberships.filter((row) => {
      const rowEmails = [row.email, row.user_email, row.member_email, row.invited_email]
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
      return rowEmails.includes(email);
    });
  }

  res.json({
    ok: Object.keys(errors).length === 0,
    connected: true,
    email,
    includeAll,
    organizations: organizationsResult.data || [],
    workspaces: workspacesResult.data || [],
    memberships,
    errors,
  });
});

function slugifyPlatform(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `item-${Date.now()}`;
}

async function insertPlatformRow(table, primaryRow, fallbackRow) {
  const attempt = async (row) => supabase.from(table).insert(compactObject(row)).select('*').single();
  let result = await attempt(primaryRow);
  if (result.error && fallbackRow && /column .* does not exist/i.test(result.error.message || '')) {
    result = await attempt(fallbackRow);
  }
  return result;
}

app.post('/platform/organizations', async (req, res) => {
  if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured for the local API.' });
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ ok: false, error: 'Organization name is required.' });

  const slug = slugifyPlatform(body.slug || name);
  const ownerEmail = String(body.ownerEmail || body.owner_email || '').trim().toLowerCase();
  const primaryRow = {
    name,
    slug,
    status: body.status || 'active',
    plan: body.plan || 'trial',
    owner_name: body.ownerName || body.owner_name,
    owner_email: ownerEmail || undefined,
    region: body.region,
  };
  const fallbackRow = {
    name,
    slug,
    status: body.status || 'active',
  };

  const { data, error } = await insertPlatformRow('platform_organizations', primaryRow, fallbackRow);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, organization: data });
});

app.post('/platform/workspaces', async (req, res) => {
  if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured for the local API.' });
  const body = req.body || {};
  const organizationId = body.organizationId || body.organization_id;
  const name = String(body.name || '').trim();
  if (!organizationId) return res.status(400).json({ ok: false, error: 'organizationId is required.' });
  if (!name) return res.status(400).json({ ok: false, error: 'Workspace name is required.' });

  const slug = slugifyPlatform(body.slug || name);
  const primaryRow = {
    organization_id: organizationId,
    name,
    slug,
    status: body.status || 'active',
    kind: body.kind || 'main',
  };
  const fallbackRow = {
    organization_id: organizationId,
    name,
    slug,
    status: body.status || 'active',
  };

  const { data, error } = await insertPlatformRow('platform_workspaces', primaryRow, fallbackRow);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, workspace: data });
});

app.post('/platform/memberships', async (req, res) => {
  if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured for the local API.' });
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ ok: false, error: 'Email is required.' });
  const organizationId = body.organizationId || body.organization_id;
  const workspaceId = body.workspaceId || body.workspace_id;
  const appAccess = Array.isArray(body.appAccess || body.app_access) ? (body.appAccess || body.app_access) : [];
  const role = String(body.role || 'member').trim();
  const status = String(body.status || 'active').trim();
  const name = String(body.name || '').trim();

  const primaryRow = {
    organization_id: organizationId || undefined,
    workspace_id: workspaceId || undefined,
    name: name || undefined,
    email,
    role,
    status,
    app_access: appAccess,
  };
  const fallbackRow = {
    organization_id: organizationId || undefined,
    workspace_id: workspaceId || undefined,
    email,
    role,
    status,
  };

  const { data, error } = await insertPlatformRow('platform_memberships', primaryRow, fallbackRow);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, membership: data });
});

app.get('/state', async (_req, res) => {
  if (!supabase) return res.json({ ok: true, connected: false, state: null });

  const { data, error } = await supabase
    .from('workspace_settings')
    .select('id,name,permissions,updated_at')
    .eq('name', STATE_ROW_NAME)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({
    ok: true,
    connected: true,
    state: data?.permissions?.orbitAppState || null,
    updatedAt: data?.updated_at || null,
  });
});

app.post('/files/upload-json', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const {
      fileName,
      displayName,
      mimeType = 'application/octet-stream',
      base64,
      taskId,
      taskLegacyId,
      attachmentType = 'attachment',
      fileKind,
      caption = '',
      uploadedBy,
      metadata = {},
    } = req.body || {};

    if (!base64) return res.status(400).json({ ok: false, error: 'base64 is required' });
    const taskKey = taskLegacyId || taskId;
    if (!taskKey) return res.status(400).json({ ok: false, error: 'taskId or taskLegacyId is required' });

    await ensureFileBucket();

    const workspaceId = await ensureDefaultWorkspaceRow();
    const buffer = decodeBase64Payload(base64);
    if (!buffer.length) return res.status(400).json({ ok: false, error: 'Uploaded file is empty' });
    if (buffer.length > 50 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'File is larger than 50 MB' });

    const cleanName = safeFileName(fileName || displayName || `upload.${extensionForMime(mimeType)}`);
    const storagePath = `${workspaceId}/tasks/${String(taskKey).replace(/[^\w.-]/g, '-')}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const signed = await signedFileUrl(storagePath);
    const kind = fileKind || (String(attachmentType) === 'voice_note' ? 'voice_note' : String(mimeType).startsWith('image/') ? 'image' : String(mimeType).startsWith('audio/') ? 'voice_note' : 'attachment');
    const uploadedById = isUuid(uploadedBy) ? uploadedBy : null;

    const { data: fileRow, error: fileError } = await supabase
      .from('workspace_files')
      .insert({
        workspace_id: workspaceId,
        bucket: FILE_BUCKET,
        storage_path: storagePath,
        original_name: cleanName,
        display_name: displayName || cleanName,
        mime_type: mimeType,
        file_kind: ['attachment', 'voice_note', 'image', 'document', 'other'].includes(kind) ? kind : 'attachment',
        size_bytes: buffer.length,
        public_url: signed.url,
        signed_url_expires_at: signed.expiresAt,
        uploaded_by: uploadedById,
        source_module: 'tasks',
        metadata: {
          ...metadata,
          taskKey,
          attachmentType,
        },
      })
      .select('*')
      .single();
    if (fileError) throw fileError;

    const taskUuid = isUuid(taskId) ? taskId : null;
    const { data: linkRow, error: linkError } = await supabase
      .from('task_attachments')
      .insert({
        workspace_id: workspaceId,
        task_id: taskUuid,
        task_legacy_id: taskUuid ? (taskLegacyId || null) : String(taskKey),
        file_id: fileRow.id,
        attachment_type: String(attachmentType) === 'voice_note' ? 'voice_note' : 'attachment',
        caption,
      })
      .select('*')
      .single();
    if (linkError) throw linkError;

    res.json({
      ok: true,
      bucket: FILE_BUCKET,
      path: storagePath,
      url: signed.url,
      expiresAt: signed.expiresAt,
      file: fileRow,
      taskAttachment: linkRow,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/tasks/:taskKey/files', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const taskKey = req.params.taskKey;
    const workspaceId = await ensureDefaultWorkspaceRow();
    const query = supabase
      .from('task_attachments')
      .select('id,attachment_type,caption,sort,created_at,file_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    const { data, error } = isUuid(taskKey)
      ? await query.eq('task_id', taskKey)
      : await query.eq('task_legacy_id', taskKey);
    if (error) throw error;

    const fileIds = (data || []).map((row) => row.file_id).filter(Boolean);
    const { data: fileRows, error: fileError } = fileIds.length
      ? await supabase.from('workspace_files').select('*').in('id', fileIds)
      : { data: [], error: null };
    if (fileError) throw fileError;
    const filesById = new Map((fileRows || []).map((file) => [file.id, file]));

    const files = await Promise.all((data || []).map(async (row) => {
      const file = filesById.get(row.file_id) || {};
      let url = file.public_url || '';
      let expiresAt = file.signed_url_expires_at || null;
      if (file.storage_path) {
        try {
          const signed = await signedFileUrl(file.storage_path);
          url = signed.url;
          expiresAt = signed.expiresAt;
        } catch (_) {}
      }
      return { ...row, file: { ...file, url, signed_url: url, signed_url_expires_at: expiresAt } };
    }));

    res.json({ ok: true, files });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/intranet-content/:contentKey/files/upload-json', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const contentKey = req.params.contentKey;
    const {
      fileName,
      displayName,
      mimeType = 'application/octet-stream',
      base64,
      attachmentType = 'attachment',
      fileKind,
      caption = '',
      uploadedBy,
      metadata = {},
    } = req.body || {};

    if (!base64) return res.status(400).json({ ok: false, error: 'base64 is required' });
    if (!contentKey) return res.status(400).json({ ok: false, error: 'contentKey is required' });

    await ensureFileBucket();

    const workspaceId = await ensureDefaultWorkspaceRow();
    const buffer = decodeBase64Payload(base64);
    if (!buffer.length) return res.status(400).json({ ok: false, error: 'Uploaded file is empty' });
    if (buffer.length > 50 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'File is larger than 50 MB' });

    const cleanName = safeFileName(fileName || displayName || `upload.${extensionForMime(mimeType)}`);
    const storagePath = `${workspaceId}/intranet/${String(contentKey).replace(/[^\w.-]/g, '-')}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const signed = await signedFileUrl(storagePath);
    const kind = fileKind || (String(attachmentType) === 'voice_note' ? 'voice_note' : String(mimeType).startsWith('image/') ? 'image' : String(mimeType).startsWith('video/') ? 'attachment' : 'document');
    const uploadedById = isUuid(uploadedBy) ? uploadedBy : null;

    const { data: fileRow, error: fileError } = await supabase
      .from('workspace_files')
      .insert({
        workspace_id: workspaceId,
        bucket: FILE_BUCKET,
        storage_path: storagePath,
        original_name: cleanName,
        display_name: displayName || cleanName,
        mime_type: mimeType,
        file_kind: ['attachment', 'voice_note', 'image', 'document', 'other'].includes(kind) ? kind : 'attachment',
        size_bytes: buffer.length,
        public_url: signed.url,
        signed_url_expires_at: signed.expiresAt,
        uploaded_by: uploadedById,
        source_module: 'intranet',
        metadata: {
          ...metadata,
          contentKey,
          attachmentType,
        },
      })
      .select('*')
      .single();
    if (fileError) throw fileError;

    const contentUuid = isUuid(contentKey) ? contentKey : null;
    const safeAttachmentType = ['attachment', 'video', 'voice_note', 'image'].includes(String(attachmentType)) ? String(attachmentType) : 'attachment';
    const { data: linkRow, error: linkError } = await supabase
      .from('intranet_content_attachments')
      .insert({
        workspace_id: workspaceId,
        content_id: contentUuid,
        content_legacy_id: contentUuid ? null : String(contentKey),
        file_id: fileRow.id,
        attachment_type: safeAttachmentType,
        caption,
      })
      .select('*')
      .single();
    if (linkError) throw linkError;

    res.json({
      ok: true,
      bucket: FILE_BUCKET,
      path: storagePath,
      url: signed.url,
      expiresAt: signed.expiresAt,
      file: fileRow,
      contentAttachment: linkRow,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/intranet-content/:contentKey/files', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const contentKey = req.params.contentKey;
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const query = supabase
      .from('intranet_content_attachments')
      .select('id,attachment_type,caption,sort,created_at,file_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    const { data, error } = isUuid(contentKey)
      ? await query.eq('content_id', contentKey)
      : await query.eq('content_legacy_id', contentKey);
    if (error) throw error;

    const fileIds = (data || []).map((row) => row.file_id).filter(Boolean);
    const { data: fileRows, error: fileError } = fileIds.length
      ? await supabase.from('workspace_files').select('*').in('id', fileIds)
      : { data: [], error: null };
    if (fileError) throw fileError;
    const filesById = new Map((fileRows || []).map((file) => [file.id, file]));

    const files = await Promise.all((data || []).map(async (row) => {
      const file = filesById.get(row.file_id) || {};
      let url = file.public_url || '';
      let expiresAt = file.signed_url_expires_at || null;
      if (file.storage_path) {
        try {
          const signed = await signedFileUrl(file.storage_path);
          url = signed.url;
          expiresAt = signed.expiresAt;
        } catch (_) {}
      }
      return { ...row, file: { ...file, url, signed_url: url, signed_url_expires_at: expiresAt } };
    }));

    res.json({ ok: true, files });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/document-express/:docKey/files/upload-json', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const {
      fileName,
      displayName,
      mimeType = 'application/octet-stream',
      base64,
      uploadedBy,
      metadata = {},
    } = req.body || {};
    if (!base64) return res.status(400).json({ ok: false, error: 'base64 is required' });

    await ensureFileBucket();

    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const docKey = req.params.docKey || `doc-${Date.now()}`;
    const buffer = decodeBase64Payload(base64);
    if (!buffer.length) return res.status(400).json({ ok: false, error: 'Uploaded file is empty' });
    if (buffer.length > 50 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'File is larger than 50 MB' });

    const cleanName = safeFileName(fileName || displayName || `document.${extensionForMime(mimeType)}`);
    const storagePath = `${workspaceId}/document-express/${String(docKey).replace(/[^\w.-]/g, '-')}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanName}`;
    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;

    const signed = await signedFileUrl(storagePath);
    const uploadedById = isUuid(uploadedBy) ? uploadedBy : null;
    const { data: fileRow, error: fileError } = await supabase
      .from('workspace_files')
      .insert({
        workspace_id: workspaceId,
        bucket: FILE_BUCKET,
        storage_path: storagePath,
        original_name: cleanName,
        display_name: displayName || cleanName,
        mime_type: mimeType,
        file_kind: metadata.fileKind || 'document',
        size_bytes: buffer.length,
        public_url: signed.url,
        signed_url_expires_at: signed.expiresAt,
        uploaded_by: uploadedById,
        source_module: 'document_express',
        metadata: { ...metadata, docKey },
      })
      .select('*')
      .single();
    if (fileError) throw fileError;

    res.json({ ok: true, bucket: FILE_BUCKET, path: storagePath, url: signed.url, expiresAt: signed.expiresAt, file: fileRow });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/document-express/:docKey/generate-pdf', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const {
      title = 'Document',
      docType = '',
      party = '',
      relatedLabel = '',
      originalUrl = '',
      signers = [],
      audit = [],
      uploadedBy,
    } = req.body || {};

    await ensureFileBucket();

    const docKey = req.params.docKey || `doc-${Date.now()}`;
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const lines = [
      `Document type: ${docType || '-'}`,
      `Party: ${party || '-'}`,
      `Related record: ${relatedLabel || '-'}`,
      `Original file: ${originalUrl || '-'}`,
      '',
      'Signers',
      ...(Array.isArray(signers) && signers.length
        ? signers.map((s, i) => `${i + 1}. ${s.name || 'Signer'} - ${s.status || 'pending'}${s.signedName ? ` - accepted as ${s.signedName}` : ''}`)
        : ['No signers added']),
      '',
      'Audit trail',
      ...(Array.isArray(audit) && audit.length
        ? audit.slice(-12).map((a) => `${a.at || ''} - ${a.event || ''} (${a.by || 'System'})`)
        : ['No audit events yet']),
    ];
    const buffer = createSimplePdf({ title, lines });
    const cleanName = safeFileName(`${title || docType || 'document'}.pdf`);
    const storagePath = `${workspaceId}/document-express/${String(docKey).replace(/[^\w.-]/g, '-')}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanName}`;
    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    const signed = await signedFileUrl(storagePath);
    const uploadedById = isUuid(uploadedBy) ? uploadedBy : null;
    const { data: fileRow, error: fileError } = await supabase
      .from('workspace_files')
      .insert({
        workspace_id: workspaceId,
        bucket: FILE_BUCKET,
        storage_path: storagePath,
        original_name: cleanName,
        display_name: cleanName,
        mime_type: 'application/pdf',
        file_kind: 'document',
        size_bytes: buffer.length,
        public_url: signed.url,
        signed_url_expires_at: signed.expiresAt,
        uploaded_by: uploadedById,
        source_module: 'document_express',
        metadata: { docKey, generated: true },
      })
      .select('*')
      .single();
    if (fileError) throw fileError;

    res.json({ ok: true, bucket: FILE_BUCKET, path: storagePath, url: signed.url, expiresAt: signed.expiresAt, file: fileRow });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/state', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, connected: false, error: 'Supabase is not configured' });
    const state = req.body?.state;
    if (!state?.data || typeof state.data !== 'object') return res.status(400).json({ ok: false, error: 'state.data is required' });

    const payload = {
      name: STATE_ROW_NAME,
      tz_primary: state.data.tzPrimary || 'Asia/Kolkata',
      tz_additional: Array.isArray(state.data.tzAdditional) ? state.data.tzAdditional : [],
      permissions: { orbitAppState: state },
      dash_widgets: {
        tasks: state.data.tasks?.length || 0,
        users: state.data.users?.length || 0,
        contacts: state.data.crmContacts?.length || 0,
        companies: state.data.crmCompanies?.length || 0,
        deals: state.data.crmDeals?.length || 0,
        updatedAt: state.savedAt || new Date().toISOString(),
      },
    };

    const { data: existing, error: readError } = await supabase
      .from('workspace_settings')
      .select('id')
      .eq('name', STATE_ROW_NAME)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) throw readError;

    const query = existing?.id
      ? supabase.from('workspace_settings').update(payload).eq('id', existing.id)
      : supabase.from('workspace_settings').insert(payload);

    const { error } = await query;
    if (error) throw error;
    res.json({ ok: true, connected: true, savedAt: state.savedAt || new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/brand/portfolio', async (_req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const [
      { data: itemRows, error: itemError },
      { data: assetRows, error: assetError },
      { data: tagRows, error: tagError },
      { data: shareRows, error: shareError },
      { data: viewRows, error: viewError },
    ] = await Promise.all([
      supabase.from('portfolio_items').select('*').eq('workspace_id', workspaceId).order('updated_at', { ascending: false }),
      supabase.from('portfolio_assets').select('*').eq('workspace_id', workspaceId).order('display_order', { ascending: true }),
      supabase.from('portfolio_tags').select('*').eq('workspace_id', workspaceId).order('tag_name', { ascending: true }),
      supabase.from('portfolio_share_links').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabase.from('portfolio_view_events').select('*').eq('workspace_id', workspaceId).order('opened_at', { ascending: false }),
    ]);
    const firstError = itemError || assetError || tagError || shareError || viewError;
    if (isSchemaCacheMissing(firstError)) return brandSchemaPendingResponse(res, firstError);
    if (firstError) throw firstError;
    res.json({
      ok: true,
      source: 'supabase_tables',
      items: (itemRows || []).map(portfolioItemFromRow),
      assets: (assetRows || []).map(portfolioAssetFromRow),
      tags: (tagRows || []).map((row) => ({ ...(row.payload || {}), id: row.id, tag_name: row.tag_name })),
      shareLinks: (shareRows || []).map(portfolioShareLinkFromRow),
      viewEvents: (viewRows || []).map((row) => ({ ...(row.payload || {}), id: row.id })),
      counts: {
        items: itemRows?.length || 0,
        assets: assetRows?.length || 0,
        tags: tagRows?.length || 0,
        shareLinks: shareRows?.length || 0,
        viewEvents: viewRows?.length || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/brand/public/:token', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ ok: false, error: 'Share token is required' });
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const { data: linkRow, error: linkError } = await supabase
      .from('portfolio_share_links')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('token', token)
      .maybeSingle();
    if (isSchemaCacheMissing(linkError)) return brandSchemaPendingResponse(res, linkError);
    if (linkError) throw linkError;
    if (!linkRow || linkRow.is_active === false) return res.status(404).json({ ok: false, error: 'Portfolio link not found or inactive' });

    const link = portfolioShareLinkFromRow(linkRow);
    const passwordProtected = Boolean(link.password_protected || link.passwordProtected || link.password);
    if (passwordProtected) {
      const supplied = String(req.query.password || req.headers['x-portfolio-password'] || '');
      const expected = String(link.password || link.password_plain || link.passwordPlain || '');
      if (!expected || supplied !== expected) {
        return res.status(401).json({
          ok: false,
          error: 'Password required',
          passwordRequired: true,
          projectTitle: link.projectTitle || 'Protected portfolio',
        });
      }
    }

    const [
      { data: itemRow, error: itemError },
      { data: assetRows, error: assetError },
    ] = await Promise.all([
      supabase.from('portfolio_items').select('*').eq('workspace_id', workspaceId).eq('id', linkRow.portfolio_item_id).maybeSingle(),
      supabase.from('portfolio_assets').select('*').eq('workspace_id', workspaceId).eq('portfolio_item_id', linkRow.portfolio_item_id).order('display_order', { ascending: true }),
    ]);
    const firstError = itemError || assetError;
    if (isSchemaCacheMissing(firstError)) return brandSchemaPendingResponse(res, firstError);
    if (firstError) throw firstError;
    if (!itemRow) return res.status(404).json({ ok: false, error: 'Portfolio project not found' });

    const item = portfolioItemFromRow(itemRow);
    const publicAssets = (assetRows || [])
      .map(portfolioAssetFromRow)
      .filter((asset) => /image|video/i.test(String(asset.asset_type || '')) || /\.(webp|png|jpe?g|gif|mp4|mov|webm)$/i.test(`${asset.file_url || asset.external_url || asset.thumbnail_url || asset.file_name || ''}`));

    res.json({
      ok: true,
      source: 'supabase_public_link',
      link,
      item,
      assets: publicAssets,
      permissions: {
        allowDownload: Boolean(link.allow_download || link.allowDownload),
        clientOnly: Boolean(link.client_only ?? link.clientOnly ?? true),
        passwordProtected,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/brand/public/:token/view', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const token = String(req.params.token || '').trim();
    if (!token) return res.status(400).json({ ok: false, error: 'Share token is required' });
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const { data: linkRow, error: linkError } = await supabase
      .from('portfolio_share_links')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('token', token)
      .maybeSingle();
    if (isSchemaCacheMissing(linkError)) return brandSchemaPendingResponse(res, linkError);
    if (linkError) throw linkError;
    if (!linkRow || linkRow.is_active === false) return res.status(404).json({ ok: false, error: 'Portfolio link not found or inactive' });

    const visitorId = String(req.body?.visitorId || req.body?.visitor_id || `visitor-${crypto.randomBytes(5).toString('hex')}`);
    const event = {
      id: `pve-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      workspace_id: workspaceId,
      share_link_id: linkRow.id,
      portfolio_item_id: linkRow.portfolio_item_id,
      visitor_id: visitorId,
      session_id: String(req.body?.sessionId || req.body?.session_id || `session-${crypto.randomBytes(4).toString('hex')}`),
      device_type: req.body?.deviceType || req.body?.device_type || 'browser',
      browser: req.body?.browser || null,
      user_agent: req.body?.userAgent || req.body?.user_agent || req.headers['user-agent'] || null,
      opened_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      duration_seconds: Number(req.body?.durationSeconds || req.body?.duration_seconds || 0),
      is_currently_viewing: true,
      payload: {
        ...(req.body || {}),
        token,
        ipHint: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      },
    };

    const { error: eventError } = await supabase.from('portfolio_view_events').insert(event);
    if (isSchemaCacheMissing(eventError)) return brandSchemaPendingResponse(res, eventError);
    if (eventError) throw eventError;

    const { count: priorVisitorCount, error: priorError } = await supabase
      .from('portfolio_view_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('share_link_id', linkRow.id)
      .eq('visitor_id', visitorId);
    if (priorError) throw priorError;
    const isUniqueForLink = Number(priorVisitorCount || 0) <= 1;
    const totalViews = Number(linkRow.total_views || 0) + 1;
    const uniqueViews = Number(linkRow.unique_views || 0) + (isUniqueForLink ? 1 : 0);
    const payload = {
      ...(linkRow.payload || {}),
      total_views: totalViews,
      unique_views: uniqueViews,
      last_viewed_at: event.opened_at,
      lastViewedAt: event.opened_at,
    };
    const { error: updateError } = await supabase
      .from('portfolio_share_links')
      .update({
        total_views: totalViews,
        unique_views: uniqueViews,
        last_viewed_at: event.opened_at,
        currently_viewing_count: Number(linkRow.currently_viewing_count || 0) + 1,
        updated_at: event.opened_at,
        payload,
      })
      .eq('id', linkRow.id);
    if (updateError) throw updateError;

    res.json({ ok: true, eventId: event.id, totalViews, uniqueViews, openedAt: event.opened_at });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/brand/portfolio', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const workspaceId = await ensureDefaultWorkspaceRow();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const assets = Array.isArray(req.body?.assets) ? req.body.assets : [];
    const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    const shareLinks = Array.isArray(req.body?.shareLinks) ? req.body.shareLinks : [];
    const viewEvents = Array.isArray(req.body?.viewEvents) ? req.body.viewEvents : [];

    const itemRows = items.map((item) => portfolioItemRow(item, workspaceId));
    const assetRows = assets.map((asset) => portfolioAssetRow(asset, workspaceId)).filter((row) => row.portfolio_item_id);
    const tagRows = tags.map((tag) => portfolioTagRow(tag, workspaceId));
    const shareRows = shareLinks.map((link) => portfolioShareLinkRow(link, workspaceId)).filter((row) => row.portfolio_item_id);
    const viewRows = viewEvents.map((event) => portfolioViewEventRow(event, workspaceId)).filter((row) => row.share_link_id && row.portfolio_item_id);

    const results = [];
    for (const [table, rows] of [
      ['portfolio_items', itemRows],
      ['portfolio_assets', assetRows],
      ['portfolio_tags', tagRows],
      ['portfolio_share_links', shareRows],
      ['portfolio_view_events', viewRows],
    ]) {
      results.push(await upsertRows(table, rows));
    }
    const deleted = [];
    for (const [table, rows] of [
      ['portfolio_assets', assetRows],
      ['portfolio_share_links', shareRows],
      ['portfolio_tags', tagRows],
      ['portfolio_items', itemRows],
    ]) {
      deleted.push(await deleteMissingRows(table, workspaceId, rows.map((row) => row.id)));
    }
    res.json({
      ok: true,
      source: 'supabase_tables',
      savedAt: new Date().toISOString(),
      summary: Object.fromEntries(results.map((r) => [r.table, r.count])),
      deleted: Object.fromEntries(deleted.map((r) => [r.table, r.deleted])),
    });
  } catch (error) {
    if (isSchemaCacheMissing(error)) return brandSchemaPendingResponse(res, error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/migrate/snapshot-brand', async (_req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const state = await readSnapshotState();
    const source = state || {};
    const items = Array.isArray(source.brandPortfolioItems) ? source.brandPortfolioItems : [];
    const assets = Array.isArray(source.brandPortfolioAssets) ? source.brandPortfolioAssets : [];
    const tags = Array.isArray(source.brandPortfolioTags) ? source.brandPortfolioTags : [];
    const shareLinks = Array.isArray(source.brandPortfolioShareLinks) ? source.brandPortfolioShareLinks : [];
    const viewEvents = Array.isArray(source.brandPortfolioViewEvents) ? source.brandPortfolioViewEvents : [];
    if (!items.length) return res.status(404).json({ ok: false, error: 'No Brand portfolio data found in Orbit snapshot yet. Open Brand once so the app saves it, then retry.' });

    const workspaceId = await ensureDefaultWorkspaceRow();
    const rows = {
      portfolio_items: items.map((item) => portfolioItemRow(item, workspaceId)),
      portfolio_assets: assets.map((asset) => portfolioAssetRow(asset, workspaceId)).filter((row) => row.portfolio_item_id),
      portfolio_tags: tags.map((tag) => portfolioTagRow(tag, workspaceId)),
      portfolio_share_links: shareLinks.map((link) => portfolioShareLinkRow(link, workspaceId)).filter((row) => row.portfolio_item_id),
      portfolio_view_events: viewEvents.map((event) => portfolioViewEventRow(event, workspaceId)).filter((row) => row.share_link_id && row.portfolio_item_id),
    };
    const results = [];
    for (const [table, tableRows] of Object.entries(rows)) results.push(await upsertRows(table, tableRows));
    res.json({
      ok: true,
      source: state ? 'snapshot' : 'empty',
      migratedRows: results.reduce((sum, r) => sum + r.count, 0),
      summary: Object.fromEntries(results.map((r) => [r.table, r.count])),
    });
  } catch (error) {
    if (isSchemaCacheMissing(error)) return brandSchemaPendingResponse(res, error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/wa-web/start', async (req, res) => {
  try {
    const hardReset = Boolean(req.body?.hardReset || req.body?.clearSession);
    if (hardReset) await resetWhatsAppWebSession({ clearAuth: true });
    await ensureWhatsAppWebClient({ reset: Boolean(req.body?.reset || hardReset) });
    res.json({ ok: true, ...publicWhatsappWebStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, ...publicWhatsappWebStatus() });
  }
});

app.get('/wa-web/status', (_req, res) => {
  res.json({ ok: true, ...publicWhatsappWebStatus() });
});

app.get('/wa-web/screenshot', async (_req, res) => {
  try {
    const client = whatsappWebState.client;
    if (!client || !client.pupPage) {
      return res.status(404).json({ ok: false, error: 'No active browser page found' });
    }
    const screenshot = await client.pupPage.screenshot({ encoding: 'base64' });
    res.json({ ok: true, screenshot: `data:image/png;base64,${screenshot}` });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/wa-web/disconnect', async (_req, res) => {
  try {
    await resetWhatsAppWebSession({ clearAuth: false });
    res.json({ ok: true, ...publicWhatsappWebStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, ...publicWhatsappWebStatus() });
  }
});

app.post('/wa-web/hard-reset', async (_req, res) => {
  try {
    await resetWhatsAppWebSession({ clearAuth: true });
    res.json({ ok: true, ...publicWhatsappWebStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, ...publicWhatsappWebStatus() });
  }
});

app.post('/wa-web/send', async (req, res) => {
  try {
    const { to, message, media, recipient, relatedModule, relatedRecordId, organizationId, workspaceId } = req.body;
    if (!to || !message) return res.status(400).json({ ok: false, error: 'to and message are required' });
    const sent = await sendWhatsAppWeb({ to, message, media });
    const { data, error } = await writeMessageLog({
      recipient: recipient || null,
      number: to,
      type: 'whatsapp_web',
      related_module: relatedModule || null,
      related_record_id: relatedRecordId || null,
      organizationId,
      workspaceId,
      provider_message_id: sent.id,
      status: sent.status || 'sent',
      sent_by: 'whatsapp-web-qr',
      sent_at: new Date().toISOString(),
    });
    if (error) throw error;
    res.json({ ok: true, result: sent, log: data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, ...publicWhatsappWebStatus() });
  }
});

app.get('/marketing/chatbot/events', (_req, res) => {
  res.json({
    ok: true,
    inbox: chatbotRuntime.inbox.slice(0, 100),
    replies: chatbotRuntime.replies.slice(0, 100),
  });
});

app.post('/marketing/chatbot/simulate', async (req, res) => {
  try {
    const body = String(req.body?.message || req.body?.body || '').trim();
    const from = String(req.body?.from || req.body?.number || '919999999999@c.us').trim();
    if (!body) return res.status(400).json({ ok: false, error: 'message is required' });
    const state = await readSnapshotState();
    const bot = findMatchingChatbot(state, body);
    const reply = bot ? buildChatbotReply({ state, bot, incomingText: body, from }) : '';
    const event = await recordChatbotRuntimeEvent({
      from,
      body,
      matched: Boolean(bot),
      chatbotId: bot?.id || null,
      chatbotName: bot?.name || null,
      simulated: true,
    });
    res.json({ ok: true, matched: Boolean(bot), bot, reply, event });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/marketing/reply-materials/upload-json', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const {
      fileName,
      displayName,
      mimeType = 'application/octet-stream',
      base64,
      materialId,
      materialKind,
      uploadedBy,
      metadata = {},
    } = req.body || {};
    if (!base64) return res.status(400).json({ ok: false, error: 'base64 is required' });

    await ensureFileBucket();
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const buffer = decodeBase64Payload(base64);
    if (!buffer.length) return res.status(400).json({ ok: false, error: 'Uploaded file is empty' });
    if (buffer.length > 50 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'File is larger than 50 MB' });

    const cleanName = safeFileName(fileName || displayName || `reply-material.${extensionForMime(mimeType)}`);
    const materialKey = String(materialId || 'new').replace(/[^\w.-]/g, '-');
    const storagePath = `${workspaceId}/marketing/reply-materials/${materialKey}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;

    const signed = await signedFileUrl(storagePath);
    const inferredKind = materialKind || (String(mimeType).startsWith('image/') ? 'image' : String(mimeType).startsWith('video/') ? 'video' : String(mimeType).startsWith('audio/') ? 'audio' : 'document');
    const uploadedById = isUuid(uploadedBy) ? uploadedBy : null;

    const { data: fileRow, error: fileError } = await supabase
      .from('workspace_files')
      .insert({
        workspace_id: workspaceId,
        bucket: FILE_BUCKET,
        storage_path: storagePath,
        original_name: cleanName,
        display_name: displayName || cleanName,
        mime_type: mimeType,
        file_kind: ['attachment', 'voice_note', 'image', 'document', 'other'].includes(inferredKind) ? inferredKind : 'other',
        size_bytes: buffer.length,
        public_url: signed.url,
        signed_url_expires_at: signed.expiresAt,
        uploaded_by: uploadedById,
        source_module: 'marketing_reply_material',
        metadata: {
          ...metadata,
          materialId: materialId || null,
          materialKind: inferredKind,
        },
      })
      .select('*')
      .single();
    if (fileError) throw fileError;

    res.json({ ok: true, bucket: FILE_BUCKET, path: storagePath, url: signed.url, expiresAt: signed.expiresAt, file: fileRow });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/drip-campaigns/:campaignId/flow', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const campaignId = entityId('drip_campaign', req.params.campaignId);

    const { data: campaign, error: campaignError } = await supabase
      .from('drip_campaigns')
      .select('id,name,channel,status,pipeline_id,audience,steps,flow,updated_at')
      .eq('id', campaignId)
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) return res.status(404).json({ ok: false, error: 'Campaign not found' });

    const [{ data: nodes, error: nodesError }, { data: edges, error: edgesError }] = await Promise.all([
      supabase.from('drip_nodes').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
      supabase.from('drip_edges').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
    ]);
    if (nodesError) throw nodesError;
    if (edgesError) throw edgesError;

    const normalizedFlow = {
      version: 1,
      nodes: (nodes || []).map((node) => ({
        id: node.node_key,
        type: 'dripNode',
        position: node.position || { x: 0, y: 0 },
        data: {
          kind: node.node_type,
          title: node.title,
          ...(node.config || {}),
        },
      })),
      edges: (edges || []).map((edge) => ({
        id: edge.edge_key,
        type: edge.config?.type || 'smoothstep',
        source: edge.source_node_key,
        target: edge.target_node_key,
        sourceHandle: edge.source_handle,
        label: edge.label,
        animated: Boolean(edge.config?.animated),
      })),
    };

    res.json({
      ok: true,
      campaign,
      flow: normalizedFlow.nodes.length ? normalizedFlow : campaign.flow,
      rowCounts: { drip_nodes: nodes?.length || 0, drip_edges: edges?.length || 0 },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/drip-campaigns/:campaignId/flow', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const legacyCampaignId = req.params.campaignId;
    const campaignId = entityId('drip_campaign', legacyCampaignId);
    const campaign = req.body?.campaign || {};
    const flow = req.body?.flow || campaign.flow;
    if (!flow?.nodes || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
      return res.status(400).json({ ok: false, error: 'flow.nodes and flow.edges are required' });
    }

    const campaignRow = compactObject({
      id: campaignId,
      workspace_id: workspaceId,
      name: campaign.name || 'Untitled Campaign',
      channel: campaign.channel || 'whatsapp',
      status: campaign.status || 'draft',
      pipeline_id: entityId('pipeline', campaign.pipelineId || campaign.pipeline_id || 'pl_default'),
      audience: campaign.audience || {},
      steps: Array.isArray(campaign.steps) ? campaign.steps : [],
      flow,
      updated_at: new Date().toISOString(),
    });

    const { error: campaignError } = await supabase
      .from('drip_campaigns')
      .upsert(campaignRow, { onConflict: 'id' });
    if (campaignError) throw campaignError;

    const nodeRows = flow.nodes.map((node) => {
      const { kind, title, ...config } = node.data || {};
      return {
        id: stableUuid('drip_node', `${campaignId}:${node.id}`),
        workspace_id: workspaceId,
        campaign_id: campaignId,
        node_key: node.id,
        node_type: kind || 'send_whatsapp',
        title: title || null,
        config,
        position: node.position || {},
        updated_at: new Date().toISOString(),
      };
    });

    const edgeRows = flow.edges.map((edge) => ({
      id: stableUuid('drip_edge', `${campaignId}:${edge.id}`),
      workspace_id: workspaceId,
      campaign_id: campaignId,
      edge_key: edge.id,
      source_node_key: edge.source,
      target_node_key: edge.target,
      source_handle: edge.sourceHandle || null,
      label: edge.label || null,
      config: {
        type: edge.type || 'smoothstep',
        animated: Boolean(edge.animated),
      },
      updated_at: new Date().toISOString(),
    }));

    const { error: deleteEdgesError } = await supabase.from('drip_edges').delete().eq('campaign_id', campaignId);
    if (deleteEdgesError) throw deleteEdgesError;
    const { error: deleteNodesError } = await supabase.from('drip_nodes').delete().eq('campaign_id', campaignId);
    if (deleteNodesError) throw deleteNodesError;

    if (nodeRows.length) {
      const { error } = await supabase.from('drip_nodes').upsert(nodeRows, { onConflict: 'campaign_id,node_key' });
      if (error) throw error;
    }
    if (edgeRows.length) {
      const { error } = await supabase.from('drip_edges').upsert(edgeRows, { onConflict: 'campaign_id,edge_key' });
      if (error) throw error;
    }

    res.json({
      ok: true,
      campaignId,
      savedAt: new Date().toISOString(),
      rowCounts: { drip_campaigns: 1, drip_nodes: nodeRows.length, drip_edges: edgeRows.length },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/drip-events', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const eventType = req.body?.eventType || req.body?.event_type;
    if (!eventType) return res.status(400).json({ ok: false, error: 'eventType is required' });

    const row = compactObject({
      workspace_id: workspaceId,
      campaign_id: entityId('drip_campaign', req.body?.campaignId || req.body?.campaign_id),
      enrolment_id: entityId('drip_enrolment', req.body?.enrolmentId || req.body?.enrolment_id),
      contact_id: entityId('contact', req.body?.contactId || req.body?.contact_id),
      event_type: eventType,
      node_key: req.body?.nodeKey || req.body?.node_key || null,
      provider_message_id: req.body?.providerMessageId || req.body?.provider_message_id || null,
      payload: req.body?.payload || {},
      occurred_at: timestamp(req.body?.occurredAt || req.body?.occurred_at) || new Date().toISOString(),
    });

    const { data, error } = await supabase.from('drip_events').insert(row).select('*').single();
    if (error) throw error;
    res.json({ ok: true, event: data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/migrate/snapshot-core', async (_req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const state = await readSnapshotState();
    if (!state) return res.status(404).json({ ok: false, error: 'No Orbit snapshot found in workspace_settings' });

    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const deptId = (legacyId) => legacyId ? stableUuid('department', legacyId) : null;
    const userId = (legacyId) => legacyId ? stableUuid('user', legacyId) : null;
    const taskId = (legacyId) => legacyId ? stableUuid('task', legacyId) : null;
    const ideaId = (legacyId) => legacyId ? stableUuid('idea', legacyId) : null;
    const templateId = (legacyId) => legacyId ? stableUuid('task_template', legacyId) : null;

    const workspaces = [{
      id: workspaceId,
      name: 'Orbit Workspace Hub',
    }];

    const departments = (state.departments || []).map((d) => ({
      id: deptId(d.id),
      workspace_id: workspaceId,
      name: d.name || 'Untitled Department',
      color: d.color || null,
    }));

    const users = (state.users || []).map((u) => compactObject({
      id: userId(u.id),
      workspace_id: workspaceId,
      name: u.name || 'Unnamed User',
      email: u.email || null,
      whatsapp: u.whatsapp || u.phone || null,
      role: ['admin', 'manager', 'member', 'user'].includes(u.role) ? u.role : 'member',
      dept_id: deptId(u.dept),
      reports_to: userId(u.reportsTo || u.reports_to),
      status: u.status || 'active',
      app_access: Array.isArray(u.appAccess) ? u.appAccess : [],
      color: u.color || null,
      avatar_url: u.avatarUrl || u.avatar_url || null,
    }));

    const tasks = (state.tasks || []).map((t) => compactObject({
      id: taskId(t.id),
      workspace_id: workspaceId,
      title: t.title || 'Untitled Task',
      description: t.description || t.desc || t.notes || null,
      type: t.type || null,
      dept_id: deptId(t.dept || t.deptId),
      assigned_by: userId(t.assignedBy || t.assigned_by),
      assigned_to: userId(t.assignedTo || t.assigned_to),
      manager_id: userId(t.manager || t.managerId),
      priority: t.priority || null,
      status: t.status || 'draft',
      due: timestamp(t.startDate || t.dueAt),
      start_date: dateOnly(t.startDate),
      end_date: dateOnly(t.endDate),
      focus: Boolean(t.focus),
      focus_date: dateOnly(t.focusDate),
      recurring: Boolean(t.recurring),
      estimate_minutes: Number.isFinite(Number(t.estimateMinutes)) ? Number(t.estimateMinutes) : null,
      channels: t.channels || {},
      reminders: Array.isArray(t.reminders) ? t.reminders : [],
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
      tags: Array.isArray(t.tags) ? t.tags : [],
      watchers: Array.isArray(t.watchers) ? t.watchers.map(userId).filter(Boolean) : [],
      dependencies: t.dependencies || {},
      comments: Array.isArray(t.comments) ? t.comments : [],
      activity: Array.isArray(t.activity) ? t.activity : [],
    }));

    const ideas = (state.ideas || []).map((i) => ({
      id: ideaId(i.id),
      workspace_id: workspaceId,
      title: i.title || 'Untitled Idea',
      description: i.notes || i.description || null,
      status: i.status || 'idea',
      tags: Array.isArray(i.tags) ? i.tags : [],
      payload: i,
    }));

    const taskTemplates = (state.taskTemplates || []).map((t) => ({
      id: templateId(t.id),
      workspace_id: workspaceId,
      name: t.name || t.title || 'Untitled Template',
      payload: t,
    }));

    const workspaceSettings = [{
      id: stableUuid('workspace_settings', 'default-settings'),
      workspace_id: workspaceId,
      name: 'Orbit Workspace Settings',
      tz_primary: state.tzPrimary || 'Asia/Kolkata',
      tz_additional: Array.isArray(state.tzAdditional) ? state.tzAdditional : [],
      permissions: state.permissions || {},
      dash_widgets: state.dashWidgets || {},
    }];

    const results = [];
    for (const [table, rows] of [
      ['workspaces', workspaces],
      ['departments', departments],
      ['users', users],
      ['tasks', tasks],
      ['ideas', ideas],
      ['task_templates', taskTemplates],
      ['workspace_settings', workspaceSettings],
    ]) {
      results.push(await upsertRows(table, rows));
    }

    const summary = Object.fromEntries(results.map((r) => [r.table, r.count]));
    res.json({
      ok: true,
      migratedTables: results.filter((r) => r.count > 0).length,
      migratedRows: results.reduce((sum, r) => sum + r.count, 0),
      summary,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/migrate/snapshot-crm', async (_req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const state = await readSnapshotState();
    if (!state) return res.status(404).json({ ok: false, error: 'No Orbit snapshot found in workspace_settings' });

    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const pipelineId = (legacyId) => legacyId ? stableUuid('pipeline', legacyId) : null;
    const companyId = (legacyId) => legacyId ? stableUuid('company', legacyId) : null;
    const contactId = (legacyId) => legacyId ? stableUuid('contact', legacyId) : null;
    const dealId = (legacyId) => legacyId ? stableUuid('deal', legacyId) : null;
    const activityId = (legacyId) => legacyId ? stableUuid('activity', legacyId) : null;
    const userId = (legacyId) => legacyId ? stableUuid('user', legacyId) : null;

    const sourcePipelines = Array.isArray(state.crmPipelines) && state.crmPipelines.length ? state.crmPipelines : DEFAULT_CRM.pipelines;
    const sourceCompanies = Array.isArray(state.crmCompanies) && state.crmCompanies.length ? state.crmCompanies : DEFAULT_CRM.companies;
    const sourceContacts = Array.isArray(state.crmContacts) && state.crmContacts.length ? state.crmContacts : DEFAULT_CRM.contacts;
    const sourceDeals = Array.isArray(state.crmDeals) && state.crmDeals.length ? state.crmDeals : DEFAULT_CRM.deals;
    const sourceActivities = Array.isArray(state.crmActivities) && state.crmActivities.length ? state.crmActivities : DEFAULT_CRM.activities;

    const pipelines = sourcePipelines.map((p) => ({
      id: pipelineId(p.id),
      workspace_id: workspaceId,
      name: p.name || 'Untitled Pipeline',
      stages: Array.isArray(p.stages) ? p.stages : [],
      form: p.form || null,
    }));

    const companies = sourceCompanies.map((c) => ({
      id: companyId(c.id),
      workspace_id: workspaceId,
      name: c.name || 'Untitled Company',
      type: c.type || null,
      city: c.city || null,
      notes: c.notes || null,
    }));

    const contacts = sourceContacts.map((c) => compactObject({
      id: contactId(c.id),
      workspace_id: workspaceId,
      name: c.name || 'Unnamed Contact',
      whatsapp: c.whatsapp || c.phone || '',
      email: c.email || null,
      company_id: companyId(c.companyId || c.company_id),
      role: c.role || null,
      pipeline_id: pipelineId(c.pipelineId || c.pipeline_id || sourcePipelines[0]?.id),
      stage: c.stage || null,
      tags: Array.isArray(c.tags) ? c.tags : [],
      city: c.city || null,
      source: c.source || null,
      notes: c.notes || null,
    }));

    const deals = sourceDeals.map((d) => compactObject({
      id: dealId(d.id),
      workspace_id: workspaceId,
      title: d.title || 'Untitled Deal',
      contact_id: contactId(d.contactId || d.contact_id),
      company_id: companyId(d.companyId || d.company_id),
      stage: d.stage || 'new',
      value: Number.isFinite(Number(d.value)) ? Number(d.value) : null,
      expected_close: dateOnly(d.expectedClose || d.expected_close),
      owner_id: userId(d.owner || d.ownerId || d.owner_id),
      notes: d.notes || null,
    }));

    const activities = sourceActivities.map((a) => compactObject({
      id: activityId(a.id),
      workspace_id: workspaceId,
      contact_id: contactId(a.contactId || a.contact_id),
      deal_id: dealId(a.dealId || a.deal_id),
      type: a.type || 'note',
      note: a.note || null,
      at: dateOnly(a.at),
      by_user_id: userId(a.by || a.byUserId || a.by_user_id),
    }));

    const results = [];
    for (const [table, rows] of [
      ['pipelines', pipelines],
      ['companies', companies],
      ['contacts', contacts],
      ['deals', deals],
      ['activities', activities],
    ]) {
      results.push(await upsertRows(table, rows));
    }

    const summary = Object.fromEntries(results.map((r) => [r.table, r.count]));
    res.json({
      ok: true,
      migratedTables: results.filter((r) => r.count > 0).length,
      migratedRows: results.reduce((sum, r) => sum + r.count, 0),
      source: {
        pipelines: sourcePipelines === DEFAULT_CRM.pipelines ? 'default' : 'snapshot',
        companies: sourceCompanies === DEFAULT_CRM.companies ? 'default' : 'snapshot',
        contacts: sourceContacts === DEFAULT_CRM.contacts ? 'default' : 'snapshot',
        deals: sourceDeals === DEFAULT_CRM.deals ? 'default' : 'snapshot',
        activities: sourceActivities === DEFAULT_CRM.activities ? 'default' : 'snapshot',
      },
      summary,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/migrate/snapshot-messaging', async (_req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const state = await readSnapshotState();
    if (!state) return res.status(404).json({ ok: false, error: 'No Orbit snapshot found in workspace_settings' });

    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const templateId = (legacyId) => legacyId ? stableUuid('message_template', legacyId) : null;
    const ruleId = (legacyId) => legacyId ? stableUuid('reminder_rule', legacyId) : null;
    const logId = (legacyId) => legacyId ? stableUuid('message_log', legacyId) : null;
    const campaignId = (legacyId) => legacyId ? stableUuid('drip_campaign', legacyId) : null;
    const enrolmentId = (legacyId) => legacyId ? stableUuid('drip_enrolment', legacyId) : null;
    const pipelineId = (legacyId) => legacyId ? stableUuid('pipeline', legacyId) : null;
    const contactId = (legacyId) => legacyId ? stableUuid('contact', legacyId) : null;

    const sourceConnection = state.waConnection && typeof state.waConnection === 'object' ? state.waConnection : DEFAULT_MESSAGING.waConnection;
    const sourceTemplates = Array.isArray(state.waTemplates) && state.waTemplates.length ? state.waTemplates : DEFAULT_MESSAGING.waTemplates;
    const sourceRules = Array.isArray(state.waRules) && state.waRules.length ? state.waRules : DEFAULT_MESSAGING.waRules;
    const sourceLogs = Array.isArray(state.waLogs) && state.waLogs.length ? state.waLogs : DEFAULT_MESSAGING.waLogs;
    const sourceCampaigns = Array.isArray(state.dripCampaigns) && state.dripCampaigns.length ? state.dripCampaigns : DEFAULT_MESSAGING.dripCampaigns;
    const sourceEnrolments = Array.isArray(state.dripEnrolments) && state.dripEnrolments.length ? state.dripEnrolments : DEFAULT_MESSAGING.dripEnrolments;

    const waConnections = [{
      id: stableUuid('wa_connection', 'default'),
      workspace_id: workspaceId,
      provider: sourceConnection.provider || 'cloud',
      phone_number: sourceConnection.phoneNumber || sourceConnection.phone_number || null,
      phone_number_id: sourceConnection.phoneNumberId || sourceConnection.phone_number_id || null,
      waba_id: sourceConnection.wabaId || sourceConnection.waba_id || null,
      status: sourceConnection.status || 'disconnected',
      health: sourceConnection.health || 'unknown',
      last_connected_at: timestamp(sourceConnection.lastConnectedAt || sourceConnection.last_connected_at),
      last_message_at: timestamp(sourceConnection.lastMessageAt || sourceConnection.last_message_at),
      daily_limit: Number.isFinite(Number(sourceConnection.dailyLimit)) ? Number(sourceConnection.dailyLimit) : 250,
      sent_today: Number.isFinite(Number(sourceConnection.sentToday)) ? Number(sourceConnection.sentToday) : 0,
    }];

    const messageTemplates = sourceTemplates.map((t) => ({
      id: templateId(t.id),
      workspace_id: workspaceId,
      name: t.name || 'Untitled Template',
      use_case: t.useCase || t.use_case || null,
      body: t.body || '',
      status: t.status || 'draft',
    }));

    const reminderRules = sourceRules.map((r) => compactObject({
      id: ruleId(r.id),
      workspace_id: workspaceId,
      name: r.name || 'Untitled Rule',
      trigger_type: r.triggerType || r.trigger_type || null,
      condition: r.condition || null,
      delay_minutes: Number.isFinite(Number(r.delayMinutes ?? r.delay_minutes)) ? Number(r.delayMinutes ?? r.delay_minutes) : 0,
      recipient_type: r.recipientType || r.recipient_type || null,
      template_id: templateId(r.templateId || r.template_id),
      active: Boolean(r.active),
    }));

    const messageLogs = sourceLogs.map((l) => compactObject({
      id: logId(l.id),
      workspace_id: workspaceId,
      recipient: l.recipient || null,
      number: l.number || null,
      type: l.type || 'whatsapp',
      related_module: l.module || l.relatedModule || l.related_module || null,
      related_record_id: null,
      provider_message_id: l.msgId || l.providerMessageId || l.provider_message_id || null,
      status: l.status || 'queued',
      error: l.error || null,
      sent_by: l.sentBy || l.sent_by || null,
      sent_at: relativeTimestamp(l.at || l.sentAt || l.sent_at),
      delivered_at: ['delivered', 'read'].includes(l.status) ? relativeTimestamp(l.at) : null,
      read_at: l.status === 'read' ? relativeTimestamp(l.at) : null,
      failed_at: l.status === 'failed' ? relativeTimestamp(l.at) : null,
    }));

    const dripCampaigns = sourceCampaigns.map((c) => ({
      id: campaignId(c.id),
      workspace_id: workspaceId,
      name: c.name || 'Untitled Campaign',
      channel: c.channel || 'whatsapp',
      status: c.status || 'draft',
      pipeline_id: pipelineId(c.pipelineId || c.pipeline_id || 'pl_default'),
      audience: c.audience || {},
      steps: Array.isArray(c.steps) ? c.steps.map((step) => ({
        ...step,
        templateId: step.templateId ? templateId(step.templateId) : undefined,
      })) : [],
      flow: c.flow && typeof c.flow === 'object' ? c.flow : {},
    }));

    const dripEnrolments = sourceEnrolments.map((e) => ({
      id: enrolmentId(e.id),
      workspace_id: workspaceId,
      campaign_id: campaignId(e.campaignId || e.campaign_id),
      contact_id: contactId(e.contactId || e.contact_id),
      current_node_key: e.currentNodeKey || e.current_node_key || null,
      last_node_key: e.lastNodeKey || e.last_node_key || null,
      step_index: Number.isFinite(Number(e.stepIndex ?? e.step_index)) ? Number(e.stepIndex ?? e.step_index) : 0,
      status: e.status || 'active',
      last_opened: Boolean(e.lastOpened || e.last_opened),
      last_clicked: Boolean(e.lastClicked || e.last_clicked),
      enrolled_at: dateOnly(e.enrolledAt || e.enrolled_at) || new Date().toISOString().slice(0, 10),
      next_run_at: timestamp(e.nextRunAt || e.next_run_at),
      context: e.context || {},
    }));

    const results = [];
    for (const [table, rows] of [
      ['wa_connections', waConnections],
      ['message_templates', messageTemplates],
      ['reminder_rules', reminderRules],
      ['message_logs', messageLogs],
      ['drip_campaigns', dripCampaigns],
      ['drip_enrolments', dripEnrolments],
    ]) {
      results.push(await upsertRows(table, rows));
    }

    const summary = Object.fromEntries(results.map((r) => [r.table, r.count]));
    res.json({
      ok: true,
      migratedTables: results.filter((r) => r.count > 0).length,
      migratedRows: results.reduce((sum, r) => sum + r.count, 0),
      source: {
        waConnection: sourceConnection === DEFAULT_MESSAGING.waConnection ? 'default' : 'snapshot',
        waTemplates: sourceTemplates === DEFAULT_MESSAGING.waTemplates ? 'default' : 'snapshot',
        waRules: sourceRules === DEFAULT_MESSAGING.waRules ? 'default' : 'snapshot',
        waLogs: sourceLogs === DEFAULT_MESSAGING.waLogs ? 'default' : 'snapshot',
        dripCampaigns: sourceCampaigns === DEFAULT_MESSAGING.dripCampaigns ? 'default' : 'snapshot',
        dripEnrolments: sourceEnrolments === DEFAULT_MESSAGING.dripEnrolments ? 'default' : 'snapshot',
      },
      summary,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/migrate/snapshot-content', async (_req, res) => {
  try {
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase is not configured' });
    const state = await readSnapshotState();
    if (!state) return res.status(404).json({ ok: false, error: 'No Orbit snapshot found in workspace_settings' });

    const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
    const sectionId = (legacyId) => legacyId ? stableUuid('intranet_section', legacyId) : null;
    const contentId = (legacyId) => legacyId ? stableUuid('intranet_content', legacyId) : null;
    const announcementId = (legacyId) => legacyId ? stableUuid('announcement', legacyId) : null;
    const quickLinkId = (legacyId) => legacyId ? stableUuid('quick_link', legacyId) : null;
    const importantDateId = (legacyId) => legacyId ? stableUuid('important_date', legacyId) : null;

    const sourceSections = Array.isArray(state.intranetSections) ? state.intranetSections : [];
    const sourceContent = Array.isArray(state.intranetContent) ? state.intranetContent : [];
    const sourceAnnouncements = Array.isArray(state.intranetAnnouncements) && state.intranetAnnouncements.length ? state.intranetAnnouncements : DEFAULT_CONTENT.announcements;
    const sourceQuickLinks = Array.isArray(state.intranetQuickLinks) && state.intranetQuickLinks.length ? state.intranetQuickLinks : DEFAULT_CONTENT.quickLinks;
    const sourceImportantDates = Array.isArray(state.importantDates) ? state.importantDates : [];

    const intranetSections = sourceSections.map((s) => ({
      id: sectionId(s.id),
      workspace_id: workspaceId,
      name: s.name || 'Untitled Section',
      icon: s.icon || null,
      color: s.color || null,
      description: s.description || s.desc || null,
      parent_id: sectionId(s.parentId || s.parent_id),
      sort: Number.isFinite(Number(s.sort)) ? Number(s.sort) : null,
      visibility: s.visibility || 'all',
      allowed_dept_id: s.allowedDeptId || s.allowed_dept_id || 'all',
      allowed_roles: Array.isArray(s.allowedRoles) ? s.allowedRoles : Array.isArray(s.allowed_roles) ? s.allowed_roles : [],
      allowed_user_ids: Array.isArray(s.allowedUserIds) ? s.allowedUserIds : Array.isArray(s.allowed_user_ids) ? s.allowed_user_ids : [],
      status: s.status || 'active',
      ai_search: s.aiSearch ?? s.ai_search ?? true,
      comments: s.comments ?? true,
      versioning: s.versioning ?? true,
    }));

    const intranetContent = sourceContent.map((c) => ({
      id: contentId(c.id),
      workspace_id: workspaceId,
      section_id: sectionId(c.sectionId || c.section_id),
      title: c.title || 'Untitled Content',
      type: c.type || 'article',
      status: c.status || 'draft',
      excerpt: c.excerpt || null,
      body: c.body || null,
      tags: Array.isArray(c.tags) ? c.tags : [],
      author: c.author || null,
      updated_at: timestamp(c.updatedAt || c.updated_at) || new Date().toISOString(),
    }));

    const announcements = sourceAnnouncements.map((a) => ({
      id: announcementId(a.id),
      workspace_id: workspaceId,
      title: a.title || 'Untitled Announcement',
      body: a.body || null,
      at: timestamp(a.at) || new Date().toISOString(),
    }));

    const quickLinks = sourceQuickLinks.map((q) => ({
      id: quickLinkId(q.id),
      workspace_id: workspaceId,
      label: q.label || q.title || 'Untitled Link',
      url: q.url || '#',
      at: timestamp(q.at),
    }));

    const importantDates = sourceImportantDates.map((d) => ({
      id: importantDateId(d.id),
      workspace_id: workspaceId,
      name: d.name || 'Untitled Date',
      category: d.category || null,
      start_date: dateOnly(d.startDate || d.start_date),
      end_date: dateOnly(d.endDate || d.end_date),
      recurrence: d.recurrence || null,
      scope: d.scope || null,
      status: d.status || 'active',
      mode: d.mode || null,
      city: d.city || null,
      country: d.country || null,
      venue: d.venue || null,
      discipline_tags: Array.isArray(d.disciplineTags) ? d.disciplineTags : Array.isArray(d.discipline_tags) ? d.discipline_tags : [],
      official_link: d.officialLink || d.official_link || null,
      notes: d.notes || null,
      approx: Boolean(d.approx),
    }));

    const results = [];
    for (const [table, rows] of [
      ['intranet_sections', intranetSections],
      ['intranet_content', intranetContent],
      ['announcements', announcements],
      ['quick_links', quickLinks],
      ['important_dates', importantDates],
    ]) {
      results.push(await upsertRows(table, rows));
    }

    const summary = Object.fromEntries(results.map((r) => [r.table, r.count]));
    res.json({
      ok: true,
      migratedTables: results.filter((r) => r.count > 0).length,
      migratedRows: results.reduce((sum, r) => sum + r.count, 0),
      source: {
        intranetSections: sourceSections === state.intranetSections ? 'snapshot' : 'default',
        intranetContent: sourceContent === state.intranetContent ? 'snapshot' : 'default',
        intranetAnnouncements: sourceAnnouncements === DEFAULT_CONTENT.announcements ? 'default' : 'snapshot',
        intranetQuickLinks: sourceQuickLinks === DEFAULT_CONTENT.quickLinks ? 'default' : 'snapshot',
        importantDates: sourceImportantDates === state.importantDates ? 'snapshot' : 'default',
      },
      summary,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/wa/send-test', async (req, res) => {
  try {
    const to = String(req.body.to || req.body.number || '').trim();
    const message = String(req.body.message || 'Orbit test message').trim();
    if (!to) return res.status(400).json({ error: 'to is required' });

    const sent = await sendWhatsApp({ to, message });
    const { data, error } = await writeMessageLog({
      recipient: req.body.recipient || 'Test recipient',
      number: to,
      type: 'whatsapp',
      related_module: 'wa_send_test',
      organizationId: req.body.organizationId,
      workspaceId: req.body.workspaceId,
      provider_message_id: sent.id,
      status: sent.status || 'sent',
      sent_by: 'orbit-api',
      sent_at: new Date().toISOString(),
    });
    if (error) throw error;
    res.json({ ok: true, provider: sent.provider, result: sent, log: data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/wa/send', async (req, res) => {
  try {
    const { to, message, relatedModule, relatedRecordId, organizationId, workspaceId } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
    const sent = await sendWhatsApp({ to, message });
    const { data, error } = await writeMessageLog({
      recipient: req.body.recipient || null,
      number: to,
      type: 'whatsapp',
      related_module: relatedModule || null,
      related_record_id: relatedRecordId || null,
      organizationId,
      workspaceId,
      provider_message_id: sent.id,
      status: sent.status || 'sent',
      sent_by: 'orbit-api',
      sent_at: new Date().toISOString(),
    });
    if (error) throw error;
    res.json({ ok: true, result: sent, log: data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/email/status', (_req, res) => {
  res.json({ ok: true, ...emailProviderStatus() });
});

app.post('/email/send-test', async (req, res) => {
  try {
    const to = String(req.body.to || '').trim();
    const subject = String(req.body.subject || 'Orbit test email').trim();
    const text = String(req.body.text || req.body.message || 'This is a test email from Orbit.').trim();
    const html = req.body.html ? String(req.body.html) : '';
    const from = req.body.from ? String(req.body.from).trim() : '';
    if (!to) return res.status(400).json({ ok: false, error: 'to is required' });

    const sent = await sendEmail({ to, subject, text, html, from });
    const { data, error } = await writeMessageLog({
      recipient: req.body.recipient || to,
      number: null,
      type: 'email',
      related_module: req.body.relatedModule || 'email_send_test',
      related_record_id: req.body.relatedRecordId || null,
      organizationId: req.body.organizationId,
      workspaceId: req.body.workspaceId,
      provider_message_id: sent.id,
      status: sent.status || 'sent',
      error: JSON.stringify({ subject, from: sent.from, provider: sent.provider }).slice(0, 1000),
      sent_by: 'orbit-api',
      sent_at: new Date().toISOString(),
    });
    if (error) throw error;
    res.json({ ok: true, provider: sent.provider, result: sent, log: data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/webhooks/whatsapp', (req, res) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (req.query['hub.verify_token'] === verifyToken) return res.send(req.query['hub.challenge']);
  res.sendStatus(403);
});

app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const payload = req.body || {};
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value || payload;
    const inbound = value.messages?.[0] || payload.message || null;
    const status = value.statuses?.[0] || payload.status || null;

    if (inbound?.text?.body || inbound?.body) {
      await handleIncomingWhatsAppMessage({
        from: inbound.from || payload.from,
        body: inbound.text?.body || inbound.body,
        id: inbound.id,
      });
    }

    if (supabase) {
      await writeMessageLog({
        type: inbound ? 'whatsapp_inbound' : status ? 'whatsapp_status' : 'whatsapp_webhook',
        related_module: 'webhook',
        provider_message_id: inbound?.id || status?.id || null,
        status: status?.status || (inbound ? 'received' : 'received'),
        error: JSON.stringify(payload).slice(0, 4000),
        sent_at: inbound ? new Date().toISOString() : null,
      });
    }
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/webhooks/email', (_req, res) => {
  res.sendStatus(200);
});

async function insertDripEvent({ campaignId, enrolmentId, contactId, eventType, nodeKey, payload = {} }) {
  const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
  const { data, error } = await supabase.from('drip_events').insert(compactObject({
    workspace_id: workspaceId,
    campaign_id: campaignId,
    enrolment_id: enrolmentId,
    contact_id: contactId,
    event_type: eventType,
    node_key: nodeKey,
    payload,
    occurred_at: new Date().toISOString(),
  })).select('*').single();
  if (error) throw error;
  return data;
}

async function recentDripEvents({ campaignId, contactId, sinceIso }) {
  let query = supabase
    .from('drip_events')
    .select('event_type,node_key,occurred_at,payload')
    .eq('campaign_id', campaignId)
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false });
  if (sinceIso) query = query.gte('occurred_at', sinceIso);
  const { data, error } = await query.limit(50);
  if (error) throw error;
  return data || [];
}

function conditionMet(condition, events) {
  const types = new Set((events || []).map((event) => event.event_type));
  if (condition === 'read' || condition === 'opened') return types.has('read') || types.has('opened');
  if (condition === 'replied') return types.has('replied') || types.has('reply');
  if (condition === 'clicked') return types.has('clicked') || types.has('link_clicked');
  if (condition === 'no_response') return !types.has('read') && !types.has('opened') && !types.has('replied') && !types.has('reply') && !types.has('clicked') && !types.has('link_clicked');
  return false;
}

async function processDripEnrolment(enrolment, now) {
  const workspaceId = stableUuid('workspace', WORKSPACE_LEGACY_ID);
  const result = {
    enrolmentId: enrolment.id,
    actions: [],
    status: enrolment.status,
  };

  const { data: campaign, error: campaignError } = await supabase
    .from('drip_campaigns')
    .select('*')
    .eq('id', enrolment.campaign_id)
    .maybeSingle();
  if (campaignError) throw campaignError;
  if (!campaign || campaign.status !== 'active') {
    result.actions.push('skipped_campaign_not_active');
    return result;
  }

  const [{ data: nodes, error: nodesError }, { data: edges, error: edgesError }, { data: contact, error: contactError }] = await Promise.all([
    supabase.from('drip_nodes').select('*').eq('campaign_id', campaign.id).order('created_at', { ascending: true }),
    supabase.from('drip_edges').select('*').eq('campaign_id', campaign.id).order('created_at', { ascending: true }),
    supabase.from('contacts').select('*').eq('id', enrolment.contact_id).maybeSingle(),
  ]);
  if (nodesError) throw nodesError;
  if (edgesError) throw edgesError;
  if (contactError) throw contactError;
  if (!contact) {
    await updateEnrolmentProgress(enrolment.id, { status: 'exited' });
    return { ...result, status: 'exited', actions: ['exited_missing_contact'] };
  }

  const flow = normalizeFlow(campaign, nodes || [], edges || []);
  if (!flow.nodes?.length) {
    result.actions.push('skipped_empty_flow');
    return result;
  }

  let current =
    flow.nodes.find((node) => node.id === enrolment.current_node_key) ||
    flow.nodes[Number(enrolment.step_index) || 0] ||
    firstFlowNode(flow);
  let guard = 0;

  while (current && guard++ < 20) {
    const kind = current.data?.kind || 'send_whatsapp';
    const basePatch = {
      current_node_key: current.id,
      step_index: flowNodeIndex(flow, current.id),
      context: { ...(enrolment.context || {}), workerLastSeenAt: now.toISOString() },
    };

    if (kind === 'trigger') {
      await insertDripEvent({ campaignId: campaign.id, enrolmentId: enrolment.id, contactId: contact.id, eventType: 'entered_node', nodeKey: current.id });
      const next = nextNode(flow, current);
      if (!next) {
        await updateEnrolmentProgress(enrolment.id, { ...basePatch, status: 'completed' });
        return { ...result, status: 'completed', actions: [...result.actions, 'completed_after_trigger'] };
      }
      current = next;
      continue;
    }

    if (kind === 'send_whatsapp') {
      const rawTemplateId = current.data?.templateId;
      const templateId = entityId('message_template', rawTemplateId);
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();
      if (templateError) throw templateError;

      const message = renderTemplate(template?.body || current.data?.body || `Hi {{contact_name}}, ${current.data?.title || 'thanks for your interest.'}`, {
        contact_name: contact.name,
        client_name: contact.name,
        lead_name: contact.name,
        city: contact.city,
        stage: contact.stage,
      });
      const media = normalizeDripMediaItems(current.data?.media || []);
      const sent = await sendWhatsApp({ to: contact.whatsapp, message, media });
      await writeMessageLog({
        workspace_id: workspaceId,
        recipient: contact.name,
        number: contact.whatsapp,
        type: template?.name || current.data?.title || 'Drip WhatsApp',
        related_module: `Drip: ${campaign.name}`,
        related_record_id: campaign.id,
        provider_message_id: sent.id,
        status: sent.status || 'sent',
        sent_by: 'drip-worker',
        sent_at: new Date().toISOString(),
      });
      await insertDripEvent({
        campaignId: campaign.id,
        enrolmentId: enrolment.id,
        contactId: contact.id,
        eventType: 'message_sent',
        nodeKey: current.id,
        payload: { provider: sent.provider, providerMessageId: sent.id, templateId: template?.id || rawTemplateId, media, mediaResults: sent.media || [] },
      });
      result.actions.push(`sent_whatsapp:${current.id}`);
      const next = nextNode(flow, current);
      if (!next) {
        await updateEnrolmentProgress(enrolment.id, { ...basePatch, status: 'completed', last_node_key: current.id, next_run_at: null });
        return { ...result, status: 'completed' };
      }
      current = next;
      continue;
    }

    if (kind === 'wait') {
      const next = nextNode(flow, current);
      const dueAt = addMinutes(now, current.data?.mins || 0);
      await insertDripEvent({ campaignId: campaign.id, enrolmentId: enrolment.id, contactId: contact.id, eventType: 'wait_started', nodeKey: current.id, payload: { mins: current.data?.mins || 0, dueAt } });
      await updateEnrolmentProgress(enrolment.id, {
        ...basePatch,
        current_node_key: next?.id || current.id,
        step_index: next ? flowNodeIndex(flow, next.id) : flowNodeIndex(flow, current.id),
        last_node_key: current.id,
        next_run_at: dueAt,
      });
      result.actions.push(`wait_until:${dueAt}`);
      return result;
    }

    if (kind === 'condition') {
      const hours = Number(current.data?.withinHours || 24);
      const sinceIso = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
      const events = await recentDripEvents({ campaignId: campaign.id, contactId: contact.id, sinceIso });
      const yes = conditionMet(current.data?.condition || 'clicked', events);
      await insertDripEvent({ campaignId: campaign.id, enrolmentId: enrolment.id, contactId: contact.id, eventType: yes ? 'condition_yes' : 'condition_no', nodeKey: current.id, payload: { condition: current.data?.condition || 'clicked', withinHours: hours } });
      result.actions.push(`${yes ? 'condition_yes' : 'condition_no'}:${current.id}`);
      const next = nextNode(flow, current, yes ? 'yes' : 'no');
      if (!next) {
        await updateEnrolmentProgress(enrolment.id, { ...basePatch, status: 'completed', last_node_key: current.id, next_run_at: null });
        return { ...result, status: 'completed' };
      }
      current = next;
      continue;
    }

    if (kind === 'goal') {
      await insertDripEvent({
        campaignId: campaign.id,
        enrolmentId: enrolment.id,
        contactId: contact.id,
        eventType: 'goal_reached',
        nodeKey: current.id,
        payload: {
          goalType: current.data?.goalType || 'custom_event',
          conversionName: current.data?.conversionName || current.data?.title || 'Campaign goal reached',
        },
      });
      await updateEnrolmentProgress(enrolment.id, {
        ...basePatch,
        status: 'completed',
        last_node_key: current.id,
        next_run_at: null,
        context: { ...(basePatch.context || {}), goalReachedAt: now.toISOString(), goalType: current.data?.goalType || 'custom_event' },
      });
      return { ...result, status: 'completed', actions: [...result.actions, `goal_reached:${current.id}`] };
    }

    if (kind === 'update_stage') {
      const toStage = current.data?.toStage;
      if (toStage) {
        const { error: updateContactError } = await supabase
          .from('contacts')
          .update({ stage: toStage, updated_at: new Date().toISOString() })
          .eq('id', contact.id);
        if (updateContactError) throw updateContactError;
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          contact_id: contact.id,
          type: 'note',
          note: `Drip "${campaign.name}" moved contact to ${toStage}`,
          at: new Date().toISOString().slice(0, 10),
        });
      }
      await insertDripEvent({ campaignId: campaign.id, enrolmentId: enrolment.id, contactId: contact.id, eventType: 'stage_updated', nodeKey: current.id, payload: { toStage } });
      result.actions.push(`stage_updated:${toStage || 'none'}`);
      const next = nextNode(flow, current);
      if (!next) break;
      current = next;
      continue;
    }

    if (kind === 'create_task') {
      const taskTitle = current.data?.taskTitle || current.data?.title || `Follow up with ${contact.name}`;
      const { error: taskError } = await supabase.from('tasks').insert({
        workspace_id: workspaceId,
        title: taskTitle,
        description: `Created by drip campaign "${campaign.name}" for ${contact.name}.`,
        type: 'CRM Follow-up',
        status: 'not-started',
        priority: 'med',
        due: addMinutes(now, 24 * 60),
        channels: { whatsapp: false, email: false, inApp: true },
        tags: ['drip', 'crm'],
      });
      if (taskError) throw taskError;
      await insertDripEvent({ campaignId: campaign.id, enrolmentId: enrolment.id, contactId: contact.id, eventType: 'task_created', nodeKey: current.id, payload: { title: taskTitle } });
      result.actions.push(`task_created:${taskTitle}`);
      const next = nextNode(flow, current);
      if (!next) break;
      current = next;
      continue;
    }

    if (kind === 'exit') {
      await insertDripEvent({ campaignId: campaign.id, enrolmentId: enrolment.id, contactId: contact.id, eventType: 'exited', nodeKey: current.id });
      await updateEnrolmentProgress(enrolment.id, {
        ...basePatch,
        status: 'completed',
        last_node_key: current.id,
        next_run_at: null,
      });
      return { ...result, status: 'completed', actions: [...result.actions, 'completed'] };
    }

    const next = nextNode(flow, current);
    if (!next) break;
    current = next;
  }

  if (current) {
    await updateEnrolmentProgress(enrolment.id, {
      current_node_key: current.id,
      step_index: flowNodeIndex(flow, current.id),
      next_run_at: null,
      context: { ...(enrolment.context || {}), workerLastSeenAt: now.toISOString() },
    });
  }
  return result;
}

async function runDripWorker({ limit = 25 } = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  const now = new Date();
  const { data: enrolments, error } = await supabase
    .from('drip_enrolments')
    .select('*')
    .eq('status', 'active')
    .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`)
    .order('next_run_at', { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;

  const processed = [];
  for (const enrolment of enrolments || []) {
    try {
      processed.push(await processDripEnrolment(enrolment, now));
    } catch (error) {
      processed.push({ enrolmentId: enrolment.id, ok: false, error: error.message });
    }
  }
  return { ok: true, ranAt: now.toISOString(), due: enrolments?.length || 0, processed };
}

app.post('/drip-worker/run', async (req, res) => {
  try {
    const limit = Number(req.body?.limit || 25);
    res.json(await runDripWorker({ limit }));
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/drip-worker/test-enrolment', async (req, res) => {
  try {
    if (!supabase) throw new Error('Supabase is not configured');
    const campaignId = entityId('drip_campaign', req.body?.campaignId || req.body?.campaign_id);
    const contactId = entityId('contact', req.body?.contactId || req.body?.contact_id);
    if (!campaignId || !contactId) return res.status(400).json({ ok: false, error: 'campaignId and contactId are required' });
    const now = new Date().toISOString();
    const base = {
      id: stableUuid('drip_enrolment', `${campaignId}:${contactId}:test:${Date.now()}`),
      workspace_id: stableUuid('workspace', WORKSPACE_LEGACY_ID),
      campaign_id: campaignId,
      contact_id: contactId,
      step_index: 0,
      status: 'active',
      last_opened: false,
      last_clicked: false,
      enrolled_at: now.slice(0, 10),
      next_run_at: req.body?.nextRunAt || now,
      current_node_key: null,
      last_node_key: null,
      context: {
        mode: 'test',
        createdBy: 'orbit-drip-test-runner',
        createdAt: now,
      },
    };
    let insert = await supabase.from('drip_enrolments').insert(base).select('*').single();
    if (insert.error && /current_node_key|last_node_key|context/i.test(insert.error.message || '')) {
      const { current_node_key, last_node_key, context, ...legacyBase } = base;
      insert = await supabase.from('drip_enrolments').insert(legacyBase).select('*').single();
    }
    if (insert.error) throw insert.error;
    res.json({ ok: true, enrolment: insert.data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/scheduler/run-once', async (req, res) => {
  try {
    const limit = Number(req.body?.limit || 25);
    const drip = await runDripWorker({ limit });
    res.json({ ok: true, drip });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(port, host, () => {
  console.log(`Orbit API listening on http://${host}:${port}`);
});
