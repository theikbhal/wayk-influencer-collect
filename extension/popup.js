// Popup script for Wayk Collector extension

let currentTab = null;
let isScraping = false;

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  setupEventListeners();
});

async function init() {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Update page info
  const pageInfo = await getPageInfo();
  updatePageInfo(pageInfo);

  // Load stats
  await refreshStats();

  // Load targets
  await loadTargets();
}

function setupEventListeners() {
  document.getElementById('btnScrape').addEventListener('click', startScrape);
  document.getElementById('btnRefresh').addEventListener('click', refreshStats);
  document.getElementById('btnOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage?.();
  });
}

async function getPageInfo() {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const url = window.location.pathname;
        const username = url.split('/').filter(Boolean)[0] || '';
        return {
          url: window.location.href,
          username,
          onProfile: url.match(/^\/([^/]+)\/?$/) !== null,
        };
      },
    });
    return results[0]?.result || { url: '', username: '', onProfile: false };
  } catch {
    return { url: '', username: '', onProfile: false };
  }
}

function updatePageInfo(info) {
  const dot = document.getElementById('igDot');
  const urlEl = document.getElementById('igUrl');
  const statusEl = document.getElementById('pageStatus');

  if (info.url.includes('instagram.com')) {
    dot.className = 'dot active';
    urlEl.textContent = info.username ? `@${info.username}` : 'Instagram';
    statusEl.textContent = info.onProfile ? `Profile: @${info.username}` : 'On Instagram';
    document.getElementById('btnScrape').disabled = false;
  } else {
    dot.className = 'dot inactive';
    urlEl.textContent = 'Not on Instagram';
    statusEl.textContent = 'Not on IG';
    document.getElementById('btnScrape').disabled = true;
  }
}

async function refreshStats() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    if (result.error) throw new Error(result.error);
    document.getElementById('statTotal').textContent = result.total?.toLocaleString() || '0';
    document.getElementById('statPending').textContent = result.pending?.toLocaleString() || '0';
    document.getElementById('statFollowed').textContent = result.followed?.toLocaleString() || '0';
  } catch (e) {
    document.getElementById('statTotal').textContent = '!';
    document.getElementById('statPending').textContent = '!';
    document.getElementById('statFollowed').textContent = '!';
    showResult(e.message, 'error');
  }
}

async function loadTargets() {
  try {
    const targets = await chrome.runtime.sendMessage({ type: 'GET_TARGETS' });
    const select = document.getElementById('targetSelect');
    select.innerHTML = '<option value="">Select target account...</option>';
    (targets || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.username;
      opt.textContent = `@${t.username} (${t.followers_count || 0} followers)`;
      select.appendChild(opt);
    });
  } catch (e) {
    // Silently fail - targets can still be typed manually
  }
}

async function startScrape() {
  if (isScraping) return;

  const select = document.getElementById('targetSelect');
  let targetUsername = select.value;

  // If no target selected, try to use current page
  if (!targetUsername) {
    const info = await getPageInfo();
    if (info.username && info.onProfile) {
      targetUsername = info.username;
    } else {
      showResult('Select a target account or visit an IG profile', 'error');
      return;
    }
  }

  const btn = document.getElementById('btnScrape');
  btn.textContent = 'Scraping...';
  btn.disabled = true;
  isScraping = true;
  showResult(`Scraping followers of @${targetUsername}...`, 'info');

  try {
    const result = await chrome.tabs.sendMessage(currentTab.id, {
      type: 'START_SCRAPE',
      targetUsername,
    });

    if (result.error) {
      // Try injecting content script if not loaded
      if (result.error.includes('receiving end')) {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['content.js'],
        });
        // Retry
        const retryResult = await chrome.tabs.sendMessage(currentTab.id, {
          type: 'START_SCRAPE',
          targetUsername,
        });
        showResult(
          retryResult.error
            ? `Error: ${retryResult.error}`
            : `Done! Found ${retryResult.followers} followers, added ${retryResult.added}`,
          retryResult.error ? 'error' : 'success'
        );
      } else {
        showResult(`Error: ${result.error}`, 'error');
      }
    } else if (result.cancelled) {
      showResult('Scraping cancelled', 'info');
    } else {
      showResult(
        `Found ${result.followers} followers, added ${result.added} new, ${result.skipped} duplicates`,
        'success'
      );
      await refreshStats();
    }
  } catch (e) {
    showResult(`Error: ${e.message}. Try refreshing the page.`, 'error');
  }

  btn.textContent = 'Scrape Followers';
  btn.disabled = false;
  isScraping = false;
}

function showResult(msg, type) {
  const el = document.getElementById('result');
  el.textContent = msg;
  el.className = `result ${type}`;
  // Auto-hide success after 5s
  if (type === 'success') {
    setTimeout(() => { el.className = 'result'; }, 5000);
  }
}
