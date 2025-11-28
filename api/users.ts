import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = url && serviceKey
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!adminClient) {
    return res.status(500).json({ error: 'Supabase service key missing on server.' });
  }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });

    const users = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      role: (u.user_metadata as any)?.role || 'DISPO',
      fullName: (u.user_metadata as any)?.fullName || '',
      birthdate: (u.user_metadata as any)?.birthdate || '',
      organization: (u.user_metadata as any)?.organization || '',
      isBanned: !!u.banned_until,
      lastSignIn: u.last_sign_in_at,
      createdAt: u.created_at,
    }));
    return res.status(200).json({ users });
  }

  if (req.method === 'PATCH') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { id, role, ban } = body || {};
    if (!id) return res.status(400).json({ error: 'Missing user id' });

    const updatePayload: any = {};
    if (role) {
      updatePayload.user_metadata = { role };
    }
    if (ban !== undefined) {
      updatePayload.banDuration = ban ? 'forever' : 'none';
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(id, updatePayload);
    if (error) return res.status(500).json({ error: error.message });

    const u = data.user;
    return res.status(200).json({
      user: {
        id: u?.id,
        email: u?.email,
        role: (u?.user_metadata as any)?.role || 'DISPO',
        fullName: (u?.user_metadata as any)?.fullName || '',
        birthdate: (u?.user_metadata as any)?.birthdate || '',
        organization: (u?.user_metadata as any)?.organization || '',
        isBanned: !!u?.banned_until,
        lastSignIn: u?.last_sign_in_at,
        createdAt: u?.created_at,
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
