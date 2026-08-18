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
    status: 'pending' | 'approved' | 'rejected' | 'closed';
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
    closureReason?: string;
    moderatedByName?: string;
    moderatedAt?: string;
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

// ── Page Content (CMS) ──
// Mirrors FFFA-Backend-stage/src/site-content/manifests/types.ts — the two
// repos share no package, so this is kept in sync by hand when field types
// change (rare; the shape itself, not per-page manifests, is what's shared).
export type SiteContentFieldType = 'text' | 'textarea' | 'image' | 'video' | 'repeater';

export interface SiteContentBaseFieldDef {
    key: string;
    label: string;
    type: SiteContentFieldType;
    section?: string;
    helpText?: string;
}

export interface SiteContentTextFieldDef extends SiteContentBaseFieldDef {
    type: 'text' | 'textarea';
    defaultValue: string;
    maxLength?: number;
}

export interface SiteContentImageFieldDef extends SiteContentBaseFieldDef {
    type: 'image';
    defaultValue: string;
}

export interface SiteContentVideoFieldDef extends SiteContentBaseFieldDef {
    type: 'video';
    defaultValue: string;
}

export interface SiteContentRepeaterFieldDef extends SiteContentBaseFieldDef {
    type: 'repeater';
    itemLabel: string;
    itemFields: (SiteContentTextFieldDef | SiteContentImageFieldDef | SiteContentVideoFieldDef)[];
    defaultValue: Record<string, any>[];
}

export type SiteContentFieldDef = SiteContentTextFieldDef | SiteContentImageFieldDef | SiteContentVideoFieldDef | SiteContentRepeaterFieldDef;

export interface SiteContentPageManifest {
    page: string;
    label: string;
    fields: SiteContentFieldDef[];
}

const _PLAN = { name: 'Faith Fighter', price: 30, votes: 30 } as const;

export const PLAN_CONFIG = {
    faith_fighter: _PLAN,
    faith_builder: _PLAN,
    faith_hero:    _PLAN,
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;
