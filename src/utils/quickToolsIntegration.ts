/**
 * QuickToolsサービス間連携ユーティリティ
 * 他のQuickToolsサービスとの統合機能を提供
 */

export interface QuickToolsService {
    id: string;
    name: string;
    description: string;
    url: string;
    icon: string;
    category: 'image' | 'utility' | 'converter';
    isActive: boolean;
}

export const QUICKTOOLS_SERVICES: QuickToolsService[] = [
    {
        id: 'bg-remove',
        name: 'イージーカット',
        description: '背景除去ツール',
        url: 'https://bg.quicktools.jp/',
        icon: '🖼️',
        category: 'image',
        isActive: true,
    },
    {
        id: 'tone',
        name: 'イージートーン',
        description: 'かんたん色調整（色調補正）ツール',
        url: 'https://bg.quicktools.jp/tone',
        icon: '🎨',
        category: 'image',
        isActive: true,
    },
    {
        id: 'trim',
        name: 'イージートリミング',
        description: '画像トリミングツール',
        url: 'https://bg.quicktools.jp/trim',
        icon: '✂️',
        category: 'image',
        isActive: true,
    },
    {
        id: 'resize',
        name: 'Image Resize',
        description: '画像リサイズツール',
        url: 'https://quicktools.app/resize',
        icon: '📏',
        category: 'image',
        isActive: false, // 未実装のため無効
    },
    {
        id: 'convert',
        name: 'Format Convert',
        description: '形式変換ツール',
        url: 'https://quicktools.app/convert',
        icon: '🔄',
        category: 'converter',
        isActive: false, // 未実装のため無効
    },
];

/**
 * 現在のサービス以外のサービス一覧を取得
 */
export function getOtherServices(currentServiceId: string): QuickToolsService[] {
    return QUICKTOOLS_SERVICES.filter(
        service => service.id !== currentServiceId && service.isActive
    );
}

/**
 * カテゴリ別にサービスを取得
 */
export function getServicesByCategory(category: QuickToolsService['category']): QuickToolsService[] {
    return QUICKTOOLS_SERVICES.filter(
        service => service.category === category && service.isActive
    );
}

/**
 * サービス間の推奨ワークフローを取得
 */
export function getRecommendedWorkflow(currentServiceId: string): QuickToolsService[] {
    const workflows: Record<string, string[]> = {
        'bg-remove': ['tone', 'resize', 'compress'], // 背景除去後はトーン調整、リサイズ、圧縮が推奨
        'tone': ['bg-remove', 'resize', 'compress'], // トーン調整後は背景除去、リサイズ、圧縮が推奨
        'resize': ['tone', 'compress'], // リサイズ後はトーン調整、圧縮が推奨
        'compress': ['tone', 'resize'], // 圧縮後はトーン調整、リサイズが推奨
        'convert': ['tone', 'bg-remove', 'resize'], // 変換後は画像処理系が推奨
    };

    const recommendedIds = workflows[currentServiceId] || [];
    return recommendedIds
        .map(id => QUICKTOOLS_SERVICES.find(service => service.id === id))
        .filter((service): service is QuickToolsService => service !== undefined && service.isActive);
}

/**
 * サービス間でのデータ共有用のURL生成
 */
export function generateServiceUrl(serviceId: string, params?: Record<string, string>): string {
    const service = QUICKTOOLS_SERVICES.find(s => s.id === serviceId);
    if (!service) {
        throw new Error(`Service not found: ${serviceId}`);
    }

    const url = new URL(service.url);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }

    return url.toString();
}

/**
 * QuickToolsブランドの統一設定
 */
export const QUICKTOOLS_BRAND = {
    name: 'QuickTools',
    tagline: '画像処理を簡単に。プロ品質の結果を、誰でも使えるシンプルなツールで。',
    homeUrl: 'https://bg.quicktools.jp',
    colors: {
        primary: '#3b82f6',
        primaryDark: '#1d4ed8',
        secondary: '#64748b',
        accent: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
    },
    social: {
        twitter: 'https://twitter.com/quicktoolsapp',
        github: 'https://github.com/quicktools-app',
    },
    support: {
        help: 'https://bg.quicktools.jp/help',
        contact: 'https://bg.quicktools.jp/contact',
        privacy: 'https://bg.quicktools.jp/privacy-policy',
        terms: 'https://bg.quicktools.jp/terms',
    },
} as const;

/**
 * 他のサービスへの遷移時のトラッキング
 */
export function trackServiceNavigation(fromService: string, toService: string): void {
    // Analytics tracking would go here
    if (typeof window !== 'undefined' && 'gtag' in window) {
        const gtag = (window as { gtag: (...args: unknown[]) => void }).gtag;
        gtag('event', 'service_navigation', {
            event_category: 'QuickTools',
            event_label: `${fromService} -> ${toService}`,
            value: 1,
        });
    }
}

/**
 * サービス間でのユーザー設定共有
 */
export function shareUserPreferences(preferences: Record<string, unknown>): void {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('quicktools_preferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save user preferences:', error);
        }
    }
}

/**
 * 共有されたユーザー設定の取得
 */
export function getSharedUserPreferences(): Record<string, unknown> | null {
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('quicktools_preferences');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
            return null;
        }
    }
    return null;
}

/**
 * 他のサービスとの画像データ共有
 */
export function shareImageWithService(
    serviceId: string,
    imageData: { url: string; name: string; metadata?: unknown }
): string {
    const service = QUICKTOOLS_SERVICES.find(s => s.id === serviceId);
    if (!service) {
        throw new Error(`Service not found: ${serviceId}`);
    }

    // 画像データを一時的にlocalStorageに保存
    const shareKey = `quicktools_shared_${Date.now()}`;
    try {
        localStorage.setItem(shareKey, JSON.stringify({
            fromService: 'bg-remove',
            imageData,
            timestamp: Date.now(),
        }));
    } catch (error) {
        console.warn('Failed to share image data:', error);
    }

    // 共有キーをパラメータとして含むURLを生成
    return generateServiceUrl(serviceId, { shared: shareKey });
}

/**
 * 他のサービスから共有された画像データを取得
 */
export function getSharedImageData(shareKey: string): Record<string, unknown> | null {
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem(`quicktools_shared_${shareKey}`);
            if (stored) {
                const data = JSON.parse(stored);
                // 1時間以上古いデータは削除
                if (Date.now() - data.timestamp > 3600000) {
                    localStorage.removeItem(`quicktools_shared_${shareKey}`);
                    return null;
                }
                return data;
            }
        } catch (error) {
            console.warn('Failed to load shared image data:', error);
        }
    }
    return null;
}

/**
 * QuickToolsサービス間の統合状態を確認
 */
export function checkServiceIntegration(): {
    isIntegrated: boolean;
    availableServices: QuickToolsService[];
    errors: string[];
} {
    const errors: string[] = [];
    const availableServices: QuickToolsService[] = [];

    // 各サービスの可用性をチェック
    QUICKTOOLS_SERVICES.forEach(service => {
        if (service.isActive) {
            availableServices.push(service);
        }
    });

    // ローカルストレージの可用性をチェック
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('quicktools_test', 'test');
            localStorage.removeItem('quicktools_test');
        } catch {
            errors.push('LocalStorage not available for cross-service integration');
        }
    }

    return {
        isIntegrated: errors.length === 0,
        availableServices,
        errors,
    };
}