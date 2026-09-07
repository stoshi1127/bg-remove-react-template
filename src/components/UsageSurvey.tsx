'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackAnalyticsEvent } from '../lib/analytics/events';

export const SURVEY_KEY = 'quicktools:usage-survey:v1';
export const SURVEY_COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const OPTIONS = [
  ['work_presentation', '仕事の資料・プレゼン'],
  ['design_marketing', 'Web・広告・チラシなどの制作'],
  ['ecommerce', '商品出品・ネットショップ'],
  ['personal', '個人のSNS・趣味'],
  ['other', 'その他'],
] as const;
type Context = { user_plan: 'guest' | 'free' | 'pro'; processing_mode: string; image_count: number };
type Placement = 'processing' | 'result';
type Status = 'hidden' | 'question' | 'answered';
type RecordState = { answered: boolean; lastShownAt: number };

export function readSurveyState(): RecordState {
  try {
    const data = JSON.parse(localStorage.getItem(SURVEY_KEY) || 'null');
    if (data && typeof data.answered === 'boolean' && Number.isFinite(data.lastShownAt) && data.lastShownAt >= 0) return data;
  } catch { /* Storage may be unavailable or contain invalid data. */ }
  return { answered: false, lastShownAt: 0 };
}

export function useUsageSurvey() {
  const [status, setStatus] = useState<Status>('hidden');
  const statusRef = useRef<Status>('hidden');
  const context = useRef<Context | null>(null);
  const memory = useRef<RecordState | null>(null);
  const viewed = useRef(false);

  const changeStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);
  const persist = useCallback((record: RecordState) => {
    memory.current = record;
    try { localStorage.setItem(SURVEY_KEY, JSON.stringify(record)); } catch { /* Page-local fallback. */ }
  }, []);
  const track = useCallback((name: string, placement: Placement, purpose?: string) => {
    try {
      trackAnalyticsEvent(name, { survey_version: 'v1', placement, ...context.current, ...(purpose ? { purpose } : {}) });
    } catch { /* Analytics must never interrupt editing or survey completion. */ }
  }, []);
  const begin = useCallback((next: Context) => {
    changeStatus('hidden');
    const stored = readSurveyState();
    const record = memory.current;
    const answered = stored.answered || record?.answered;
    const lastShownAt = Math.max(stored.lastShownAt, record?.lastShownAt || 0);
    if (answered || (lastShownAt > 0 && Date.now() - lastShownAt < SURVEY_COOLDOWN)) return;
    context.current = next;
    viewed.current = false;
    changeStatus('question');
  }, [changeStatus]);
  const shown = useCallback((placement: Placement) => {
    if (viewed.current || statusRef.current !== 'question') return;
    viewed.current = true;
    persist({ answered: false, lastShownAt: Date.now() });
    track('usage_survey_view', placement);
  }, [persist, track]);
  const answer = useCallback((purpose: string, placement: Placement) => {
    if (statusRef.current !== 'question') return;
    shown(placement);
    changeStatus('answered');
    persist({ answered: true, lastShownAt: memory.current?.lastShownAt || Date.now() });
    track('usage_survey_answer', placement, purpose);
  }, [changeStatus, persist, shown, track]);
  const dismiss = useCallback((placement: Placement) => {
    if (statusRef.current !== 'question') return;
    shown(placement);
    changeStatus('hidden');
    track('usage_survey_dismiss', placement);
  }, [changeStatus, shown, track]);
  const finish = useCallback((hasSuccess: boolean) => {
    if (!hasSuccess) changeStatus('hidden');
  }, [changeStatus]);
  return { status, begin, shown, answer, dismiss, finish };
}

export default function UsageSurvey({ survey, placement }: {
  survey: ReturnType<typeof useUsageSurvey>; placement: Placement;
}) {
  const { status, shown } = survey;
  useEffect(() => { if (status === 'question') shown(placement); }, [status, shown, placement]);
  if (status === 'hidden') return null;
  return (
    <section aria-label="利用用途アンケート" className="w-full rounded-xl border border-blue-100 bg-blue-50/60 p-4 my-3">
      {status === 'answered' ? <p role="status" className="text-sm text-slate-700">ご協力ありがとうございます</p> : <>
        <h3 className="text-sm font-bold text-slate-900">この画像は、主に何に使いますか？</h3>
        <p className="mt-1 text-xs text-slate-600">今後の機能改善の参考にさせてください。回答は任意です。</p>
        <div className="mt-3 grid gap-2">
          {OPTIONS.map(([code, label]) => <button key={code} type="button" onClick={() => survey.answer(code, placement)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">{label}</button>)}
        </div>
        <button type="button" onClick={() => survey.dismiss(placement)} className="mt-2 min-h-10 px-2 text-sm text-slate-600 underline">回答しない</button>
      </>}
    </section>
  );
}
