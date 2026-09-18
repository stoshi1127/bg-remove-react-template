'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandIcon from '@/components/BrandIcon';
import { trackAnalyticsEvent } from '@/lib/analytics/events';
import { grantOfferwallAccess, readRefinementDraft } from '@/lib/refinement/draftStorage';

export default function RefinementAccessClient({ draftId }: { draftId: string }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'missing'>('checking');

  useEffect(() => {
    let active = true;
    readRefinementDraft(draftId)
      .then(draft => {
        if (!active) return;
        setStatus(draft ? 'ready' : 'missing');
        trackAnalyticsEvent('refinement_access_page_view', {
          draft_available: !!draft,
          access_method: 'adsense_offerwall',
        });
      })
      .catch(() => {
        if (active) setStatus('missing');
      });
    return () => { active = false; };
  }, [draftId]);

  const continueToEditor = () => {
    if (!grantOfferwallAccess(window.sessionStorage, draftId)) {
      setStatus('missing');
      return;
    }
    trackAnalyticsEvent('refinement_access_continue', {
      access_method: 'adsense_offerwall',
    });
    window.location.assign(`/?refineDraft=${encodeURIComponent(draftId)}`);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <BrandIcon size={44} roundedClassName="rounded-xl" />
          <div>
            <p className="text-sm font-semibold text-blue-600">イージーカット</p>
            <h1 className="text-2xl font-black text-slate-900">画像の仕上げ修正</h1>
          </div>
        </div>

        {status === 'checking' && (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-600" role="status">
            編集画像を確認しています…
          </div>
        )}

        {status === 'ready' && (
          <>
            <p className="leading-7 text-slate-600">
              広告が閉じたあと、下のボタンから保存していた画像の仕上げ修正を開始できます。
            </p>
            <button
              type="button"
              onClick={continueToEditor}
              className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-4 text-base font-bold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              この画像を仕上げ修正する
            </button>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              広告が表示されない場合も、そのまま修正を開始できます。
            </p>
          </>
        )}

        {status === 'missing' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold text-amber-900">編集画像を復元できませんでした</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              一時保存の有効期限が切れたか、ブラウザのデータが削除された可能性があります。元の画面からもう一度お試しください。
            </p>
            <Link href="/" className="mt-5 inline-flex font-bold text-blue-700 hover:underline">
              イージーカットへ戻る
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
