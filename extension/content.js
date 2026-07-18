// Wayk Collector - Instagram content script
// Scrapes follower lists from Instagram profile pages

let isScraping = false;
let scrapeTarget = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_SCRAPE':
      startScrape(message.targetUsername)
        .then(sendResponse)
        .catch(err => sendResponse({ error: err.message }));
      return true;

    case 'GET_PAGE_INFO':
      sendResponse(getPageInfo());
      return true;

    case 'STOP_SCRAPE':
      isScraping = false;
      sendResponse({ stopped: true });
      return true;
  }
});

function getPageInfo() {
  const url = window.location.pathname;
  const username = url.split('/').filter(Boolean)[0] || '';
  return {
    url: window.location.href,
    username,
    onProfile: url.match(/^\/([^/]+)\/?$/) !== null,
    hasFollowers: document.querySelector('[href*="/followers"]') !== null,
  };
}

async function startScrape(targetUsername) {
  if (isScraping) return { error: 'Already scraping' };

  isScraping = true;
  scrapeTarget = targetUsername;

  try {
    const followers = await scrapeFollowersList();
    if (!isScraping) return { cancelled: true };

    // Send to background for Supabase sync
    const result = await chrome.runtime.sendMessage({
      type: 'SCRAPE_FOLLOWERS',
      data: { targetUsername: scrapeTarget, followers },
    });

    return { followers: followers.length, ...result };
  } catch (err) {
    return { error: err.message };
  } finally {
    isScraping = false;
  }
}

async function scrapeFollowersList() {
  // Navigate to the target's profile
  const targetUser = scrapeTarget || getPageInfo().username;
  if (!targetUser) throw new Error('No target username specified');

  // If not already on the right profile, navigate
  if (!window.location.pathname.includes(targetUser)) {
    window.location.href = `https://www.instagram.com/${targetUser}/`;
    await wait(2000);
  }

  // Click on followers link
  const followersLink = await waitForElement('a[href$="/followers/"]', 5000);
  if (!followersLink) throw new Error('Could not find followers link');
  followersLink.click();
  await wait(1500);

  // Wait for the followers dialog
  const dialog = await waitForElement('div[role="dialog"]', 5000);
  if (!dialog) throw new Error('Followers dialog did not open');

  const followers = [];
  const seen = new Set();

  // Scroll and collect
  let scrollAttempts = 0;
  const maxScrolls = 100;
  let noNewCount = 0;

  while (isScraping && scrollAttempts < maxScrolls && noNewCount < 5) {
    // Get all follower elements in the dialog
    const items = dialog.querySelectorAll('div[role="button"] a[href^="/"]:not([href*="/"])');
    let addedThisRound = 0;

    for (const item of items) {
      const href = item.getAttribute('href');
      const username = href ? href.replace('/', '').split('?')[0] : '';
      if (!username || seen.has(username)) continue;

      seen.add(username);

      // Try to get display name and bio from nearby elements
      const container = item.closest('div[style]') || item.parentElement;
      const spans = container ? container.querySelectorAll('span') : [];
      let display_name = '';
      let bio = '';

      for (const span of spans) {
        const text = span.textContent?.trim() || '';
        if (text && text !== username && !text.startsWith('@') && text.length < 50 && !display_name) {
          display_name = text;
        } else if (text.length > 50 && !bio) {
          bio = text;
        }
      }

      followers.push({
        username,
        display_name,
        bio,
        followers: 0,
        following: 0,
        posts: 0,
      });
      addedThisRound++;
    }

    if (addedThisRound === 0) {
      noNewCount++;
    } else {
      noNewCount = 0;
    }

    // Scroll the dialog
    const listContainer = dialog.querySelector('div[style*="overflow"]') || dialog;
    listContainer.scrollTop = listContainer.scrollHeight;
    await wait(800);
    scrollAttempts++;
  }

  return followers;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}
