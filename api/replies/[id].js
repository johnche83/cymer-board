import { supabase } from '../_supabase.js';
import { verifyPassword } from '../_password.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    const { password } = req.body || {};

    try {
      const { data: reply, error: replyError } = await supabase
        .from('replies')
        .select('post_id, password_salt, password_hash')
        .eq('id', id)
        .single();

      if (replyError) throw replyError;

      if (!verifyPassword(password, reply.password_salt, reply.password_hash)) {
        return res.status(403).json({ error: '비밀번호가 일치하지 않습니다' });
      }

      const { error: deleteError } = await supabase.from('replies').delete().eq('id', id);
      if (deleteError) throw deleteError;

      const { data: post } = await supabase
        .from('posts')
        .select('reply_count')
        .eq('id', reply.post_id)
        .single();

      await supabase
        .from('posts')
        .update({ reply_count: Math.max((post?.reply_count || 1) - 1, 0) })
        .eq('id', reply.post_id);

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
