import { supabase } from '../../_supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    const { body, author_name, is_anonymous } = req.body;

    if (!body) {
      return res.status(400).json({ error: '답글 내용을 입력해주세요' });
    }

    try {
      const { data: reply, error: replyError } = await supabase
        .from('replies')
        .insert({
          post_id: id,
          body: body.slice(0, 3000),
          author_name: is_anonymous ? '익명' : (author_name || '익명').slice(0, 30),
          is_anonymous: !!is_anonymous
        })
        .select()
        .single();

      if (replyError) throw replyError;

      // 원글의 reply_count 증가
      const { data: post } = await supabase
        .from('posts')
        .select('reply_count')
        .eq('id', id)
        .single();

      await supabase
        .from('posts')
        .update({ reply_count: (post?.reply_count || 0) + 1 })
        .eq('id', id);

      return res.status(201).json({ reply });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
