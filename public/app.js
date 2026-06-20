// ===== Config =====
const PAGE_SIZE = 20;

// ===== State =====
let currentPage = 1;
let currentPostId = null;

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

// ===== API calls =====
async function apiGetPosts(page) {
  const res = await fetch(`/api/posts?page=${page}&pageSize=${PAGE_SIZE}`);
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다');
  return res.json();
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
    const { posts, totalCount } = await apiGetPosts(page);
    renderList(posts, totalCount, page);
  } catch (err) {
    showToast(err.message);
  }
}

function renderList(posts, totalCount, page) {
  postCountEl.textContent = `전체 ${totalCount}개`;

  if (!posts.length) {
    postListEl.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
    paginationEl.innerHTML = '';
    return;
  }
  emptyStateEl.classList.add('hidden');

  postListEl.innerHTML = posts.map(post => `
    <div class="post-item" data-id="${post.id}">
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
  `).join('');

  postListEl.querySelectorAll('.post-item').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.id));
  });

  renderPagination(totalCount, page);
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
  if (!title || !body) return;

  const { author_name, is_anonymous } = getNameModeValue('write-name-mode', writeAuthorName);
  const parentId = writeParentId.value || null;

  try {
    await apiCreatePost({
      title,
      body,
      author_name,
      is_anonymous,
      parent_id: parentId,
      is_repost: !!parentId
    });
    showToast('등록되었습니다');
    showView(viewList);
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
  `;

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
