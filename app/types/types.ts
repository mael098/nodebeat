export type User = {
    id: number;
    email: string;
    isAdmin: boolean;
    userAccess?: {
        daysAllowed: number;
        expiresAt: string;
        downloadEnabled: boolean;
    } | null;
    createdAt: string;
};

export type Payment = {
    id: number;
    userId: number;
    amount: number;
    currency: string;
    note?: string;
    status: string;
    createdAt: string;
    user: {
        id: number;
        email: string;
        subscriptionStatus: string;
        subscriptionEndsAt?: string;
    };
};

export type Tab = "users" | "payments";