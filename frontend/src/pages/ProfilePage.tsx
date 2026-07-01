import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  type ProfileResult,
  type AddressResult,
  type AddressPayload,
} from '../api/profile';

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex justify-center items-center py-16" aria-label={label}>
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
    >
      <svg
        className="w-4 h-4 mt-0.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {message}
    </div>
  );
}

// ── Success banner ────────────────────────────────────────────────────────────

function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-start gap-2"
    >
      <svg
        className="w-4 h-4 mt-0.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {message}
    </div>
  );
}

// ── Address form ──────────────────────────────────────────────────────────────

interface AddressFormData {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const EMPTY_ADDRESS_FORM: AddressFormData = {
  street: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  is_default: false,
};

interface AddressFormProps {
  initial?: AddressFormData;
  saving: boolean;
  onSave: (data: AddressFormData) => void;
  onCancel: () => void;
}

function AddressForm({ initial = EMPTY_ADDRESS_FORM, saving, onSave, onCancel }: AddressFormProps) {
  const [form, setForm] = useState<AddressFormData>(initial);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof AddressFormData, string>> = {};
    if (!form.street.trim()) errors.street = 'Street is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.state.trim()) errors.state = 'State is required';
    if (!form.postal_code.trim()) errors.postal_code = 'Postal code is required';
    if (!form.country.trim()) errors.country = 'Country is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSave(form);
  }

  const inputClass =
    'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400';
  const errorClass = 'mt-1 text-xs text-red-600';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label="Address form">
      {/* Street */}
      <div>
        <label htmlFor="addr-street" className="block text-sm font-medium text-gray-700 mb-1">
          Street <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="addr-street"
          type="text"
          name="street"
          value={form.street}
          onChange={handleChange}
          disabled={saving}
          placeholder="123 Main St"
          className={inputClass}
          aria-describedby={fieldErrors.street ? 'addr-street-err' : undefined}
          aria-invalid={!!fieldErrors.street}
        />
        {fieldErrors.street && (
          <p id="addr-street-err" className={errorClass}>{fieldErrors.street}</p>
        )}
      </div>

