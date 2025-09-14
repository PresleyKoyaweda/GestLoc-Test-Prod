import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MonthlySummaryRequest {
  userId: string;
  month: string; // YYYY-MM format
  data: {
    properties: any[];
    tenants: any[];
    payments: any[];
    expenses: any[];
    issues: any[];
    visits: any[];
  };
}

interface MonthlySummaryResponse {
  summary: {
    period: string;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    occupancyRate: number;
  };
  insights: {
    paymentTrends: string[];
    maintenanceAlerts: string[];
    tenantSatisfaction: string;
    marketComparison: string;
  };
  predictions: {
    nextMonthRevenue: number;
    potentialIssues: string[];
    recommendations: string[];
  };
  achievements: {
    milestones: string[];
    improvements: string[];
  };
  actionItems: {
    urgent: string[];
    thisWeek: string[];
    thisMonth: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { userId, month, data }: MonthlySummaryRequest = await req.json()

    // Vérifier l'abonnement Premium
    const userSubscription = await checkUserSubscription(userId)
    if (userSubscription !== 'premium' && userSubscription !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required for AI monthly summaries' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `
Tu es un analyste immobilier expert qui génère des résumés mensuels intelligents.

Période d'analyse: ${month}

Données du mois:
${JSON.stringify(data, null, 2)}

Génère un résumé mensuel complet avec:
1. Résumé financier (revenus, dépenses, bénéfice net)
2. Insights sur les tendances et performances
3. Prédictions pour le mois suivant
4. Réalisations et améliorations du mois
5. Actions prioritaires à entreprendre

Sois précis, actionnable et positif dans tes recommandations.

Réponds en JSON:
{
  "summary": {
    "period": "mois analysé",
    "totalRevenue": number,
    "totalExpenses": number,
    "netIncome": number,
    "occupancyRate": number
  },
  "insights": {
    "paymentTrends": ["tendance1", "tendance2"],
    "maintenanceAlerts": ["alerte1", "alerte2"],
    "tenantSatisfaction": "évaluation globale",
    "marketComparison": "comparaison avec le marché"
  },
  "predictions": {
    "nextMonthRevenue": number,
    "potentialIssues": ["problème potentiel1"],
    "recommendations": ["recommandation1"]
  },
  "achievements": {
    "milestones": ["réalisation1"],
    "improvements": ["amélioration1"]
  },
  "actionItems": {
    "urgent": ["action urgente1"],
    "thisWeek": ["action cette semaine1"],
    "thisMonth": ["action ce mois1"]
  }
}
`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Tu es un analyste immobilier expert qui aide les propriétaires à optimiser leur portefeuille. Tu fournis des insights précis et des recommandations actionnables. Réponds en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = JSON.parse(openaiData.choices[0].message.content)

    return new Response(
      JSON.stringify(aiResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in monthly summary:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkUserSubscription(userId: string): Promise<string> {
  return 'premium'
}