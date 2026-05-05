import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {

    // ─── CORS preflight ────────────────────────────────────────────────────────

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {

        // ─── 1. Verify the requesting user via their JWT ───────────────────────────

        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // user-scoped client — used only to confirm identity
        const userClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await userClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── 2. Admin client — has service role, can delete auth users ────────────

        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // ─── 3. Delete avatar from Storage (if one exists) ────────────────────────

        const { data: profile } = await adminClient
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

        if (profile?.avatar_url) {

            // avatar_url is a full public URL — extract just the storage path after /avatars/
            // e.g. https://xxx.supabase.co/storage/v1/object/public/avatars/user-id/filename.jpg
            // → user-id/filename.jpg
            const url = new URL(profile.avatar_url);
            const pathParts = url.pathname.split('/avatars/');

            if (pathParts.length > 1) {
                const storagePath = pathParts[1];

                const { error: storageError } = await adminClient.storage
                    .from('avatars')
                    .remove([storagePath]);

                if (storageError) {

                    // log but don't block deletion
                    console.error('Avatar delete error:', storageError.message);
                }
            }
        }

        // ─── 4. Delete the auth user — cascades wipe all DB data ──────────────────

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error('Auth user delete error:', deleteError.message);

            return new Response(
                JSON.stringify({ error: 'Failed to delete account. Please try again.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('Unexpected error:', err);

        return new Response(
            JSON.stringify({ error: 'An unexpected error occurred.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});