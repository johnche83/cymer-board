// ===== Config =====
const PAGE_SIZE = 10;
const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_+\-=]{4,8}$/;

// ===== State =====
let currentPage = 1;
let currentPostId = null;
let currentQuery = '';

// ===== Elements =====
const viewList = document.getElementById('view-list');
const viewWrite = document.getElementById('view-write');
const viewDetail = document.getElementById('view-detail');

const postListEl = document.getElementById('post-list');
const postCountEl = document.getElementById('post-count');
const emptyStateEl = document.getElementById('empty-state');
const paginationEl = document.getElementById('pagination');

const btnNewPost = document.getElementById('btn-new-post');
const btnCancelWrite = document.getElementById('btn-cancel-write');
const btnBackToList = document.getElementById('btn-back-to-list');

const formWrite = document.getElementById('form-write');
const writeHeading = document.getElementById('write-heading');
const writeParentId = document.getElementById('write-parent-id');
const writeTitle = document.getElementById('write-title');
const writeBody = document.getElementById('write-body');
const writeAuthorName = document.getElementById('write-author-name');
const writePassword = document.getElementById('write-password');

const headerHome = document.getElementById('header-home');
const formSearch = document.getElementById('form-search');
const searchInput = document.getElementById('search-input');

const formReply = document.getElementById('form-reply');
const replyBody = document.getElementById('reply-body');
const replyAuthorName = document.getElementById('reply-author-name');

const detailOriginal = document.getElementById('detail-original');
const detailReplies = document.getElementById('detail-replies');

const toastEl = document.getElementById('toast');

// ===== Utilities =====
function showView(view) {
  [viewList, viewWrite, viewDetail].forEach(v => v.classList.add('hidden'));
  view.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 2200);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

function setupNameToggle(radioName, inputEl) {
  document.querySelectorAll(`input[name="${radioName}"]`).forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'real') {
        inputEl.classList.remove('hidden');
        inputEl.required = true;
      } else {
        inputEl.classList.add('hidden');
        inputEl.required = false;
        inputEl.value = '';
      }
    });
  });
}
setupNameToggle('write-name-mode', writeAuthorName);
setupNameToggle('reply-name-mode', replyAuthorName);

function getNameModeValue(radioName, inputEl) {
  const mode = document.querySelector(`input[name="${radioName}"]:checked`).value;
  if (mode === 'anon') return { author_name: '익명', is_anonymous: true };
  const name = inputEl.value.trim();
  return { author_name: name || '익명', is_anonymous: false };
}

writePassword.addEventListener('input', () => {
  writePassword.value = writePassword.value.replace(/[^A-Za-z0-9!@#$%^&*()_+\-=]/g, '').slice(0, 8);
});

headerHome.addEventListener('click', () => {
  searchInput.value = '';
  currentQuery = '';
  showView(viewList);
  loadList(1);
});

formSearch.addEventListener('submit', (e) => {
  e.preventDefault();
  currentQuery = searchInput.value.trim();
  loadList(1);
});

// ===== API calls =====
async function apiGetPosts(page, query) {
  const params = new URLSearchParams({ page, pageSize: PAGE_SIZE });
  if (query) params.set('q', query);
  const res = await fetch(`/api/posts?${params.toString()}`);
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다');
  return res.json();
}

async function apiDeletePost(id, password) {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '삭제에 실패했습니다');
  return data;
}

async function apiGetPost(id) {
  const res = await fetch(`/api/posts/${id}`);
  if (!res.ok) throw new Error('게시글을 불러오지 못했습니다');
  return res.json();
}

async function apiCreatePost(payload) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('등록에 실패했습니다');
  return res.json();
}

async function apiCreateReply(postId, payload) {
  const res = await fetch(`/api/posts/${postId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('답글 등록에 실패했습니다');
  return res.json();
}

// ===== List rendering =====
async function loadList(page = 1) {
  currentPage = page;
  try {
    const { posts, listCount, totalCount, totalReplyCount } = await apiGetPosts(page, currentQuery);
    renderList(posts, listCount, totalCount, totalReplyCount, page);
  } catch (err) {
    showToast(err.message);
  }
}

function renderList(posts, listCount, totalCount, totalReplyCount, page) {
  postCountEl.textContent = currentQuery
    ? `검색 결과 ${listCount}개 (전체 게시글 ${totalCount}개 · 답글 ${totalReplyCount}개)`
    : `게시글 ${totalCount}개 · 답글 ${totalReplyCount}개`;

  if (!posts.length) {
    postListEl.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
    paginationEl.innerHTML = '';
    return;
  }
  emptyStateEl.classList.add('hidden');

  const byId = new Map(posts.map(p => [p.id, p]));
  const childrenByParent = new Map();
  posts.forEach(p => {
    if (p.parent_id && byId.has(p.parent_id)) {
      if (!childrenByParent.has(p.parent_id)) childrenByParent.set(p.parent_id, []);
      childrenByParent.get(p.parent_id).push(p);
    }
  });
  const topLevel = posts.filter(p => !(p.parent_id && byId.has(p.parent_id)));

  function renderBranch(post, depth) {
    const children = childrenByParent.get(post.id) || [];
    return renderPostRow(post, depth) + children.map(child => renderBranch(child, depth + 1)).join('');
  }

  postListEl.innerHTML = topLevel.map(post => renderBranch(post, 0)).join('');

  postListEl.querySelectorAll('.post-item').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.id));
  });

  renderPagination(listCount, page);
}

function renderPostRow(post, depth = 0) {
  const style = depth > 0 ? ` style="--depth: ${depth}"` : '';
  return `
    <div class="post-item${depth > 0 ? ' post-item-child' : ''}" data-id="${post.id}"${style}>
      <div class="post-item-top">
        ${post.is_repost ? '<span class="tag tag-repost">Re:</span>' : ''}
        <span class="post-item-title">${escapeHtml(post.title)}</span>
        ${post.reply_count > 0 ? `<span class="reply-count">[${post.reply_count}]</span>` : ''}
      </div>
      <div class="post-item-meta">
        <span class="tag ${post.is_anonymous ? 'tag-anon' : 'tag-real'}">${escapeHtml(post.author_name)}</span>
        <span>${formatDate(post.created_at)}</span>
      </div>
    </div>
  `;
}

function renderPagination(totalCount, page) {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

  let html = `<button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>이전</button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }
  html += `<button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>다음</button>`;
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => loadList(Number(btn.dataset.page)));
  });
}

