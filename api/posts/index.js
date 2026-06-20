import { supabase } from '../_supabase.js';
import { PASSWORD_PATTERN, hashPassword } from '../_password.js';

function sanitizeForFilter(value) {
  return value.replace(/[(),]/g, '');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const q = sanitizeForFilter((req.query.q || '').trim());
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      const [overallPostsRes, overallReplyRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('replies').select('id', { count: 'exact', head: true })
      ]);

      if (overallPostsRes.error) throw overallPostsRes.error;
      if (overallReplyRes.error) throw overallReplyRes.error;

      let query = supabase
        .from('posts')
        .select('id, title, author_name, is_anonymous, is_repost, parent_id, created_at, reply_count', { count: 'exact' });

      if (q) {
        const orParts = [`title.ilike.%${q}%`, `body.ilike.%${q}%`];

        const { data: replyMatches, error: replyErr } = await supabase
          .from('replies')
          .select('post_id')
          .ilike('body', `%${q}%`);
        if (replyErr) throw replyErr;

        const replyPostIds = [...new Set((replyMatches || []).map(r => r.post_id))];
        if (replyPostIds.length) {
          orParts.push(`id.in.(${replyPostIds.join(',')})`);
        }

        query = query.or(orParts.join(','));
      }

      const { data: posts, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return res.status(200).json({
        posts,
        listCount: count,
        totalCount: overallPostsRes.count,
        totalReplyCount: overallReplyRes.count
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { title, body, author_name, is_anonymous, parent_id, is_repost, password } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: '제목과 내용을 입력해주세요' });
    }
    if (!PASSWORD_PATTERN.test(password || '')) {
      return res.status(400).json({ error: '비밀번호는 영문/숫자/특수문자 4~8자로 입력해주세요' });
    }

    try {
      const { salt, hash } = hashPassword(password);

      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: title.slice(0, 150),
          body: body.slice(0, 3000),
          author_name: is_anonymous ? '익명' : (author_name || '익명').slice(0, 30),
          is_anonymous: !!is_anonymous,
          parent_id: parent_id || null,
          is_repost: !!is_repost,
          reply_count: 0,
          password_salt: salt,
          password_hash: hash
        })
        .select('id, title, body, author_name, is_anonymous, is_repost, parent_id, created_at, reply_count')
        .single();

      if (error) throw error;

      return res.status(201).json({ post: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
