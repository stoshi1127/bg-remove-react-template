'use client';

import { useState } from 'react';
import BeforeAfterSlider from './BeforeAfterSlider';

type ComparisonExample = {
  title: string;
  description: string;
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  beforeLabel: string;
  afterLabel: string;
  isPro?: boolean;
};

type ComparisonShowcaseProps = {
  examples: readonly ComparisonExample[];
};

export default function ComparisonShowcase({ examples }: ComparisonShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeExample = examples[activeIndex];

  return (
    <section className="animate-fade-in-up mb-10 sm:mb-12 md:mb-14" style={{ animationDelay: '0.16s' }}>
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-soft backdrop-blur-sm sm:p-7 md:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Before / After</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            背景透過・背景合成の仕上がり例
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            タブを切り替えて、元画像から背景透過・背景合成の変化を確認できます。
          </p>
        </div>

        <div className="mb-5 flex flex-wrap justify-center gap-3">
          {examples.map((example, index) => {
            const isActive = activeIndex === index;

            return (
              <button
                key={example.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition sm:text-base ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700'
                }`}
                aria-pressed={isActive}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{example.title}</span>
                  {example.isPro ? (
                    <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-400 px-2 py-0.5 rounded-full text-white shadow-sm">
                      PRO
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <BeforeAfterSlider
          title={activeExample.title}
          description={activeExample.description}
          beforeSrc={activeExample.beforeSrc}
          afterSrc={activeExample.afterSrc}
          beforeAlt={activeExample.beforeAlt}
          afterAlt={activeExample.afterAlt}
          beforeLabel={activeExample.beforeLabel}
          afterLabel={activeExample.afterLabel}
          isPro={activeExample.isPro}
        />
      </div>
    </section>
  );
}