// ===== Write view =====
function openWriteView(parentId = null, parentTitle = null) {
  formWrite.reset();
  writeAuthorName.classList.add('hidden');
  writeParentId.value = parentId || '';
  if (parentId) {
    writeHeading.textContent = '답글을 별도 게시글로 남기기';
    writeTitle.value = `Re: ${parentTitle}`;
  } else {
    writeHeading.textContent = '새 글 쓰기';
    writeTitle.value = '';
  }
  showView(viewWrite);
}

btnNewPost.addEventListener('click', () => openWriteView());
btnCancelWrite.addEventListener('click', () => showView(viewList));

formWrite.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = writeTitle.value.trim();
  const body = writeBody.value.trim();
  const password = writePassword.value;
  if (!title || !body) return;
  if (!PASSWORD_PATTERN.test(password)) {
    showToast('비밀번호는 영문/숫자/특수문자 4~8자로 입력해주세요');
    return;
  }

  const { author_name, is_anonymous } = getNameModeValue('write-name-mode', writeAuthorName);
  const parentId = writeParentId.value || null;

  try {
    await apiCreatePost({
      title,
      body,
      author_name,
      is_anonymous,
      parent_id: parentId,
      is_repost: !!parentId,
      password
    });
    showToast('등록되었습니다');
    showView(viewList);
    currentQuery = '';
    searchInput.value = '';
    loadList(1);
  } catch (err) {
    showToast(err.message);
  }
});

// ===== Detail view =====
async function openDetail(id) {
  try {
    const { post, replies } = await apiGetPost(id);
    currentPostId = id;
    renderDetail(post, replies);
    showView(viewDetail);
  } catch (err) {
    showToast(err.message);
  }
}

function renderDetail(post, replies) {
  detailOriginal.innerHTML = `
    <h2 class="post-detail-title">${post.is_repost ? '<span class="tag tag-repost">Re:</span> ' : ''}${escapeHtml(post.title)}</h2>
    <div class="post-detail-meta">
      <span class="tag ${post.is_anonymous ? 'tag-anon' : 'tag-real'}">${escapeHtml(post.author_name)}</span>
      <span>${formatDate(post.created_at)}</span>
    </div>
    <div class="post-detail-body">${escapeHtml(post.body)}</div>
    <div class="post-delete">
      <button type="button" id="btn-delete-post" class="btn-link btn-delete">삭제</button>
    </div>
  `;

  document.getElementById('btn-delete-post').addEventListener('click', async () => {
    const password = window.prompt('게시글 작성 시 입력한 비밀번호를 입력하세요');
    if (password === null) return;
    try {
      await apiDeletePost(post.id, password);
      showToast('삭제되었습니다');
      showView(viewList);
      loadList(1);
    } catch (err) {
      showToast(err.message);
    }
  });

  if (!replies.length) {
    detailReplies.innerHTML = '';
  } else {
    detailReplies.innerHTML = replies.map(r => `
      <div class="reply-item">
        <div class="reply-item-meta">
          <span class="tag ${r.is_anonymous ? 'tag-anon' : 'tag-real'}">${escapeHtml(r.author_name)}</span>
          <span>${formatDate(r.created_at)}</span>
        </div>
        <div class="reply-item-body">${escapeHtml(r.body)}</div>
      </div>
    `).join('');
  }

  formReply.reset();
  replyAuthorName.classList.add('hidden');
}

btnBackToList.addEventListener('click', () => {
  showView(viewList);
  loadList(currentPage);
});

formReply.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = replyBody.value.trim();
  if (!body) return;

  const { author_name, is_anonymous } = getNameModeValue('reply-name-mode', replyAuthorName);
  const replyType = document.querySelector('input[name="reply-type"]:checked').value;

  if (replyType === 'repost') {
    // 별도 게시글(Re:)로 등록 — 글쓰기 화면으로 전환하여 제목 입력 흐름 재사용
    const { post } = await apiGetPost(currentPostId);
    openWriteView(currentPostId, post.title);
    writeBody.value = body;
    return;
  }

  try {
    await apiCreateReply(currentPostId, { body, author_name, is_anonymous });
    showToast('답글이 등록되었습니다');
    openDetail(currentPostId);
  } catch (err) {
    showToast(err.message);
  }
});

// ===== Init =====
loadList(1);
