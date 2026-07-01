import axiosInstance from './axiosInstance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileResult {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  created_at: string;
}

export interface AddressResult {
  id: number;
  user_id: number;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export interface AddressPayload {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

// ── API functions ─────────────────────────────────────────────────────────────

/** GET /api/profile — returns the authenticated customer's profile */
export async function getProfile(): Promise<ProfileResult> {
  const res = await axiosInstance.get<{ success: boolean; data: ProfileResult }>('/api/profile');
  return res.data.data;
}

/** PUT /api/profile — updates name and/or email */
export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResult> {
  const res = await axiosInstance.put<{ success: boolean; data: ProfileResult }>(
    '/api/profile',
    payload,
  );
  return res.data.data;
}

/** GET /api/profile/addresses — returns all saved addresses */
export async function getAddresses(): Promise<AddressResult[]> {
  const res = await axiosInstance.get<{ success: boolean; data: AddressResult[] }>(
    '/api/profile/addresses',
  );
  return res.data.data;
}

/** POST /api/profile/addresses — add a new address */
export async function addAddress(payload: AddressPayload): Promise<AddressResult> {
  const res = await axiosInstance.post<{ success: boolean; data: AddressResult }>(
    '/api/profile/addresses',
    payload,
  );
  return res.data.data;
}

/** PUT /api/profile/addresses/:id — update an existing address */
export async function updateAddress(
  id: number,
  payload: Partial<AddressPayload>,
): Promise<AddressResult> {
  const res = await axiosInstance.put<{ success: boolean; data: AddressResult }>(
    `/api/profile/addresses/${id}`,
    payload,
  );
  return res.data.data;
}

/** DELETE /api/profile/addresses/:id — delete an address */
export async function deleteAddress(id: number): Promise<void> {
  await axiosInstance.delete(`/api/profile/addresses/${id}`);
}
