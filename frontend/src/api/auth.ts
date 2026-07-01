import axiosInstance from './axiosInstance';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface MessageResponse {
  success: boolean;
  data: {
    message: string;
  };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  password: string;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await axiosInstance.post<AuthResponse>('/api/auth/register', payload);
  return res.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await axiosInstance.post<AuthResponse>('/api/auth/login', payload);
  return res.data;
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<MessageResponse> {
  const res = await axiosInstance.post<MessageResponse>('/api/auth/forgot-password', payload);
  return res.data;
}

export async function resetPassword(
  token: string,
  payload: ResetPasswordPayload
): Promise<MessageResponse> {
  const res = await axiosInstance.post<MessageResponse>(
    `/api/auth/reset-password/${token}`,
    payload
  );
  return res.data;
}
