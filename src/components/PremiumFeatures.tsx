import React from 'react';

const FEATURES = [
    {
        icon: 'auto_fix_high',
        title: 'AI背景合成',
        description: '被写体を認識し、シチュエーションに合わせた背景をAIが自動生成。違和感のない合成が可能です。',
    },
    {
        icon: 'high_quality',
        title: 'AI超解像度復元',
        description: 'ぼやけた画像や低解像度の写真も、AIが細部を補完して最大25MBの超高解像度へ復元します。',
    },
    {
        icon: 'cleaning_services',
        title: 'AI消しゴム',
        description: '不要な映り込みをなぞるだけで、周りの風景に馴染ませながら魔法のように消去します。',
        isComingSoon: true,
    },
];

export default function PremiumFeatures() {
    return (
        <div id="premium-features" className="mt-16 md:mt-24 w-full scroll-mt-24">
            <h3 className="text-xl md:text-2xl font-bold text-center mb-10 md:mb-12 text-slate-900 dark:text-white">
                Proプラン限定：プレミアムAI機能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {FEATURES.map((feature, index) => (
                    <div
                        key={index}
                        className={`bg-white/50 dark:bg-slate-900/50 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden ${feature.isComingSoon ? 'opacity-50' : ''}`}
                    >
                        {feature.isComingSoon && (
                            <div className="absolute top-3 right-[-35px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold py-1 px-10 rotate-45 shadow-sm">
                                準備中
                            </div>
                        )}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/30 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-pro-orange text-xl" style={{ fontVariationSettings: "'FILL' 0" }}>
                                    {feature.icon}
                                </span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base md:text-lg">{feature.title}</h4>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                            {feature.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
