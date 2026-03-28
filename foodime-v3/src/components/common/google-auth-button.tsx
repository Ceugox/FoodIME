'use client';

import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

interface GoogleAuthButtonProps {
  onCredential: (credential: string) => Promise<void> | void;
  disabled?: boolean;
}

export function GoogleAuthButton({ onCredential, disabled = false }: GoogleAuthButtonProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    return null;
  }

  function handleSuccess(response: CredentialResponse) {
    if (!response.credential || disabled) {
      return;
    }

    void onCredential(response.credential);
  }

  return (
    <div className={`flex justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          // Surface errors in the caller flow instead of throwing from the SDK callback.
        }}
        theme="outline"
        size="large"
        text="continue_with"
        shape="pill"
        width="320"
      />
    </div>
  );
}
