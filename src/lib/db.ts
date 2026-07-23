import fs from 'fs';
import path from 'path';
import { User, Cause, Video, VotingCycle, Vote, Subscription, Payout } from './types';

// File-based database — easily replaceable with PostgreSQL/MySQL
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface StoredUser extends User {
    passwordHash: string;
}

interface Database {
    users: StoredUser[];
    causes: Cause[];
    videos: Video[];
    votingCycles: VotingCycle[];
    votes: Vote[];
    subscriptions: Subscription[];
    payouts: Payout[];
}

function readDb(): Database {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return {
            users: [],
            causes: [],
            videos: [],
            votingCycles: [],
            votes: [],
            subscriptions: [],
            payouts: [],
        };
    }
}

function writeDb(data: Database): void {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== USERS =====

export function getUserByEmail(email: string): StoredUser | null {
    const db = readDb();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getUserById(id: string): StoredUser | null {
    const db = readDb();
    return db.users.find((u) => u.id === id) ?? null;
}

export function createUser(user: StoredUser): StoredUser {
    const db = readDb();
    db.users.push(user);
    writeDb(db);
    return user;
}

export function updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const db = readDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    writeDb(db);
    return db.users[idx];
}

export function getAllUsers(): StoredUser[] {
    return readDb().users;
}

// ===== CAUSES =====

export function getAllCauses(): Cause[] {
    return readDb().causes;
}

export function getCauseById(id: string): Cause | null {
    return readDb().causes.find((c) => c.id === id) ?? null;
}

export function createCause(cause: Cause): Cause {
    const db = readDb();
    db.causes.push(cause);
    writeDb(db);
    return cause;
}

export function updateCause(id: string, updates: Partial<Cause>): Cause | null {
    const db = readDb();
    const idx = db.causes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    db.causes[idx] = { ...db.causes[idx], ...updates };
    writeDb(db);
    return db.causes[idx];
}

// ===== VIDEOS =====

export function getAllVideos(): Video[] {
    return readDb().videos;
}

export function getVideoById(id: string): Video | null {
    return readDb().videos.find((v) => v.id === id) ?? null;
}

export function createVideo(video: Video): Video {
    const db = readDb();
    db.videos.push(video);
    writeDb(db);
    return video;
}

export function updateVideo(id: string, updates: Partial<Video>): Video | null {
    const db = readDb();
    const idx = db.videos.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    db.videos[idx] = { ...db.videos[idx], ...updates };
    writeDb(db);
    return db.videos[idx];
}

// ===== VOTING CYCLES =====

export function getAllCycles(): VotingCycle[] {
    return readDb().votingCycles;
}

export function getActiveCycle(): VotingCycle | null {
    return readDb().votingCycles.find((c) => c.status === 'active') ?? null;
}

export function getCycleById(id: string): VotingCycle | null {
    return readDb().votingCycles.find((c) => c.id === id) ?? null;
}

export function createCycle(cycle: VotingCycle): VotingCycle {
    const db = readDb();
    db.votingCycles.push(cycle);
    writeDb(db);
    return cycle;
}

export function updateCycle(id: string, updates: Partial<VotingCycle>): VotingCycle | null {
    const db = readDb();
    const idx = db.votingCycles.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    db.votingCycles[idx] = { ...db.votingCycles[idx], ...updates };
    writeDb(db);
    return db.votingCycles[idx];
}

// ===== VOTES =====

export function getVotesByUser(userId: string, cycleId?: string): Vote[] {
    const db = readDb();
    return db.votes.filter((v) => v.userId === userId && (!cycleId || v.cycleId === cycleId));
}

export function getVotesByCycle(cycleId: string): Vote[] {
    return readDb().votes.filter((v) => v.cycleId === cycleId);
}

export function createVotes(votes: Vote[]): Vote[] {
    const db = readDb();
    db.votes.push(...votes);
    writeDb(db);
    return votes;
}

export function deleteVotesByUserCycle(userId: string, cycleId: string): void {
    const db = readDb();
    db.votes = db.votes.filter((v) => !(v.userId === userId && v.cycleId === cycleId));
    writeDb(db);
}

// ===== SUBSCRIPTIONS =====

export function getSubscriptionByUser(userId: string): Subscription | null {
    const db = readDb();
    return db.subscriptions.find((s) => s.userId === userId && s.status === 'active') ?? null;
}

export function createSubscription(sub: Subscription): Subscription {
    const db = readDb();
    db.subscriptions.push(sub);
    writeDb(db);
    return sub;
}

export function updateSubscription(id: string, updates: Partial<Subscription>): Subscription | null {
    const db = readDb();
    const idx = db.subscriptions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    db.subscriptions[idx] = { ...db.subscriptions[idx], ...updates };
    writeDb(db);
    return db.subscriptions[idx];
}

export function getAllSubscriptions(): Subscription[] {
    return readDb().subscriptions;
}

// ===== PAYOUTS =====

export function getAllPayouts(): Payout[] {
    return readDb().payouts;
}

export function getPayoutById(id: string): Payout | null {
    return readDb().payouts.find((p) => p.id === id) ?? null;
}

export function createPayout(payout: Payout): Payout {
    const db = readDb();
    db.payouts.push(payout);
    writeDb(db);
    return payout;
}

export function updatePayout(id: string, updates: Partial<Payout>): Payout | null {
    const db = readDb();
    const idx = db.payouts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    db.payouts[idx] = { ...db.payouts[idx], ...updates };
    writeDb(db);
    return db.payouts[idx];
}
