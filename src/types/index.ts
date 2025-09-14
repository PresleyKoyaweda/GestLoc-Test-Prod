export type UserRole = 'owner' | 'tenant';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  address?: {
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
  };
  preferences: {
    language: 'fr' | 'en';
    currency: 'CAD' | 'USD' | 'EUR';
    theme: 'light' | 'dark';
    notifications: boolean;
    aiCommunication?: 'email' | 'sms';
  };
}

export type PropertyType = 'entire' | 'shared';
export type PropertyStatus = 'libre' | 'en_attente_validation' | 'occupe';
export type UnitStatus = 'available' | 'occupied' | 'maintenance';
export type RequestStatus = 'en_attente' | 'acceptee' | 'rejetee';

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: {
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;
  };
  type: PropertyType;
  totalRooms?: number; // For entire properties
  totalBathrooms: number;
  totalArea: number;
  description?: string;
  images: string[];
  status: PropertyStatus;
  rent?: number; // For entire properties
  equipment?: string[]; // Equipment available in the property
  commonAreas?: CommonAreas;
  monthlyMortgage?: number; // Hypothèque mensuelle
  monthlyFixedCharges?: number; // Charges fixes mensuelles (taxes, assurance, etc.)
  purchasePrice?: number; // Prix d'achat pour calculs d'amortissement
  purchaseDate?: Date; // Date d'achat
  createdAt: Date;
  updatedAt: Date;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  area: number;
  rent: number;
  status: 'available' | 'occupied' | 'maintenance';
  tenantId?: string;
  availabilitySlots: VisitSlot[]; // Time slots for visits
  equipment?: string[]; // Equipment specific to this unit
  createdAt: Date;
}

export interface VisitSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  available: boolean;
  bookedBy?: string; // tenant ID
  notes?: string;
}

export interface VisitRequest {
  id: string;
  propertyId: string;
  unitId?: string;
  tenantId: string;
  slotId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  tenantInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message?: string;
    communicationPreference?: 'email' | 'sms';
  };
  requestDate: Date;
  visitDate: string;
  visitTime: string;
  ownerNotes?: string;
}
export interface PropertyRequest {
  id: string;
  propertyId?: string;
  unitId?: string;
  tenantId: string;
  status: RequestStatus;
  requestDate: Date;
  responseDate?: Date;
  ownerNotes?: string;
  visitRequestId?: string; // Link to the visit request that enabled this
  tenantInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idDocument?: string;
    message?: string;
    communicationPreference?: 'email' | 'sms';
  };
}

export interface CommonAreas {
  kitchen: boolean;
  fridge: boolean;
  microwave: boolean;
  oven: boolean;
  dishwasher: boolean;
  bathroom: boolean;
  laundry: boolean;
  livingRoom: boolean;
  wifi: boolean;
  parking: boolean;
  balcony: boolean;
  garden: boolean;
  storage: boolean;
}

export interface Tenant {
  id: string;
  userId: string;
  propertyId?: string;
  unitId?: string;
  leaseStart: Date;
  leaseEnd: Date;
  monthlyRent: number;
  depositPaid: number;
  paymentDueDate: number; // Day of month (1-31)
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export type PaymentStatus = 'pending' | 'paid' | 'late' | 'overdue';

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
}

export type ExpenseType = 'maintenance' | 'renovation' | 'utilities' | 'insurance' | 'taxes' | 'other';

export interface Expense {
  id: string;
  ownerId: string;
  propertyId?: string;
  unitId?: string;
  issueId?: string;
  description: string;
  amount: number;
  type: ExpenseType;
  receiptUrl?: string;
  date: Date;
  createdAt: Date;
}

export type IssueStatus = 'pending' | 'in_progress' | 'resolved';
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Issue {
  id: string;
  tenantId: string;
  propertyId?: string;
  unitId?: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  photos: string[];
  createdAt: Date;
  resolvedAt?: Date;
  ownerNotes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'payment_reminder' | 'payment_overdue' | 'issue_reported' | 'issue_resolved' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface TenantHistory {
  id: string;
  tenantId: string;
  type: 'visit_request' | 'property_request' | 'lease_signed' | 'lease_ended' | 'payment' | 'issue_reported' | 'issue_resolved' | 'move_in' | 'move_out';
  title: string;
  description: string;
  propertyId?: string;
  unitId?: string;
  relatedId?: string; // ID of related entity (payment, issue, etc.)
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  type: 'payment' | 'fiscal' | 'communication';
  enabled: boolean;
  config: Record<string, any>;
}

export type SubscriptionPlan = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'pending' | 'suspended' | 'canceled' | 'past_due';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'draft';
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  paidDate?: Date;
  stripeInvoiceId?: string;
  downloadUrl?: string;
  createdAt: Date;
}

export interface PlanFeatures {
  maxProperties: number;
  maxTenants: number;
  aiEnabled: boolean;
  pdfGeneration: boolean;
  multiUser: boolean;
  advancedReports: boolean;
  extendedAI: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, {
  name: string;
  price: number;
  currency: 'CAD';
  interval: 'month';
  features: PlanFeatures;
  description: string;
  popular?: boolean;
}> = {
  free: {
    name: 'Gratuit',
    price: 0,
    currency: 'CAD',
    interval: 'month',
    description: 'Parfait pour débuter',
    features: {
      maxProperties: 1,
      maxTenants: 1,
      aiEnabled: false,
      pdfGeneration: false,
      multiUser: false,
      advancedReports: false,
      extendedAI: false,
      priority: 'low'
    }
  },
  pro: {
    name: 'Pro',
    price: 19,
    currency: 'CAD',
    interval: 'month',
    description: 'Pour les propriétaires actifs',
    popular: true,
    features: {
      maxProperties: 10,
      maxTenants: 50,
      aiEnabled: true,
      pdfGeneration: true,
      multiUser: false,
      advancedReports: false,
      extendedAI: false,
      priority: 'medium'
    }
  },
  business: {
    name: 'Business',
    price: 49,
    currency: 'CAD',
    interval: 'month',
    description: 'Pour les professionnels',
    features: {
      maxProperties: -1, // unlimited
      maxTenants: -1, // unlimited
      aiEnabled: true,
      pdfGeneration: true,
      multiUser: true,
      advancedReports: true,
      extendedAI: true,
      priority: 'high'
    }
  }
};

// Prevent Vite from tree-shaking this module's exports
export const __type_marker = true;