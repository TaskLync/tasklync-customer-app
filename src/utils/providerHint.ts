/**
 * Which provider type a custom-service request should declare to the backend.
 *
 * An agency (company) is a worker account with provider_type 'COMPANY'. The backend always derives the
 * real type itself and rejects a mismatch, so this is only a safety hint that stops a stale screen from
 * silently sending an agency request to the wrong kind of provider.
 *
 * Rule: only ever assert 'COMPANY'. The profile mapper defaults provider_type to 'INDIVIDUAL' when the
 * profile endpoint omits it, so a profile saying INDIVIDUAL is NOT proof — asserting it could make the
 * server reject a legitimate agency.
 */
export interface ProviderHintInput {
  /** True when the screen was opened from an agency (company) profile. */
  openedFromAgencyProfile: boolean;
  /** provider_type from the loaded worker profile (may be a default, not a fact). */
  profileProviderType?: string | null | undefined;
}

export function isAgencyProvider({ openedFromAgencyProfile, profileProviderType }: ProviderHintInput): boolean {
  return openedFromAgencyProfile || profileProviderType === 'COMPANY';
}

/** The `provider_type` to put in the request payload, or undefined to let the server decide. */
export function providerTypeHint(input: ProviderHintInput): 'COMPANY' | undefined {
  return isAgencyProvider(input) ? 'COMPANY' : undefined;
}
