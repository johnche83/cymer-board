import { supabase } from '../../_supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (postError) throw postError;

      const { data: replies, error: repliesError } = await supabase
        .from('replies')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      return res.status(200).json({ post, replies });
    } catch (err) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
