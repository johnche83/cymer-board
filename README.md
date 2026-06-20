# Cymer 무물방 — 배포 가이드

익명/실명 선택형 사내 Q&A 게시판입니다. FACET 앱과 동일한 구조(Vanilla JS + Vercel Serverless + DB)로 만들어졌습니다.

---

## 1. Supabase 설정 (5분)

1. https://supabase.com → 회원가입(무료) → "New Project" 생성
2. 프로젝트 생성 후 좌측 메뉴 **SQL Editor** 클릭
3. `supabase_schema.sql` 파일 내용을 전체 복사해서 붙여넣고 **Run** 클릭
   → `posts`, `replies` 테이블이 자동 생성됩니다
4. 좌측 메뉴 **Settings → API** 클릭
5. 아래 두 값을 복사해두세요 (다음 단계에서 사용):
   - **Project URL** (예: `https://xxxxx.supabase.co`)
   - **service_role key** (Settings → API → Project API keys 하단, "secret" 표시된 키)

⚠️ service_role key는 외부에 노출되면 안 되는 키입니다. Vercel 환경변수에만 등록하고 코드에 직접 적지 않습니다.

---

## 2. GitHub 업로드

1. GitHub에서 새 레포지토리 생성 (예: `cymer-board`)
2. 이 폴더(`cymer-board`) 전체를 레포에 푸시

```bash
cd cymer-board
git init
git add .
git commit -m "Initial commit: Cymer 무물방"
git branch -M main
git remote add origin https://github.com/[본인계정]/cymer-board.git
git push -u origin main
```

---

## 3. Vercel 배포

1. https://vercel.com → "Add New Project" → 방금 만든 GitHub 레포 Import
2. **Environment Variables** 섹션에 아래 2개 추가:

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | (1단계에서 복사한 Project URL) |
   | `SUPABASE_SERVICE_KEY` | (1단계에서 복사한 service_role key) |

3. **Deploy** 클릭
4. 배포 완료 후 발급된 URL로 접속 → 정상 작동 확인

---

## 4. 접근 제어 (선택 — 추후 추가 권장)

현재는 URL만 알면 누구나 접근 가능한 상태입니다. 사내용으로만 운영하려면:

- **간단한 방법**: Vercel 대시보드 → Settings → Deployment Protection → Password Protection 활성화 (Pro 플랜 필요)
- **권장 방법**: 회사 이메일(SSO) 인증 단계를 추가 (추후 별도 작업으로 안내 가능)

---

## 5. 폴더 구조

```
cymer-board/
├── public/
│   ├── index.html      게시판 목록/글쓰기/상세 화면
│   ├── style.css        디자인
│   ├── app.js            프론트엔드 로직
│   └── logo.png          Cymer 로고
├── api/
│   ├── _supabase.js      DB 연결 헬퍼
│   └── posts/
│       ├── index.js      목록 조회(GET) / 글쓰기(POST)
│       └── [id]/
│           ├── index.js      게시글 상세 조회
│           └── replies.js    답글 작성
├── supabase_schema.sql   DB 테이블 생성 스크립트
├── vercel.json
└── package.json
```

## 6. 구현된 기능

- 글쓰기: 제목 + 익명/실명 선택 + 본문
- 게시글 클릭 → 상세 페이지 진입
- 답글: 익명/실명 선택 가능, "일반 답글" 또는 "별도 게시글(Re:)"로 등록 선택 가능
- 페이지당 20개 표시, 페이지네이션으로 이전 글 탐색
- 최신 글이 항상 1페이지 최상단에 노출
