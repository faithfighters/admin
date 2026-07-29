export interface User {
    id: string;
    name: string;
    email: string;
    role: 'member' | 'admin' | 'moderator';
    userType?: 'donor' | 'recipient';
    image?: string;
    plan?: 'faith_fighter' | 'faith_hero' | 'faith_builder';
    votesRemaining?: number;
    votesTotal?: number;
    joinedAt: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    hasSubmittedRequest?: boolean;
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
    createdAt: string;
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
    isFeatured?: boolean;
    isReported?: boolean;
    reportCount?: number;
    reportReasons?: string[];
    votingCycleStartDate?: string;
    votingCycleEndDate?: string;
    voteCount?: number;
    requiredVotes?: number;
    percentFunded?: number;
    isCompleted?: boolean;
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

const _PLAN = { name: 'Faith Fighter', price: 30, votes: 30 } as const;

export const PLAN_CONFIG = {
    faith_fighter: _PLAN,
    faith_builder: _PLAN,
    faith_hero:    _PLAN,
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;