      {/* City + State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="addr-city" className="block text-sm font-medium text-gray-700 mb-1">
            City <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="addr-city"
            type="text"
            name="city"
            value={form.city}
            onChange={handleChange}
            disabled={saving}
            placeholder="New York"
            className={inputClass}
            aria-describedby={fieldErrors.city ? 'addr-city-err' : undefined}
            aria-invalid={!!fieldErrors.city}
          />
          {fieldErrors.city && (
            <p id="addr-city-err" className={errorClass}>{fieldErrors.city}</p>
          )}
        </div>
        <div>
          <label htmlFor="addr-state" className="block text-sm font-medium text-gray-700 mb-1">
            State / Province <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="addr-state"
            type="text"
            name="state"
            value={form.state}
            onChange={handleChange}
            disabled={saving}
            placeholder="NY"
            className={inputClass}
            aria-describedby={fieldErrors.state ? 'addr-state-err' : undefined}
            aria-invalid={!!fieldErrors.state}
          />
          {fieldErrors.state && (
            <p id="addr-state-err" className={errorClass}>{fieldErrors.state}</p>
          )}
        </div>
      </div>

      {/* Postal code + Country */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="addr-postal" className="block text-sm font-medium text-gray-700 mb-1">
            Postal Code <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="addr-postal"
            type="text"
            name="postal_code"
            value={form.postal_code}
            onChange={handleChange}
            disabled={saving}
            placeholder="10001"
            className={inputClass}
            aria-describedby={fieldErrors.postal_code ? 'addr-postal-err' : undefined}
            aria-invalid={!!fieldErrors.postal_code}
          />
          {fieldErrors.postal_code && (
            <p id="addr-postal-err" className={errorClass}>{fieldErrors.postal_code}</p>
          )}
        </div>
        <div>
          <label htmlFor="addr-country" className="block text-sm font-medium text-gray-700 mb-1">
            Country <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="addr-country"
            type="text"
            name="country"
            value={form.country}
            onChange={handleChange}
            disabled={saving}
            placeholder="United States"
            className={inputClass}
            aria-describedby={fieldErrors.country ? 'addr-country-err' : undefined}
            aria-invalid={!!fieldErrors.country}
          />
          {fieldErrors.country && (
            <p id="addr-country-err" className={errorClass}>{fieldErrors.country}</p>
          )}
        </div>
      </div>

      {/* Default checkbox */}
      <div className="flex items-center gap-2">
        <input
          id="addr-default"
          type="checkbox"
          name="is_default"
          checked={form.is_default}
          onChange={handleChange}
          disabled={saving}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="addr-default" className="text-sm text-gray-700">
          Set as default shipping address
        </label>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Address card ──────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: AddressResult;
  editingId: number | null;
  savingId: number | null;
  deletingId: number | null;
  settingDefaultId: number | null;
  onEdit: (id: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number, data: AddressFormData) => void;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
}

function AddressCard({
  address,
  editingId,
  savingId,
  deletingId,
  settingDefaultId,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const isEditing = editingId === address.id;
  const isSaving = savingId === address.id;
  const isDeleting = deletingId === address.id;
  const isSettingDefault = settingDefaultId === address.id;
  const isBusy = isSaving || isDeleting || isSettingDefault;

  const initialForm: AddressFormData = {
    street: address.street,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
    is_default: address.is_default,
  };

  return (
    <div
      className={`bg-white rounded-xl border ${address.is_default ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'} p-5 transition-opacity ${isBusy && !isEditing ? 'opacity-60' : ''}`}
      aria-busy={isBusy}
    >
      {isEditing ? (
        <AddressForm
          initial={initialForm}
          saving={isSaving}
          onSave={(data) => onSaveEdit(address.id, data)}
          onCancel={onCancelEdit}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              {address.is_default && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 mb-2">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Default
                </span>
              )}
              <address className="not-italic text-sm text-gray-700 space-y-0.5">
                <p className="font-medium">{address.street}</p>
                <p>
                  {address.city}, {address.state} {address.postal_code}
                </p>
                <p>{address.country}</p>
              </address>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {!address.is_default && (
                <button
                  type="button"
                  onClick={() => onSetDefault(address.id)}
                  disabled={isBusy}
                  className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSettingDefault ? 'Updating…' : 'Set as Default'}
                </button>
              )}
              <button
                type="button"
                onClick={() => onEdit(address.id)}
                disabled={isBusy || editingId !== null}
                aria-label={`Edit address at ${address.street}`}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(address.id)}
                disabled={isBusy || editingId !== null}
                aria-label={`Delete address at ${address.street}`}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Profile section ───────────────────────────────────────────────────────────

interface ProfileSectionProps {
  profile: ProfileResult;
  onProfileUpdated: (updated: ProfileResult) => void;
}

function ProfileSection({ profile, onProfileUpdated }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep local state in sync if profile prop changes
  useEffect(() => {
    if (!isEditing) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile, isEditing]);

  function handleEditToggle() {
    setIsEditing(true);
    setError('');
    setSuccess('');
  }

  function handleCancel() {
    setIsEditing(false);
    setName(profile.name);
    setEmail(profile.email);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateProfile({ name: trimmedName, email: trimmedEmail });
      onProfileUpdated(updated);
      setIsEditing(false);
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      const msg =
        axiosErr?.response?.data?.error?.message ?? 'Failed to update profile. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400';

  return (
    <section aria-labelledby="profile-heading" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 id="profile-heading" className="text-lg font-bold text-gray-900">
          Profile Information
        </h2>
        {!isEditing && (
          <button
            type="button"
            onClick={handleEditToggle}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {isEditing ? (
        <form onSubmit={handleSave} noValidate aria-label="Edit profile form">
          <div className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                disabled={saving}
                placeholder="Your full name"
                className={inputClass}
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={saving}
                placeholder="you@example.com"
                className={inputClass}
                aria-required="true"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</dt>
            <dd className="mt-0.5">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 capitalize">
                {profile.role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Member Since</dt>
            <dd className="mt-0.5 text-sm text-gray-700">
              {new Date(profile.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

// ── Addresses section ─────────────────────────────────────────────────────────

interface AddressesSectionProps {
  addresses: AddressResult[];
  onAddressesChanged: (addresses: AddressResult[]) => void;
}

function AddressesSection({ addresses, onAddressesChanged }: AddressesSectionProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingSaving, setAddingSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(''), 6000);
  }

  // ── Add address ────────────────────────────────────────────────────────────
  async function handleAdd(data: AddressFormData) {
    setAddingSaving(true);
    setError('');
    try {
      const payload: AddressPayload = {
        street: data.street,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        is_default: data.is_default,
      };
      const newAddr = await addAddress(payload);
      // If new address is default, clear is_default on all others
      const updated = data.is_default
        ? [...addresses.map((a) => ({ ...a, is_default: false })), newAddr]
        : [...addresses, newAddr];
      onAddressesChanged(updated);
      setShowAddForm(false);
      showSuccess('Address added successfully.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      showError(axiosErr?.response?.data?.error?.message ?? 'Failed to add address.');
    } finally {
      setAddingSaving(false);
    }
  }

  // ── Edit address ───────────────────────────────────────────────────────────
  async function handleSaveEdit(id: number, data: AddressFormData) {
    setSavingId(id);
    setError('');
    try {
      const payload: Partial<AddressPayload> = {
        street: data.street,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        country: data.country,
        is_default: data.is_default,
      };
      const updated = await updateAddress(id, payload);
      // If this address is now default, clear others
      const newList = data.is_default
        ? addresses.map((a) => (a.id === id ? updated : { ...a, is_default: false }))
        : addresses.map((a) => (a.id === id ? updated : a));
      onAddressesChanged(newList);
      setEditingId(null);
      showSuccess('Address updated successfully.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      showError(axiosErr?.response?.data?.error?.message ?? 'Failed to update address.');
    } finally {
      setSavingId(null);
    }
  }

  // ── Delete address ─────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    setDeletingId(id);
    setError('');
    try {
      await deleteAddress(id);
      onAddressesChanged(addresses.filter((a) => a.id !== id));
      showSuccess('Address deleted.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      showError(axiosErr?.response?.data?.error?.message ?? 'Failed to delete address.');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Set default ────────────────────────────────────────────────────────────
  async function handleSetDefault(id: number) {
    setSettingDefaultId(id);
    setError('');
    try {
      const updated = await updateAddress(id, { is_default: true });
      // Clear is_default on all other addresses and set this one
      const newList = addresses.map((a) =>
        a.id === id ? updated : { ...a, is_default: false },
      );
      onAddressesChanged(newList);
      showSuccess('Default address updated.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      showError(axiosErr?.response?.data?.error?.message ?? 'Failed to set default address.');
    } finally {
      setSettingDefaultId(null);
    }
  }

  const isBusy = editingId !== null || savingId !== null || deletingId !== null || settingDefaultId !== null || addingSaving;

  return (
    <section aria-labelledby="addresses-heading" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 id="addresses-heading" className="text-lg font-bold text-gray-900">
          Saved Addresses
          {addresses.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({addresses.length})
            </span>
          )}
        </h2>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => { setShowAddForm(true); setEditingId(null); setError(''); setSuccess(''); }}
            disabled={isBusy}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Address
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {/* Add address form */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <h3 className="text-sm font-semibold text-indigo-900 mb-4">New Address</h3>
          <AddressForm
            saving={addingSaving}
            onSave={handleAdd}
            onCancel={() => { setShowAddForm(false); setError(''); }}
          />
        </div>
      )}

      {/* Empty state */}
      {addresses.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="w-14 h-14 text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-500 text-sm">No saved addresses yet.</p>
          <p className="text-gray-400 text-xs mt-1">Add an address to speed up checkout.</p>
        </div>
      )}

      {/* Address list */}
      {addresses.length > 0 && (
        <div role="list" aria-label="Saved addresses" className="space-y-4">
          {addresses.map((addr) => (
            <div key={addr.id} role="listitem">
              <AddressCard
                address={addr}
                editingId={editingId}
                savingId={savingId}
                deletingId={deletingId}
                settingDefaultId={settingDefaultId}
                onEdit={(id) => { setEditingId(id); setShowAddForm(false); setError(''); setSuccess(''); }}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={handleSaveEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [addresses, setAddresses] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Load profile + addresses on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [profileData, addressData] = await Promise.all([
          getProfile(),
          getAddresses(),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setAddresses(addressData);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load profile. Please refresh the page and try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProfileUpdated = useCallback((updated: ProfileResult) => {
    setProfile(updated);
  }, []);

  const handleAddressesChanged = useCallback((updated: AddressResult[]) => {
    setAddresses(updated);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex items-center gap-2 text-sm text-gray-500">
              <li>
                <Link to="/" className="hover:text-indigo-600 transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li className="text-gray-900 font-medium" aria-current="page">
                Profile
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
        </div>

        {/* Loading state */}
        {loading && <LoadingSpinner label="Loading profile" />}

        {/* Top-level error */}
        {!loading && error && <ErrorBanner message={error} />}

        {/* Content */}
        {!loading && !error && profile && (
          <div className="space-y-6">
            <ProfileSection
              profile={profile}
              onProfileUpdated={handleProfileUpdated}
            />
            <AddressesSection
              addresses={addresses}
              onAddressesChanged={handleAddressesChanged}
            />
          </div>
        )}
      </div>
    </div>
  );
}
