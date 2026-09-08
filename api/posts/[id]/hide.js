import { supabase } from '../../_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { adminPassword, hide } = req.body || {};

  if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: '관리자 비밀번호가 일치하지 않습니다' });
  }

  try {
    const { error } = await supabase
      .from('posts')
      .update({ is_hidden: hide })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, is_hidden: hide });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
