import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentAnalysisRequest {
  userId: string;
  payments: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: 'pending' | 'paid' | 'late' | 'overdue';
    tenantId: string;
  }>;
  tenants: Array<{
    id: string;
    name: string;
    monthlyRent: number;
    paymentHistory: string[];
  }>;
}

interface PaymentAnalysisResponse {
  riskAnalysis: {
    highRiskTenants: string[];
    predictedLatePayments: string[];
    riskScore: number;
  };
  recommendations: string[];
  personalizedMessages: Array<{
    tenantId: string;
    message: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
  insights: {
    totalOverdue: number;
    averageDelayDays: number;
    collectionRate: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { userId, payments, tenants }: PaymentAnalysisRequest = await req.json()

    // Vérifier l'abonnement Premium (simulation)
    // Dans un vrai système, cela ferait appel à la base de données
    const userSubscription = await checkUserSubscription(userId)
    if (userSubscription !== 'premium' && userSubscription !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required for AI features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Préparer le prompt pour OpenAI
    const prompt = `
Tu es un assistant IA spécialisé dans l'analyse des paiements locatifs pour GestionLoc Pro.

Données des paiements:
${JSON.stringify(payments, null, 2)}

Données des locataires:
${JSON.stringify(tenants, null, 2)}

Analyse ces données et fournis:
1. Une analyse des risques (locataires à haut risque, prédictions de retards)
2. Des recommandations d'actions concrètes
3. Des messages personnalisés pour chaque locataire en retard
4. Des insights statistiques

Réponds en JSON avec la structure suivante:
{
  "riskAnalysis": {
    "highRiskTenants": ["id1", "id2"],
    "predictedLatePayments": ["id3"],
    "riskScore": 0-100
  },
  "recommendations": ["action1", "action2"],
  "personalizedMessages": [
    {
      "tenantId": "id",
      "message": "message personnalisé",
      "urgency": "low|medium|high"
    }
  ],
  "insights": {
    "totalOverdue": number,
    "averageDelayDays": number,
    "collectionRate": percentage
  }
}
`

    // Appel à OpenAI
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
            content: 'Tu es un expert en gestion locative et analyse financière. Réponds toujours en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
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
    console.error('Error in payment assistant:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkUserSubscription(userId: string): Promise<string> {
  // Simulation - dans un vrai système, cela interrogerait la base de données
  // pour vérifier l'abonnement de l'utilisateur
  return 'premium'
}