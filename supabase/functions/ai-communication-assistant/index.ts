import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CommunicationRequest {
  userId: string;
  type: 'payment_reminder' | 'issue_response' | 'lease_renewal' | 'general';
  context: {
    tenantName: string;
    tenantProfile?: {
      paymentHistory: 'good' | 'average' | 'poor';
      communicationStyle: 'formal' | 'friendly' | 'direct';
      language: 'fr' | 'en';
    };
    situation: string;
    urgency: 'low' | 'medium' | 'high';
    previousMessages?: string[];
  };
  customInstructions?: string;
}

interface CommunicationResponse {
  message: string;
  subject: string;
  tone: string;
  alternatives: string[];
  followUpSuggestions: string[];
  bestTimeToSend: string;
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

    const { userId, type, context, customInstructions }: CommunicationRequest = await req.json()

    // Vérifier l'abonnement Premium
    const userSubscription = await checkUserSubscription(userId)
    if (userSubscription !== 'premium' && userSubscription !== 'business') {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required for AI communication features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `
Tu es un assistant de communication spécialisé dans la gestion locative au Québec.

Type de message: ${type}
Contexte: ${JSON.stringify(context, null, 2)}
Instructions personnalisées: ${customInstructions || 'Aucune'}

Génère un message professionnel et adapté:
1. Respecte le profil du locataire (historique, style de communication)
2. Adapte le ton selon l'urgence et la situation
3. Utilise la langue appropriée (français/anglais)
4. Respecte les lois québécoises sur la location
5. Propose des alternatives de formulation
6. Suggère le meilleur moment pour envoyer

Réponds en JSON:
{
  "message": "message principal",
  "subject": "objet du message",
  "tone": "description du ton utilisé",
  "alternatives": ["alternative1", "alternative2"],
  "followUpSuggestions": ["suggestion1", "suggestion2"],
  "bestTimeToSend": "recommandation de timing"
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
            content: 'Tu es un expert en communication locative au Québec. Tu connais parfaitement les lois sur la location et les meilleures pratiques de communication. Réponds en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500,
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
    console.error('Error in communication assistant:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkUserSubscription(userId: string): Promise<string> {
  return 'premium'
}