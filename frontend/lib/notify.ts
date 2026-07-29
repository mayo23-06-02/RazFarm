// SMS dispatch stub for announcements ("Also send SMS" toggle).
//
// TODO(Edge Function): replace this with a call to a Supabase Edge Function
// (e.g. `supabase/functions/send-announcement-sms`) that fans the announcement
// out to an SMS gateway (MTN/Eswatini Mobile aggregator) for every member with
// a phone number in scope of the announcement's audience. That function should
// own rate limiting, delivery-status webhooks, and cost tracking — none of
// which exist yet. For now this only logs so the UI flow can be built and
// tested end-to-end without a live gateway.
export async function dispatchAnnouncementSms(params: {
  tenantId: string;
  announcementId: string;
  recipientCount: number;
}) {
  console.info("[notify] SMS dispatch stub — would send to", params.recipientCount, "recipients", params);
  return { queued: params.recipientCount };
}

export const SMS_COST_PER_MEMBER = 0.3;

export function estimateSmsCost(recipientCount: number) {
  return recipientCount * SMS_COST_PER_MEMBER;
}
