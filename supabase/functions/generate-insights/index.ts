import { createClient } from 'jsr:@supabase/supabase-js@2';

interface CheckIn {
    date: string;
    mood: number;
    energy: number;
    stress: number;
    sleep_hours: number;
    sleep_quality: number;
    nutrition_quality: number;
    water_intake_glasses: number;
    notes: string | null;
}

interface ActivityEntry {
    date: string;
    activity_type: string;
    duration_minutes: number;
    perceived_exertion: number;
    notes: string | null;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {

    // handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {

        // ─── Auth Check ──────────────────────────────────────────────────────────

        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Supabase Client ─────────────────────────────────────────────────────

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // ─── Get Current User ────────────────────────────────────────────────────

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Fetch Data ──────────────────────────────────────────────────────────

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const fromDate = fourteenDaysAgo.toISOString().split('T')[0];

        const [profileResult, checkInsResult, activitiesResult] = await Promise.all([
            supabase
                .from('profiles')
                .select('full_name, age, activity_level, health_goals')
                .eq('id', user.id)
                .single(),
            supabase
                .from('daily_checkins')
                .select('date, mood, energy, stress, sleep_hours, sleep_quality, nutrition_quality, water_intake_glasses, notes')
                .eq('user_id', user.id)
                .gte('date', fromDate)
                .order('date', { ascending: true }),
            supabase
                .from('activity_logs')
                .select('date, activity_type, duration_minutes, perceived_exertion, notes')
                .eq('user_id', user.id)
                .gte('date', fromDate)
                .order('date', { ascending: true }),
        ]);

        const profile = profileResult.data;
        const checkIns = checkInsResult.data ?? [];
        const activities = activitiesResult.data ?? [];

        // need at least 3 check-ins to generate meaningful insights
        if (checkIns.length < 3) {
            return new Response(
                JSON.stringify({ message: 'Not enough data yet', insights: [] }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Build Prompt ────────────────────────────────────────────────────────

        const prompt = `You are a recovery and wellness analyst specialising in active adults aged 50 and over. 
    
            Your job is to analyse the following health tracking data and identify genuinely meaningful patterns. Be specific — reference actual numbers and dates from the data. Avoid generic advice.

            USER PROFILE:
            - Name: ${profile?.full_name}
            - Age: ${profile?.age}
            - Activity Level: ${profile?.activity_level}
            - Health Goals: ${profile?.health_goals?.join(', ')}

            DAILY CHECK-INS (last 14 days, scale 1-5 where applicable):
            ${(checkIns as CheckIn[]).map((c: CheckIn) =>
                `${c.date}: mood=${c.mood}, energy=${c.energy}, stress=${c.stress}, sleep_hours=${c.sleep_hours}, sleep_quality=${c.sleep_quality}, nutrition=${c.nutrition_quality}, water=${c.water_intake_glasses} glasses${c.notes ? `, notes: ${c.notes}` : ''}`
            ).join('\n')}

            ACTIVITY LOGS (last 14 days):
            ${activities.length > 0 
              ? (activities as ActivityEntry[]).map((a: ActivityEntry) =>
                    `${a.date}: ${a.activity_type}, ${a.duration_minutes} minutes, exertion=${a.perceived_exertion}/5${a.notes ? `, notes: ${a.notes}` : ''}`
                ).join('\n')
              : 'No activities logged in this period.'
            }

            STRESS SCALE NOTE: For stress, 1=calm and 5=overwhelmed (inverted from other metrics).

            Analyse this data and identify 1 to 3 of the most meaningful patterns. Focus on:
            - Trends (things improving or declining over time)
            - Correlations (relationships between different metrics)
            - Anomalies (unusual readings compared to the person's baseline)
            - Predictions (where current patterns may lead if unchanged)

            Only report patterns that are clearly supported by the data. If the data is too limited or inconsistent to draw a conclusion, say so rather than speculating.

            Respond ONLY with a valid JSON object in exactly this format, no preamble, no markdown:
            {
            "insights": [
                {
                "insight_type": "trend|correlation|anomaly|prediction",
                "title": "A short 5-8 word title summarising the insight",
                "content": "Your full insight here, referencing actual data points."
                }
            ]
            }`;

        // ─── Call Anthropic API ──────────────────────────────────────────────────

        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!anthropicResponse.ok) {
            const error = await anthropicResponse.text();
            throw new Error(`Anthropic API error: ${error}`);
        }

        const anthropicData = await anthropicResponse.json();
        const rawContent = anthropicData.content[0]?.text ?? '{}';

        // ─── Parse Response ──────────────────────────────────────────────────────

        let parsed: { insights: { insight_type: string; content: string }[] };

        try {
            parsed = JSON.parse(rawContent);
        } catch {
            throw new Error(`Failed to parse Claude response: ${rawContent}`);
        }

        if (!parsed.insights || parsed.insights.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No patterns found yet', insights: [] }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ─── Save Insights to Supabase ───────────────────────────────────────────
        
        const today = new Date().toISOString().split('T')[0];
        const fourteenDaysAgoStr = fromDate;

        const insightsToInsert = parsed.insights.map(insight => ({
            user_id: user.id,
            insight_type: insight.insight_type,
            title: insight.title ?? null,
            content: insight.content,
            data_range_start: fourteenDaysAgoStr,
            data_range_end: today,
        }));

        const { error: insertError } = await supabase
            .from('ai_insights')
            .insert(insightsToInsert);

        if (insertError) {
            throw new Error(`Failed to save insights: ${insertError.message}`);
        }

        // ─── Return Success ──────────────────────────────────────────────────────

        return new Response(
            JSON.stringify({ insights: parsed.insights }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});