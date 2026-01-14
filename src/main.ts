/**
 * Financial Path Visualizer
 * A tool that shows you where your money decisions lead.
 *
 * All computation happens client-side. No server receives financial data.
 */

import './ui/styles/main.css';

function init(): void {
  const app = document.getElementById('app');
  if (!app) {
    throw new Error('Could not find #app element');
  }

  app.innerHTML = `
    <div class="app-container">
      <header class="app-header">
        <h1>Financial Path Visualizer</h1>
        <p class="tagline">See where your money decisions lead</p>
      </header>
      <main class="app-main">
        <div class="loading-state">
          <p>Loading...</p>
        </div>
      </main>
      <footer class="app-footer">
        <p class="privacy-notice">
          Your data stays in your browser. Nothing is sent to any server.
        </p>
      </footer>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', init);
