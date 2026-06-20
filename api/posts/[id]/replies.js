import { supabase } from '../../_supabase.js';
import { PASSWORD_PATTERN, hashPassword } from '../../_password.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    const { body, author_name, is_anonymous, password } = req.body;

    if (!body) {
      return res.status(400).json({ error: '답글 내용을 입력해주세요' });
    }
    if (!PASSWORD_PATTERN.test(password || '')) {
      return res.status(400).json({ error: '비밀번호는 영문/숫자/특수문자 4~8자로 입력해주세요' });
    }

    try {
      const { salt, hash } = hashPassword(password);

      const { data: reply, error: replyError } = await supabase
        .from('replies')
        .insert({
          post_id: id,
          body: body.slice(0, 3000),
          author_name: is_anonymous ? '익명' : (author_name || '익명').slice(0, 30),
          is_anonymous: !!is_anonymous,
          password_salt: salt,
          password_hash: hash
        })
        .select('id, post_id, body, author_name, is_anonymous, created_at')
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
