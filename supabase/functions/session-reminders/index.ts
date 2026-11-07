// Supabase Edge Function: session-reminders
// Deploy with --no-verify-jwt; x-reminder-secret is required on every invocation.
// Service-role client: DO NOT call this from Web/Expo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CRON_SECRET = Deno.env.get('SESSION_REMINDER_CRON_SECRET') || '';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || '';
const REMINDER_FROM_EMAIL = Deno.env.get('REMINDER_FROM_EMAIL') || '';
const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const phDateTime = (s: { scheduled_date: string; scheduled_time: string }) =>
  `${s.scheduled_date} ${s.scheduled_time} (Philippine Time)`;

function isScheduledSoon(s: { scheduled_date: string; scheduled_time: string }, nowMs: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.scheduled_date) || !/^\d{2}:\d{2}$/.test(s.scheduled_time)) return false;
  const date = new Date(`${s.scheduled_date}T${s.scheduled_time}:00+08:00`);
  const delta = date.getTime() - nowMs;
  // 50-60 min ahead: accommodates a 5-minute cron cadence and minor delays.
  return Number.isFinite(delta) && delta > 50 * 60000 && delta <= 60 * 60000;
}

const uniqueEmailKey = (s: any, userId: string) =>
  `${s.id}:${userId}:${s.scheduled_date}:${s.scheduled_time}:email`;

async function sendEmailFor(s: any, userId: string, title: string) {
  if (!RESEND_KEY || !REMINDER_FROM_EMAIL) return 'email_not_configured';
  const { data: userData, error: userError } = await client.auth.admin.getUserById(userId);
  if (userError || !userData?.user?.email) return 'email_address_missing';
  const to = userData.user.email;
  const { data: existing, error: queryError } = await client.from('session_reminder_deliveries')
    .select('id,status,updated_at,attempts').eq('session_id',s.id).eq('recipient_id',userId)
    .eq('scheduled_date',s.scheduled_date).eq('scheduled_time',s.scheduled_time)
    .eq('channel','email').maybeSingle();
  if (queryError) throw queryError;
  if (existing?.status === 'sent') return 'already_sent';
  // Do not duplicate on a concurrent run; a crashed processing entry can be retried after 15 min,
  // but then it falls outside the reminder window and must be handled manually.
  if (existing?.status === 'processing') return 'in_progress';
  let deliveryId: number;
  if (existing?.status === 'failed') {
    const { data: claim, error: claimError } = await client.from('session_reminder_deliveries')
      .update({status:'processing',attempts:(existing.attempts||1)+1,updated_at:new Date().toISOString(),last_error:null})
      .eq('id', existing.id).eq('status','failed').select('id').maybeSingle();
    if (claimError) throw claimError;
    if (!claim) return 'claimed_elsewhere';
    deliveryId = claim.id;
  } else {
    const { data: claim, error: claimError } = await client.from('session_reminder_deliveries')
      .insert({session_id:s.id,recipient_id:userId,scheduled_date:s.scheduled_date,scheduled_time:s.scheduled_time,
        channel:'email',status:'processing'}).select('id').maybeSingle();
    if (claimError?.code === '23505') return 'claimed_elsewhere';
    if (claimError || !claim) throw claimError || new Error('Email claim failed');
    deliveryId=claim.id;
  }
  const body = `Hello,\n\nYour SkillCredit session, "${title}", will start in approximately one hour. Please be ready.\n\nScheduled date and time: ${phDateTime(s)}\n\nOpen SkillCredit manually and find your session under My Sessions.\n\nThank you,\nSkillCredit Team`;
  try {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${RESEND_KEY}`,'Content-Type':'application/json',
        'Idempotency-Key':uniqueEmailKey(s,userId)},
      body:JSON.stringify({from:REMINDER_FROM_EMAIL,to:[to],subject:'SkillCredit: Your session starts in about 1 hour',text:body})
    });
    const result=await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(`Email provider returned ${response.status}: ${String(result?.message||'unknown').slice(0,120)}`);
    const { error } = await client.from('session_reminder_deliveries').update({status:'sent',last_error:null,updated_at:new Date().toISOString()}).eq('id',deliveryId);
    if(error) throw error;
    return 'sent';
  } catch(e) {
    await client.from('session_reminder_deliveries').update({status:'failed',last_error:String(e).slice(0,200),updated_at:new Date().toISOString()}).eq('id',deliveryId);
    return 'failed';
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed',{status:405});
  if (!CRON_SECRET || req.headers.get('x-reminder-secret') !== CRON_SECRET) return new Response('Forbidden',{status:403});
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return new Response('Not configured',{status:503});
  try {
    const now=Date.now();
    // Query upcoming sessions only. Filter client-side on PH time to avoid casting unsafe text columns.
    // Past sessions will not qualify. Pagination avoids Supabase default 1,000-row limits.
    let offset=0, scanned=0, matched=0, notices=0, emails=0, failedEmails=0;
    while (true) {
      const {data,error}=await client.from('sessions')
        .select('id,student_id,instructor_id,skill_id,scheduled_date,scheduled_time,skill:skills(title)')
        .eq('status','upcoming').order('id',{ascending:true}).range(offset,offset+499);
      if(error) throw error;
      if (!data?.length) break;
      scanned+=data.length;
      for (const s of data) {
        if (!isScheduledSoon(s,now)) continue;
        matched++;
        const title=s.skill?.title || 'your scheduled skill';
        for (const userId of new Set([s.student_id,s.instructor_id].filter(Boolean))) {
          const {data:inserted,error:rpcError}=await client.rpc('create_session_one_hour_notice',{
            p_session_id:s.id,p_recipient_id:userId,p_scheduled_date:s.scheduled_date,p_scheduled_time:s.scheduled_time
          });
          if(rpcError) { console.error('In-app reminder failed',s.id,rpcError.message); continue; }
          if(inserted) notices++;
          const r=await sendEmailFor(s,userId,title);
          if(r==='sent') emails++;
          if(r==='failed') failedEmails++;
        }
      }
      if (data.length < 500) break;
      offset+=500;
    }
    return Response.json({ok:true,scanned,matched,inAppCreated:notices,emailSent:emails,emailFailed:failedEmails,
      emailConfigured:Boolean(RESEND_KEY&&REMINDER_FROM_EMAIL)});
  } catch(e) {
    console.error('Session reminder scheduler:',e);
    return Response.json({ok:false,error:'Reminder run failed; inspect Edge Function logs'}, {status:500});
  }
});
