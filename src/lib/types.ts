export interface User {
    id: string;
    name: string;
    email: string;
    role: 'member' | 'admin';
    plan?: 'basic' | 'standard' | 'premium';
    votesRemaining?: number;
    votesTotal?: number;
    joinedAt: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
}

export interface Cause {
    id: string;
    name: string;
    description: string;
    category: string;
    totalVotes: number;
    goalAmount: number;
    raisedAmount: number;
    image?: string;
    status: 'active' | 'funded' | 'closed';
    createdAt: string;
}

export interface Video {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
    authorId: string;
    authorName: string;
    causeTag: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    beneficiaryName?: string;
    urgencyReason?: string;
    targetAmount?: number;
    billPayStatus?: 'pending' | 'paid';
    submitterPhone?: string;
    submitterEmail?: string;
    paymentDestination?: {
        type: 'hospital' | 'utility' | 'rent' | 'other';
        institutionName?: string;
        address?: string;
        phone?: string;
        accountNumber?: string;
    };
}

export interface VotingCycle {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'closed' | 'upcoming';
    causes: string[];
}

export interface Vote {
    id: string;
    userId: string;
    causeId: string;
    cycleId: string;
    count: number;
    createdAt: string;
}

export interface Subscription {
    id: string;
    userId: string;
    plan: 'basic' | 'standard' | 'premium';
    amount: number;
    status: 'active' | 'cancelled' | 'past_due';
    startDate: string;
    nextBillingDate: string;
    stripeSubscriptionId?: string;
}

export interface Payout {
    id: string;
    causeId: string;
    causeName: string;
    amount: number;
    paymentMethod: 'ach' | 'check' | 'paypal';
    status: 'pending' | 'processing' | 'paid';
    cycleId: string;
    createdAt: string;
    processedAt?: string;
}

export const PLAN_CONFIG = {
    basic: {
        name: 'Basic',
        price: 39.95,
        votes: 2,
        features: [
            'Full platform access',
            '2 donation votes per cycle',
            'Live-streamed acts of kindness',
            'Impact reports access',
            'Profile badge',
            '5% merchandise discount',
            'Community updates & exclusive newsletters',
        ],
    },
    standard: {
        name: 'Standard',
        price: 59.95,
        votes: 4,
        features: [
            'All Basic benefits',
            '4 donation votes per cycle',
            'Priority town hall access',
            'Behind-the-scenes content previews',
            '10% merchandise discount',
            'Annual digital recognition certificate',
        ],
    },
    premium: {
        name: 'Premium',
        price: 79.95,
        votes: 6,
        features: [
            'All Standard benefits',
            '6 donation votes per cycle',
            'Propose local initiatives',
            'Quarterly Freedom Roundtable livestreams',
            '15% merchandise discount',
            'Exclusive annual merchandise item',
            'Personalized thank-you video from leadership',
        ],
    },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;
