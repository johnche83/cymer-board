import { supabase } from '../../_supabase.js';
import { verifyPassword } from '../../_password.js';

async function collectDescendantIds(rootId) {
  const ids = [];
  let frontier = [rootId];
  while (frontier.length) {
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .in('parent_id', frontier);
    if (error) throw error;
    frontier = data.map(p => p.id);
    ids.push(...frontier);
  }
  return ids;
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, title, body, author_name, is_anonymous, is_repost, parent_id, created_at, reply_count')
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

  if (req.method === 'DELETE') {
    const { password } = req.body || {};

    try {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('password_salt, password_hash')
        .eq('id', id)
        .single();

      if (postError) throw postError;

      if (!verifyPassword(password, post.password_salt, post.password_hash)) {
        return res.status(403).json({ error: '비밀번호가 일치하지 않습니다' });
      }

      // collectDescendantIds returns shallow-to-deep order; reverse so deepest
      // descendants are deleted first, then the root last (avoids parent_id FK violations)
      const descendantIds = await collectDescendantIds(id);
      const deletionOrder = [...descendantIds.reverse(), id];

      for (const deleteId of deletionOrder) {
        const { error: deleteError } = await supabase.from('posts').delete().eq('id', deleteId);
        if (deleteError) throw deleteError;
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
