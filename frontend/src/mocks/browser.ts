/**
 * MSW Browser Setup
 * ブラウザ環境でのMSW設定
 */

import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/**
 * MSW Service Workerのセットアップ
 */
export const worker = setupWorker(...handlers);

/**
 * 開発環境でMSWを開始
 */
export async function startMockServiceWorker() {
  if (import.meta.env.DEV) {
    return worker.start({
      onUnhandledRequest: 'bypass', // モックされていないリクエストは通過させる
    });
  }
}
