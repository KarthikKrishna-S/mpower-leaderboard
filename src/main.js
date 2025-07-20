import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

let teams = [];
let isRefreshing = false;
let startY = null;
let pullRefreshElem = null;

const rankSymbol = (rank) => {
  if (rank === 1) return '🏆';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
};

const helpTexts = {
  leaderboard: 'Shows the current team rankings.',
  doNotOpen: 'This is a secret page. Don\'t scan!'
};

function renderBurger() {
  return `<button class="burger" id="burger-btn" aria-label="Open menu">
    <span style="font-size:2rem;line-height:1;">&#10005;</span>
  </button>`;
}

function renderSidebar(activePage) {
  return `
    <nav class="sidebar" id="sidebar">
      <a href="#leaderboard" class="sidebar-link${activePage === 'leaderboard' ? ' active' : ''}">Leaderboard</a>
      <a href="#do-not-open" class="sidebar-link${activePage === 'do-not-open' ? ' active' : ''}">DO NOT OPEN</a>
    </nav>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

function renderHelpIcon() {
  return `<div class="help-icon" id="help-icon" title="Help">?</div><div class="help-tooltip" id="help-tooltip"></div>`;
}

function renderLeaderboard() {
  if (!teams.length) {
    return `<div class="loading">Loading leaderboard...</div>`;
  }
  return `
    <h1>mPower Leaderboard</h1>
    <table class="leaderboard">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        ${teams.map((team, i) => `
          <tr class="rank-${i+1}">
            <td>${rankSymbol(i+1)}</td>
            <td class="team-cell">
              <img src="/${team.logo}" alt="${team.name} logo" class="team-logo" />
              <span class="team-name">${team.name}</span>
            </td>
            <td class="score">${team.score}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderDoNotOpen() {
  return `
    <h1>DO NOT SCAN</h1>
    <img src="/QR_CODE.png" alt="Secret QR Code" style="max-width: 100%; border-radius: 12px; margin-top: 1.5rem; box-shadow: 0 2px 12px #0002;" />
  `;
}

function setupPullToRefresh() {
  const app = document.getElementById('app');
  if (!app || window.location.hash === '#do-not-open') return;

  // Remove previous indicator if any
  if (pullRefreshElem) {
    pullRefreshElem.remove();
    pullRefreshElem = null;
  }

  // Touch events for pull-to-refresh
  app.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
    } else {
      startY = null;
    }
  }, { passive: true });

  app.addEventListener('touchmove', (e) => {
    if (startY !== null) {
      const currentY = e.touches[0].clientY;
      if (currentY - startY > 60 && !isRefreshing) {
        triggerRefresh();
        startY = null;
      }
    }
  }, { passive: true });

  app.addEventListener('touchend', () => {
    startY = null;
  });
}

function triggerRefresh() {
  isRefreshing = true;
  showRefreshIndicator();
  fetchTeamsAndRender().finally(() => {
    isRefreshing = false;
    hideRefreshIndicator();
  });
}

function showRefreshIndicator() {
  if (!pullRefreshElem) {
    pullRefreshElem = document.createElement('div');
    pullRefreshElem.className = 'pull-refresh-indicator';
    pullRefreshElem.textContent = 'Refreshing...';
    document.body.prepend(pullRefreshElem);
  }
}

function hideRefreshIndicator() {
  if (pullRefreshElem) {
    pullRefreshElem.remove();
    pullRefreshElem = null;
  }
}

function render(page) {
  document.body.innerHTML = '';
  // Burger button
  const burger = document.createElement('div');
  burger.innerHTML = renderBurger();
  document.body.appendChild(burger.firstElementChild);

  // Sidebar (hidden by default)
  const sidebarWrap = document.createElement('div');
  sidebarWrap.innerHTML = renderSidebar(page);
  document.body.appendChild(sidebarWrap.firstElementChild);
  document.body.appendChild(sidebarWrap.lastElementChild);

  // Main content
  const app = document.createElement('div');
  app.id = 'app';
  if (page === 'do-not-open') app.classList.add('do-not-open-page');
  app.innerHTML =
    (page === 'leaderboard' ? renderLeaderboard() : renderDoNotOpen()) +
    renderHelpIcon();
  document.body.appendChild(app);

  // Setup pull-to-refresh only for leaderboard
  if (page === 'leaderboard') {
    setupPullToRefresh();
  }

  // Sidebar logic
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const burgerBtn = document.getElementById('burger-btn');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }
  burgerBtn.onclick = openSidebar;
  overlay.onclick = closeSidebar;

  // Sidebar navigation
  sidebar.querySelectorAll('.sidebar-link').forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      closeSidebar();
      setTimeout(() => {
        if (href === '#leaderboard') {
          window.location.hash = '#leaderboard';
        } else if (href === '#do-not-open') {
          window.location.hash = '#do-not-open';
        }
      }, 200);
    };
  });

  // Help icon logic
  const helpIcon = document.getElementById('help-icon');
  const helpTooltip = document.getElementById('help-tooltip');
  helpIcon.onclick = () => {
    helpTooltip.textContent = helpTexts[page === 'leaderboard' ? 'leaderboard' : 'doNotOpen'];
    helpTooltip.classList.add('show');
    setTimeout(() => {
      helpTooltip.classList.remove('show');
    }, 2500);
  };
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'do-not-open') {
    render('do-not-open');
  } else {
    render('leaderboard');
  }
}

async function fetchTeamsAndRender() {
  try {
    const res = await fetch('https://mpower-leaderboard.onrender.com/api/teams');
    if (!res.ok) throw new Error('Failed to fetch teams');
    teams = await res.json();
    // Sort teams by score descending
    teams.sort((a, b) => b.score - a.score);
    handleHashChange();
  } catch (err) {
    teams = [];
    document.body.innerHTML = '<div class="error">Failed to load leaderboard. Please try again later.</div>';
    console.error(err);
  }
}

window.addEventListener('hashchange', handleHashChange);

fetchTeamsAndRender();
