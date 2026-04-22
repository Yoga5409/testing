const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET
);

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // =====================
    // POST: Receive data from userscript
    // =====================
    if (req.method === 'POST') {
        try {
            const { user_id, name, state, destination, until, departed_at, token } = req.body;

            // Simple token validation (anti spam)
            if (token !== process.env.SHARED_TOKEN) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Validate required fields
            if (!user_id || !state) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const { error } = await supabase
                .from('travel_data')
                .upsert({
                    user_id:     String(user_id),
                    name:        name ?? 'Unknown',
                    state:       state,
                    destination: destination ?? '',
                    until:       until ?? 0,
                    departed_at: departed_at ?? 0,
                    updated_at:  Date.now()
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Supabase error:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ ok: true });

        } catch (e) {
            console.error('POST error:', e);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // =====================
    // GET: Fetch traveling data
    // =====================
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('travel_data')
                .select('*')
                // Only fetch data updated within the last 24 hours
                .gte('updated_at', Date.now() - 86400000)
                .order('updated_at', { ascending: false });

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json(data ?? []);

        } catch (e) {
            console.error('GET error:', e);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
