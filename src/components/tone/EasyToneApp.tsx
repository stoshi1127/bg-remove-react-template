/**
 * EasyToneメインアプリケーションコンポーネント
 */

'use client';

import React, { useState } from 'react';
import ImageUploader from './ImageUploader';
import PresetSelector from './PresetSelector';
import ResultViewer from './ResultViewer';
import { ProcessableImage, ProcessedImage, FilterPreset } from '../../types/tone';
import { getRecommendedWorkflow } from '../../utils/quickToolsIntegration';
import Link from 'next/link';

const EasyToneApp: React.FC = () => {
  const [images, setImages] = useState<ProcessableImage[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const handleImagesUploaded = (newImages: ProcessableImage[]) => {
    setImages(newImages);
    setProcessedImages([]); // 新しい画像がアップロードされたら結果をクリア
  };

  const handlePresetSelected = (preset: FilterPreset) => {
    setSelectedPreset(preset);
  };

  const handleProcessingComplete = (results: ProcessedImage[]) => {
    setProcessedImages(results);
    setProcessingError(null);
    setIsTransitioning(true);
    
    // 処理完了アニメーションとフィードバック
    setTimeout(() => {
      setIsProcessing(false);
      setIsTransitioning(false);
      
      // 結果表示エリアへの自動遷移
      setTimeout(() => {
        const resultElement = document.getElementById('result-section');
        if (resultElement) {
          resultElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          
          // 成功フィードバックの表示
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up';
          successMessage.innerHTML = `
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
              <span>${results.length}枚の画像処理が完了しました！</span>
            </div>
          `;
          document.body.appendChild(successMessage);
          
          // 3秒後にメッセージを削除
          setTimeout(() => {
            if (successMessage.parentNode) {
              successMessage.parentNode.removeChild(successMessage);
            }
          }, 3000);
        }
      }, 300);
    }, 800);
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
    setIsTransitioning(false);
    setProcessingError(null);
    setProcessedImages([]); // 処理開始時に前の結果をクリア
  };

  const handleProcessingError = (error: string) => {
    setIsProcessing(false);
    setIsTransitioning(false);
    setProcessingError(error);
    
    // エラーフィードバックの表示
    const errorMessage = document.createElement('div');
    errorMessage.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up';
    errorMessage.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <span>処理中にエラーが発生しました</span>
      </div>
    `;
    document.body.appendChild(errorMessage);
    
    // 5秒後にメッセージを削除
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 5000);
  };

  const recommendedServices = getRecommendedWorkflow('tone');

  return (
    <>
      {/* ヒーローセクション */}
      <section className="bg-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          {/* メインタイトル */}
          <div className="animate-fade-in-up mb-8">
            <h1 className="text-responsive-xl font-bold text-gray-900 mb-6">
              イージートーン
            </h1>
            <p className="text-responsive-md text-gray-600 mb-6 leading-relaxed max-w-2xl mx-auto">
              2ステップで簡単に画像にプロのようなトーンを適用。複数の写真を一括処理できる無料のオンライン画像編集ツール。商品写真、SNS投稿、ブログ記事に最適。
            </p>
          </div>

          {/* CTAセクション */}
          <div className="animate-fade-in-up mb-8" style={{animationDelay: '0.2s'}}>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <div className="flex flex-wrap justify-center gap-3">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  完全無料
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path>
                  </svg>
                  高速処理
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                  安全・安心
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
                  </svg>
                  複数画像対応
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="bg-white">
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* ワークフロー進行状況 */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">画像アップロード</span>
                </div>
                <div className={`w-12 h-0.5 transition-colors duration-500 ${images.length > 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className="flex items-center">
                  <div className={`w-8 h-8 transition-all duration-500 ${
                    isProcessing || isTransitioning 
                      ? 'bg-yellow-500 text-white animate-pulse' 
                      : images.length > 0 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-300 text-gray-500'
                  } rounded-full flex items-center justify-center font-bold text-sm`}>
                    {isProcessing || isTransitioning ? '⏳' : '2'}
                  </div>
                  <span className={`ml-2 text-sm font-medium transition-colors duration-300 ${
                    isProcessing || isTransitioning 
                      ? 'text-yellow-600' 
                      : images.length > 0 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                  }`}>
                    {isProcessing ? '処理中...' : isTransitioning ? '完了中...' : 'フィルター選択・処理'}
                  </span>
                </div>
                <div className={`w-12 h-0.5 transition-all duration-700 ${
                  processedImages.length > 0 
                    ? 'bg-green-600' 
                    : isTransitioning 
                      ? 'bg-yellow-400 animate-pulse' 
                      : 'bg-gray-300'
                }`}></div>
                <div className="flex items-center">
                  <div className={`w-8 h-8 transition-all duration-700 ${
                    processedImages.length > 0 
                      ? 'bg-green-600 text-white animate-bounce' 
                      : 'bg-gray-300 text-gray-500'
                  } rounded-full flex items-center justify-center font-bold text-sm`}>
                    ✓
                  </div>
                  <span className={`ml-2 text-sm font-medium transition-colors duration-500 ${
                    processedImages.length > 0 ? 'text-gray-900' : 'text-gray-500'
                  }`}>完了</span>
                </div>
              </div>
            </div>
            {/* 遷移オーバーレイ */}
            {isTransitioning && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-scale-in">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">処理完了！</h3>
                  <p className="text-gray-600 mb-4">
                    {processedImages.length}枚の画像処理が完了しました。<br />
                    結果画面に移動しています...
                  </p>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}

            {/* ステップ1: 画像アップロード */}
            <div className={`mb-12 transition-opacity duration-300 ${isProcessing || isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
              <div className="animate-fade-in-up mb-8">
                <div className="bg-white border-2 border-blue-200 rounded-2xl py-3 shadow-lg">
                  <div className="flex items-center mb-6 px-6 pt-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                      1
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">画像をアップロード</h2>
                  </div>
                  <ImageUploader onImagesUploaded={handleImagesUploaded} />
                </div>
              </div>
            </div>

            {/* ステップ2: プリセット選択・処理実行 */}
            {images.length > 0 && (
              <div className={`mb-12 transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
                <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                  <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center mb-6">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        2
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">フィルターを選択・処理実行</h2>
                    </div>
                    <PresetSelector
                      previewImages={images}
                      onPresetSelected={handlePresetSelected}
                      selectedPreset={selectedPreset}
                      onProcessStart={handleProcessingStart}
                      onProcessingComplete={handleProcessingComplete}
                      onProcessingError={handleProcessingError}
                      isProcessing={isProcessing}
                    />
                    
                    {/* エラー表示 */}
                    {processingError && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                          </svg>
                          <span className="text-red-800 font-medium">エラーが発生しました</span>
                        </div>
                        <p className="text-red-700 mt-2">{processingError}</p>
                        <button
                          onClick={() => setProcessingError(null)}
                          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          再試行
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 結果表示 */}
            {processedImages.length > 0 && !isProcessing && (
              <div id="result-section" className="mb-12">
                <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                  <div className="bg-white border-2 border-green-200 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center mb-6">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        ✓
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">処理完了 - ダウンロード</h2>
                    </div>
                    <ResultViewer
                      processedImages={processedImages}
                      recommendedServices={recommendedServices}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 使い方ガイド */}
        <section className="bg-white py-20 px-4" id="help">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">イージートーンの使い方ガイド</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                たった2ステップで画像にプロのようなトーンを適用する基本的な手順を分かりやすく説明します。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="animate-fade-in-up bg-white p-6 rounded-xl shadow-soft hover-lift" style={{animationDelay: '0.1s'}}>
                <div className="bg-blue-600 p-3 rounded-xl w-fit mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">1. 画像をアップロード</h3>
                <p className="text-gray-600 text-center">
                  トーン調整したい画像をアップロードエリアにドラッグ＆ドロップするか、クリックしてファイルを選択します。複数画像も同時に選択可能です。
                </p>
                <div className="text-center mt-4">
                  <span className="text-blue-600 font-medium text-sm">対応形式: JPG, PNG, HEIC など</span>
                </div>
              </div>
              
              <div className="animate-fade-in-up bg-white p-6 rounded-xl shadow-soft hover-lift" style={{animationDelay: '0.2s'}}>
                <div className="bg-green-600 p-3 rounded-xl w-fit mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">2. フィルター選択・処理実行</h3>
                <p className="text-gray-600 text-center">
                  プロが作成したプリセットフィルターから好みのトーンを選択し、「処理を開始」ボタンで一括処理。リアルタイムプレビューで仕上がりを確認できます。
                </p>
                <div className="text-center mt-4">
                  <span className="text-green-600 font-medium text-sm">6種類のプリセット・ワンクリック処理</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 背景透過機能への誘導セクション */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <div className="bg-blue-50 border border-blue-100 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">トーン調整＋背景透過で完璧な仕上がり</h3>
              <p className="text-gray-700 mb-6">
                画像のトーン調整だけでなく、背景透過も簡単に行えます。<br />
                SNSやECサイトに最適な画像に仕上げましょう。
              </p>
              <Link href="/">
                <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  イージーカットを使ってみる
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default EasyToneApp;