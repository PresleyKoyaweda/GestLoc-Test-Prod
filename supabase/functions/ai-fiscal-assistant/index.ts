import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FiscalAnalysisRequest {
  userId: string;
  year: number;
  properties: Array<{
    id: string;
    name: string;
    address: string;
    purchasePrice?: number;
    purchaseDate?: string;
  }>;
  revenues: Array<{
    amount: number;
    date: string;
    propertyId: string;
    type: 'rent' | 'deposit' | 'other';
  }>;
  expenses: Array<{
    amount: number;
    date: string;
    propertyId: string;
    type: 'maintenance' | 'renovation' | 'utilities' | 'insurance' | 'taxes' | 'other';
    description: string;
  }>;
}

interface FiscalAnalysisResponse {
  netIncome: number;
  totalRevenues: number;
  totalExpenses: number;
  deductions: {
    depreciation: number;
    maintenance: number;
    utilities: number;
    insurance: number;
    taxes: number;
    other: number;
  };
  taxOptimization: string[];
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
  recommendations: string[];
  exportData: {
    t4Summary: any;
    accountingEntries: any[];
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

    const { userId, year, properties, revenues, expenses }: FiscalAnalysisRequest = await req.json()

    // Vérifier l'abonnement Premium
    const userSubscription = await checkUserSubscription(userId)
    if (userSubscription !== 'premium' && userSubscription !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required for AI fiscal features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `
Tu es un assistant fiscal spécialisé dans l'immobilier locatif au Canada/Québec.

Données fiscales pour l'année ${year}:

Propriétés:
${JSON.stringify(properties, null, 2)}

Revenus:
${JSON.stringify(revenues, null, 2)}

Dépenses:
${JSON.stringify(expenses, null, 2)}

Calcule et analyse:
1. Le bénéfice net imposable
2. Les déductions fiscales optimisées selon la législation canadienne
3. La répartition mensuelle des revenus/dépenses
4. Des recommandations d'optimisation fiscale
5. Les données pour le formulaire T4 (si applicable)

Réponds en JSON avec la structure suivante:
{
  "netIncome": number,
  "totalRevenues": number,
  "totalExpenses": number,
  "deductions": {
    "depreciation": number,
    "maintenance": number,
    "utilities": number,
    "insurance": number,
    "taxes": number,
    "other": number
  },
  "taxOptimization": ["conseil1", "conseil2"],
  "monthlyBreakdown": [
    {
      "month": "2024-01",
      "revenue": number,
      "expenses": number,
      "netIncome": number
    }
  ],
  "recommendations": ["recommandation1"],
  "exportData": {
    "t4Summary": {},
    "accountingEntries": []
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
            content: 'Tu es un expert comptable spécialisé en immobilier locatif au Canada. Connais parfaitement la fiscalité canadienne et québécoise. Réponds en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
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
    console.error('Error in fiscal assistant:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkUserSubscription(userId: string): Promise<string> {
  return 'premium'
}