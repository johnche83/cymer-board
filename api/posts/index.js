import { supabase } from '../_supabase.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      const { data: posts, error, count } = await supabase
        .from('posts')
        .select('id, title, author_name, is_anonymous, is_repost, created_at, reply_count', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return res.status(200).json({ posts, totalCount: count });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { title, body, author_name, is_anonymous, parent_id, is_repost } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: '제목과 내용을 입력해주세요' });
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: title.slice(0, 150),
          body: body.slice(0, 3000),
          author_name: is_anonymous ? '익명' : (author_name || '익명').slice(0, 30),
          is_anonymous: !!is_anonymous,
          parent_id: parent_id || null,
          is_repost: !!is_repost,
          reply_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ post: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
