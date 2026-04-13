import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { user_id } = await req.json();

        if (!user_id) {
            return new Response(
                JSON.stringify({ error: 'user_id is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ─── Date Range ───────────────────────────────────────────────────────────

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const fourteenDaysAgo = new Date(today);

        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const fromDate = fourteenDaysAgo.toISOString().split('T')[0];

        // ─── Fetch All Data In Parallel ───────────────────────────────────────────

        const [
            profileResult,
            checkInsResult,
            activityLogsResult,
            healthMetricsResult,
        ] = await Promise.all([
            supabase
                .from('profiles')
                .select('full_name, age, activity_level, health_goals')
                .eq('id', user_id)
                .single(),

            supabase
                .from('daily_checkins')
                .select('date, mood, energy, stress, sleep_quality, sleep_hours, nutrition_quality, water_intake_glasses, notes')
                .eq('user_id', user_id)
                .gte('date', fromDate)
                .order('date', { ascending: true }),

            supabase
                .from('activity_logs')
                .select('date, activity_type, duration_minutes, perceived_exertion, source')
                .eq('user_id', user_id)
                .gte('date', fromDate)
                .order('date', { ascending: true }),

            supabase
                .from('health_metrics')
                .select('date, avg_heart_rate, min_heart_rate, max_heart_rate, resting_heart_rate, hrv, step_count, weight_kg, source')
                .eq('user_id', user_id)
                .gte('date', fromDate)
                .order('date', { ascending: true }),
        ]);

        const profile = profileResult.data;
        const checkIns = checkInsResult.data ?? [];
        const activityLogs = activityLogsResult.data ?? [];
        const healthMetrics = healthMetricsResult.data ?? [];

        if (checkIns.length < 1) {
            return new Response(
                JSON.stringify({ error: 'Not enough check-in data' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ─── Format Data For Prompt ───────────────────────────────────────────────

        const formatMood = (val: number): string => {
            const labels: Record<number, string> = {
                1: 'Low 😞',
                2: 'Meh 😕',
                3: 'OK 😐',
                4: 'Good 😊',
                5: 'Great 😄',
            };

            return labels[val] ?? String(val);
        };
          
        const formatEnergy = (val: number): string => {
            const labels: Record<number, string> = {
                1: 'Drained 🪫',
                2: 'Tired 😪',
                3: 'OK 😐',
                4: 'Energised ⚡',
                5: 'Fired up 🔥',
            };

            return labels[val] ?? String(val);
        };
          
        const formatStress = (val: number): string => {
            const labels: Record<number, string> = {
                1: 'Calm 😌',
                2: 'Mild 🙂',
                3: 'Moderate 😤',
                4: 'High 😰',
                5: 'Overwhelmed 🤯',
            };

            return labels[val] ?? String(val);
        };
          
        const formatSleepQuality = (val: number): string => {
            const labels: Record<number, string> = {
                1: 'Terrible 😫',
                2: 'Poor 😔',
                3: 'OK 😐',
                4: 'Good 😊',
                5: 'Great 😴',
            };

            return labels[val] ?? String(val);
        };
          
        const formatNutrition = (val: number): string => {
            const labels: Record<number, string> = {
                1: 'Poor 🍟',
                2: 'Fair 🥪',
                3: 'OK 🍽️',
                4: 'Good 🥗',
                5: 'Excellent 🌱',
            };

            return labels[val] ?? String(val);
        };
          
        const formatExertion = (val: number): string => {
            const labels: Record<number, string> = {
                1: 'Easy 🌿',
                2: 'Light 😊',
                3: 'Moderate 😤',
                4: 'Hard 🔥',
                5: 'Maximum 💀',
            };

            return labels[val] ?? String(val);
        };

        const checkInsFormatted = checkIns.map(c =>
            `${c.date}: mood=${formatMood(c.mood)}, energy=${formatEnergy(c.energy)}, ` +
            `stress=${formatStress(c.stress)}, sleep_quality=${formatSleepQuality(c.sleep_quality)}, ` +
            `sleep_hours=${c.sleep_hours}h, nutrition=${formatNutrition(c.nutrition_quality)}, ` +
            `water=${c.water_intake_glasses} glasses${c.notes ? `, notes="${c.notes}"` : ''}`
        ).join('\n');

        const activitiesFormatted = activityLogs.length > 0
            ? activityLogs.map(a =>
                    `${a.date}: ${a.activity_type}, ${a.duration_minutes} min, ` +
                    `effort=${formatExertion(a.perceived_exertion)}, source=${a.source}`
                ).join('\n')
            : 'No activities logged in this period';

        const healthMetricsFormatted = healthMetrics.length > 0
            ? healthMetrics.map(m => {
                    const parts = [`${m.date}:`];

                    if (m.avg_heart_rate) parts.push(`avg_hr=${m.avg_heart_rate}bpm`);
                    if (m.min_heart_rate) parts.push(`min_hr=${m.min_heart_rate}bpm`);
                    if (m.max_heart_rate) parts.push(`max_hr=${m.max_heart_rate}bpm`);
                    if (m.resting_heart_rate) parts.push(`resting_hr=${m.resting_heart_rate}bpm`);
                    if (m.hrv) parts.push(`hrv=${m.hrv}ms`);
                    if (m.step_count) parts.push(`steps=${m.step_count}`);
                    if (m.weight_kg) parts.push(`weight=${m.weight_kg}kg`);

                    return parts.join(' ');
                }).join('\n')
            : 'No wearable health metrics available';

        const goalsFormatted = Array.isArray(profile?.health_goals) && profile.health_goals.length > 0
            ? profile.health_goals.join(', ')
            : 'General wellness and recovery';

        // ─── Build Prompt ─────────────────────────────────────────────────────────

        const prompt = `You are a personal wellness coach analysing health data for an active adult aged ${profile?.age ?? 40}+. 
            Their activity level is ${profile?.activity_level ?? 'moderate'} and their health goals are: ${goalsFormatted}.

            Analyse the following 14 days of data and generate exactly 3 personalised wellness insights. Each insight must be specific, actionable and reference actual patterns you observe in the data.

            DAILY CHECK-INS (mood, energy, stress, sleep quality 1-5 scale where 5=excellent):
            ${checkInsFormatted}

            ACTIVITY LOGS:
            ${activitiesFormatted}

            WEARABLE HEALTH METRICS (from connected device):
            ${healthMetricsFormatted}

            Generate exactly 3 insights in this JSON format. Do not include any text outside the JSON:
            {
            "insights": [
                {
                "insight_type": "recovery|sleep|activity|nutrition|stress|heart_rate|steps|weight|pattern",
                "title": "Short compelling title (max 8 words)",
                "content": "Detailed insight referencing specific data points and dates. Include a concrete recommendation. (2-4 sentences)"
                }
            ]
            }

            Rules for good insights:
            - Reference specific dates, numbers or trends from the data
            - Connect patterns across different data types (e.g. sleep affecting energy, steps correlating with mood)
            - Be encouraging but honest
            - Give one clear actionable recommendation per insight
            - Prioritise insights that reference wearable data when available
            - Focus on patterns over the full 14 days not just recent days`;

        // ─── Call Claude ──────────────────────────────────────────────────────────

        const callClaudeWithRetry = async (prompt: string, maxRetries = 3): Promise<string> => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const message = await anthropic.messages.create({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 1024,
                        messages: [{ role: 'user', content: prompt }],
                    });

                    return message.content[0].type === 'text' ? message.content[0].text : '';
                } catch (err: any) {
                    const isOverloaded = err?.status === 529 || err?.type === 'overloaded_error';
                    const isLastAttempt = attempt === maxRetries;
                
                    if (isOverloaded && !isLastAttempt) {

                        // wait before retrying — exponential backoff
                        const waitMs = attempt * 2000;

                        console.log(`Claude overloaded, retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})`);

                        await new Promise(resolve => setTimeout(resolve, waitMs));

                        continue;
                    }

                    throw err;
                }
            }

            return '';
        };

        const responseText = await callClaudeWithRetry(prompt);

        // ─── Parse Response ───────────────────────────────────────────────────────

        let parsedInsights;

        try {
            const cleaned = responseText.replace(/```json|```/g, '').trim();

            parsedInsights = JSON.parse(cleaned);
        } catch {
            console.error('Failed to parse insights JSON:', responseText);

            return new Response(
                JSON.stringify({ error: 'Failed to parse AI response' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // ─── Save Insights ────────────────────────────────────────────────────────

        const insightsToInsert = parsedInsights.insights.map((insight: any) => ({
            user_id,
            insight_type: insight.insight_type,
            title: insight.title,
            content: insight.content,
            data_range_start: fromDate,
            data_range_end: todayStr,
            created_at: new Date().toISOString(),
        }));

        await supabase
            .from('ai_insights')
            .insert(insightsToInsert);

        return new Response(
            JSON.stringify({ insights: parsedInsights.insights }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('Edge Function error:', err);

        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});