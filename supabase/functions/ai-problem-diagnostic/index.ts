import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ProblemDiagnosticRequest {
  userId: string;
  issue: {
    title: string;
    description: string;
    photos?: string[]; // Base64 encoded images
    location: string;
    urgency: 'low' | 'medium' | 'high' | 'urgent';
  };
  propertyInfo: {
    type: string;
    age: number;
    lastMaintenance?: string;
  };
}

interface ProblemDiagnosticResponse {
  diagnosis: {
    problemType: string;
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    urgency: 'low' | 'medium' | 'high' | 'urgent';
    estimatedCost: {
      min: number;
      max: number;
      currency: 'CAD';
    };
  };
  recommendations: {
    immediateActions: string[];
    professionalRequired: boolean;
    professionalType?: string;
    preventiveMeasures: string[];
  };
  timeline: {
    responseTime: string;
    estimatedRepairTime: string;
    followUpRequired: boolean;
  };
  riskAssessment: {
    tenantSafety: 'low' | 'medium' | 'high';
    propertyDamage: 'low' | 'medium' | 'high';
    legalCompliance: 'compliant' | 'attention_needed' | 'urgent_action';
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

    const { userId, issue, propertyInfo }: ProblemDiagnosticRequest = await req.json()

    // Vérifier l'abonnement Business (fonctionnalité avancée)
    const userSubscription = await checkUserSubscription(userId)
    if (userSubscription !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Business subscription required for AI diagnostic features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `
Tu es un expert en diagnostic de problèmes immobiliers et maintenance préventive.

Problème signalé:
${JSON.stringify(issue, null, 2)}

Informations sur la propriété:
${JSON.stringify(propertyInfo, null, 2)}

Analyse ce problème et fournis:
1. Un diagnostic précis du type de problème et sa gravité
2. Une estimation des coûts de réparation au Québec
3. Des recommandations d'actions immédiates
4. L'évaluation du besoin d'un professionnel
5. Une évaluation des risques (sécurité, dommages, légal)
6. Un calendrier d'intervention recommandé

Réponds en JSON:
{
  "diagnosis": {
    "problemType": "type de problème",
    "severity": "minor|moderate|major|critical",
    "urgency": "low|medium|high|urgent",
    "estimatedCost": {
      "min": number,
      "max": number,
      "currency": "CAD"
    }
  },
  "recommendations": {
    "immediateActions": ["action1", "action2"],
    "professionalRequired": boolean,
    "professionalType": "type de professionnel si nécessaire",
    "preventiveMeasures": ["mesure1", "mesure2"]
  },
  "timeline": {
    "responseTime": "délai de réponse recommandé",
    "estimatedRepairTime": "durée estimée des travaux",
    "followUpRequired": boolean
  },
  "riskAssessment": {
    "tenantSafety": "low|medium|high",
    "propertyDamage": "low|medium|high",
    "legalCompliance": "compliant|attention_needed|urgent_action"
  }
}
`

    const messages = [
      {
        role: 'system',
        content: 'Tu es un expert en maintenance immobilière au Québec. Tu connais les codes du bâtiment, les prix du marché et les réglementations locales. Réponds en JSON valide.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    // Si des photos sont fournies, utiliser GPT-4 Vision
    const model = issue.photos && issue.photos.length > 0 ? 'gpt-4-vision-preview' : 'gpt-4'
    
    if (issue.photos && issue.photos.length > 0) {
      // Ajouter les images au message pour l'analyse visuelle
      messages[1].content = [
        { type: 'text', text: prompt },
        ...issue.photos.map(photo => ({
          type: 'image_url',
          image_url: { url: photo }
        }))
      ]
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 2500,
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
    console.error('Error in problem diagnostic:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkUserSubscription(userId: string): Promise<string> {
  return 'business'
}