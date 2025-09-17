export interface Cliente {
    _id?: string;
    code: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    telephone?: string;
    status?: string;
    birthDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ApiResponse<T> {
    data: T;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface ApiError {
    error: string;
    message?: string;
    details?: Array<{
        field: string;
        message: string;
    }>;
}
