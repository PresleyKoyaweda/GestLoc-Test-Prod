import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ContractGenerationRequest {
  userId: string;
  propertyInfo: {
    address: string;
    type: 'entire' | 'shared';
    rooms: number;
    area: number;
    furnished: boolean;
    utilities: string[];
    parking: boolean;
    pets: boolean;
  };
  landlordInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  tenantInfo: {
    name: string;
    phone: string;
    email: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  leaseTerms: {
    startDate: string;
    endDate: string;
    monthlyRent: number;
    deposit: number;
    paymentDueDate: number;
    renewalOption: boolean;
    specialClauses?: string[];
  };
}

interface ContractGenerationResponse {
  contract: {
    title: string;
    content: string;
    sections: Array<{
      title: string;
      content: string;
    }>;
  };
  legalCompliance: {
    quebecLaws: boolean;
    requiredClauses: string[];
    optionalClauses: string[];
    warnings: string[];
  };
  signatures: {
    landlordSignature: boolean;
    tenantSignature: boolean;
    witnessRequired: boolean;
  };
  nextSteps: string[];
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

    const { userId, propertyInfo, landlordInfo, tenantInfo, leaseTerms }: ContractGenerationRequest = await req.json()

    // Vérifier l'abonnement Business
    const userSubscription = await checkUserSubscription(userId)
    if (userSubscription !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Business subscription required for AI contract generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `
Tu es un expert juridique spécialisé dans les baux résidentiels au Québec.

Génère un contrat de bail complet et légalement conforme selon:
- Le Code civil du Québec
- La Régie du logement du Québec
- Les dernières modifications législatives

Informations de la propriété:
${JSON.stringify(propertyInfo, null, 2)}

Informations du propriétaire:
${JSON.stringify(landlordInfo, null, 2)}

Informations du locataire:
${JSON.stringify(tenantInfo, null, 2)}

Conditions du bail:
${JSON.stringify(leaseTerms, null, 2)}

Génère un contrat structuré avec:
1. Toutes les clauses obligatoires selon la loi québécoise
2. Les clauses optionnelles appropriées
3. La conformité légale complète
4. Les étapes de signature

Réponds en JSON:
{
  "contract": {
    "title": "titre du contrat",
    "content": "contenu complet du contrat",
    "sections": [
      {
        "title": "titre de section",
        "content": "contenu de la section"
      }
    ]
  },
  "legalCompliance": {
    "quebecLaws": true,
    "requiredClauses": ["clause1", "clause2"],
    "optionalClauses": ["clause1", "clause2"],
    "warnings": ["avertissement1"]
  },
  "signatures": {
    "landlordSignature": true,
    "tenantSignature": true,
    "witnessRequired": false
  },
  "nextSteps": ["étape1", "étape2"]
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
            content: 'Tu es un avocat spécialisé en droit immobilier québécois. Tu connais parfaitement le Code civil du Québec et les règlements de la Régie du logement. Génère des contrats légalement conformes. Réponds en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
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
    console.error('Error in contract generator:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkUserSubscription(userId: string): Promise<string> {
  return 'business'
}