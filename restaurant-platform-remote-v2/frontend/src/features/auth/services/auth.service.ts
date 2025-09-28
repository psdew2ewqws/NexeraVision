// DISABLED: This auth service has outdated dependencies and is not currently used
// The actual auth is handled by the AuthContext in src/contexts/AuthContext.tsx

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  branchId?: string;
  company?: any;
  branch?: any;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// This service is currently disabled - use AuthContext instead
export class AuthService {
  // Placeholder implementation
}