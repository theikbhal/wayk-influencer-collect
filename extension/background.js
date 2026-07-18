// Background service worker for Wayk Collector extension
const SUPABASE_URL = 'https://fuywzjtfspfdpctrlxtj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXd6anRmc3BmZHBjdHJseHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDY2ODQsImV4cCI6MjA5ODM4MjY4NH0.tmpI_QALCbDfihjvBfCEyciXA-TgZXOY_dbm0hR04S0';

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${res.statusText}`);
  return res;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SCRAPE_FOLLOWERS':
      handleScrapeFollowers(message.data, sender)
        .then(sendResponse)
        .catch(err => sendResponse({ error: err.message }));
      return true; // keep channel open

    case 'GET_STATS':
      getStats().then(sendResponse).catch(err => sendResponse({ error: err.message }));
      return true;

    case 'GET_TARGETS':
      getTargets().then(sendResponse).catch(err => sendResponse({ error: err.message }));
      return true;
  }
});

async function handleScrapeFollowers({ targetUsername, followers }) {
  const results = { added: 0, skipped: 0, errors: 0 };

  // First, ensure target exists
  const { data: targets } = await supabaseFetch(
    `target_accounts?username=eq.${targetUsername}&select=id`,
    { headers: { 'Prefer': 'count=exact' } }
  );

  let targetId = null;
  if (targets && targets.length > 0) {
    targetId = targets[0].id;
  }

  // Get existing usernames to avoid duplicates
  const existingRes = await supabaseFetch('ig_accounts?select=username');
  const existing = await existingRes.json();
  const existingSet = new Set(existing.map(a => a.username?.toLowerCase()));

  // Batch insert new followers
  const batch = [];
  for (const follower of followers) {
    const username = (follower.username || '').replace('@', '').trim().toLowerCase();
    if (!username || existingSet.has(username)) {
      results.skipped++;
      continue;
    }
    batch.push({
      username,
      display_name: follower.display_name || '',
      followers: follower.followers || 0,
      following: follower.following || 0,
      posts_count: follower.posts || 0,
      bio: follower.bio || '',
      profile_url: `https://instagram.com/${username}`,
      source: 'extension',
      follow_status: 'pending_review',
      target_id: targetId,
      collected_at: new Date().toISOString(),
    });
    existingSet.add(username);
  }

  // Insert in batches of 50
  for (let i = 0; i < batch.length; i += 50) {
    const chunk = batch.slice(i, i + 50);
    try {
      const res = await supabaseFetch('ig_accounts', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(chunk),
      });
      results.added += chunk.length;
    } catch (e) {
      results.errors++;
    }
  }

  // Update target scrape status
  if (targetId) {
    await supabaseFetch(`target_accounts?id=eq.${targetId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        scrape_status: 'completed',
        last_scraped_at: new Date().toISOString(),
        followers_count: followers.length,
      }),
    });
  }

  return results;
}

async function getStats() {
  const [totalRes, pendingRes, followedRes] = await Promise.all([
    supabaseFetch('ig_accounts?select=id', { headers: { 'Prefer': 'count=exact' } }),
    supabaseFetch("ig_accounts?follow_status=eq.pending_review&select=id", { headers: { 'Prefer': 'count=exact' } }),
    supabaseFetch("ig_accounts?follow_status=eq.followed&select=id", { headers: { 'Prefer': 'count=exact' } }),
  ]);

  return {
    total: parseInt(totalRes.headers.get('content-range')?.split('/')[1] || '0'),
    pending: parseInt(pendingRes.headers.get('content-range')?.split('/')[1] || '0'),
    followed: parseInt(followedRes.headers.get('content-range')?.split('/')[1] || '0'),
  };
}

async function getTargets() {
  const res = await supabaseFetch('target_accounts?select=username,id,followers_count,scrape_status&order=created_at.desc');
  return await res.json();
}
