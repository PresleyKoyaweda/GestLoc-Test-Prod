const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

class AIService {
  private async makeRequest(endpoint: string, data: any, userId: string) {
    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration required for AI services');
    }

    // Get user's auth token for the request
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User must be authenticated to use AI services');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI service error');
    }

    return response.json();
  }

  async analyzePayments(userId: string, payments: any[], tenants: any[]) {
    return this.makeRequest('ai-payment-assistant', {
      userId,
      payments,
      tenants,
    }, userId);
  }

  async generateFiscalReport(userId: string, year: number, properties: any[], revenues: any[], expenses: any[]) {
    return this.makeRequest('ai-fiscal-assistant', {
      userId,
      year,
      properties,
      revenues,
      expenses,
    }, userId);
  }

  async generateCommunication(userId: string, type: string, context: any, customInstructions?: string) {
    return this.makeRequest('ai-communication-assistant', {
      userId,
      type,
      context,
      customInstructions,
    }, userId);
  }

  async diagnoseProblem(userId: string, issue: any, propertyInfo: any) {
    return this.makeRequest('ai-problem-diagnostic', {
      userId,
      issue,
      propertyInfo,
    }, userId);
  }

  async generateContract(userId: string, propertyInfo: any, landlordInfo: any, tenantInfo: any, leaseTerms: any) {
    return this.makeRequest('ai-contract-generator', {
      userId,
      propertyInfo,
      landlordInfo,
      tenantInfo,
      leaseTerms,
    }, userId);
  }

  async generateMonthlySummary(userId: string, month: string, data: any) {
    return this.makeRequest('ai-monthly-summary', {
      userId,
      month,
      data,
    }, userId);
  }
}

export const aiService = new AIService();