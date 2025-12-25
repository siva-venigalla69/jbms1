export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}
