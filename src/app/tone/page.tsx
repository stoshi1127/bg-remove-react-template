/**
 * EasyTone - 画像トーン調整ページ
 * https://bg.quicktools.jp/tone
 */

import { Metadata } from 'next';
import EasyToneApp from '../../components/tone/EasyToneApp';

export const metadata: Metadata = {
  title: 'イージートーン - かんたん色調整（色調補正） | QuickTools',
  description: '3ステップで写真の色味を整えます。複数の写真を一括処理できる無料のオンライン画像編集ツール。商品写真、SNS投稿、ブログ記事に最適。色調整（色調補正）に対応。',
  keywords: [
    '画像処理', 'フィルター', 'トーン調整', '写真編集', '画像フィルター', '色調整', '色調補正', '色味',
    '一括処理', '商品写真', 'SNS', 'ブログ', '無料', 'オンライン',
    'QuickTools', 'イージートーン', '画像編集', '写真加工'
  ],
  openGraph: {
    title: 'イージートーン - かんたん色調整（色調補正） | QuickTools',
    description: '3ステップで写真の色味を整えます。複数の写真を一括処理できる無料のオンライン画像編集ツール。',
    type: 'website',
    locale: 'ja_JP',
    url: 'https://bg.quicktools.jp/tone',
    siteName: 'QuickTools',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@QuickTools',
    creator: '@QuickTools',
    title: 'イージートーン - かんたん色調整（色調補正） | QuickTools',
    description: '3ステップで写真の色味を整えます。複数の写真を一括処理できる無料のオンライン画像編集ツール。',
  },
};

export default function TonePage() {
  return <EasyToneApp />;
}