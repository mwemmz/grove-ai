/* Grove's own sign-in, sign-up and password reset, built on Clerk's custom-flow API.
   Students sign in with their email address or their student ID (stored as the Clerk username) and a password.
   Clerk keeps the passwords (hashed, checked against breach lists), the sessions and the email codes. */
import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/react';
import { TreePine } from 'lucide-react';
import { field, labelCls, primaryBtn } from './ui';

type Mode = 'signin' | 'signup' | 'reset';
type Step = 'form' | 'code' | 'newPassword';

interface ClerkLikeError {
  code?: string;
  message?: string;
  longMessage?: string;
}

/** Plain-language messages for the errors students will actually hit. */
const FRIENDLY: Record<string, string> = {
  form_identifier_not_found: 'No account uses that email or student ID. Check it, or create an account.',
  form_password_incorrect: 'That password is not right. Try again, or reset it.',
  form_identifier_exists: 'An account already uses that email or student ID. Sign in instead.',
  form_username_invalid_character: 'A student ID can only contain letters, numbers, - and _.',
  form_username_invalid_length: 'A student ID must be between 4 and 64 characters.',
  form_password_pwned: 'That password has appeared in a data breach elsewhere. Choose a different one.',
  form_password_length_too_short: 'Use at least 8 characters for your password.',
  form_password_not_strong_enough: 'That password is too easy to guess. Make it longer or less common.',
  form_param_format_invalid: 'Check the format of what you typed.',
  form_code_incorrect: 'That code is not right. Check the email and try again.',
  verification_expired: 'That code has expired. Send a new one.',
  too_many_requests: 'Too many attempts. Wait a minute, then try again.',
  strategy_for_user_invalid: 'Password sign-in is not switched on for this account.',
};

function describe(err: unknown): string {
  const e = (err ?? {}) as ClerkLikeError & { errors?: ClerkLikeError[] };
  const first = e.errors?.[0] ?? e;
  return (first.code && FRIENDLY[first.code]) || first.longMessage || first.message || 'Something went wrong. Try again.';
}

function Field({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} className={field} {...rest} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function AuthScreen() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [mode, setMode] = useState<Mode>('signin');
  const [step, setStep] = useState<Step>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const go = (m: Mode) => {
    setMode(m);
    setStep('form');
    setError(null);
    setNotice(null);
    setCode('');
    void signIn?.reset();
  };

  /** Runs one Clerk call; returns true when it succeeded. */
  const run = async (fn: () => Promise<{ error: unknown }>) => {
    try {
      const { error: err } = await fn();
      if (err) {
        setError(describe(err));
        return false;
      }
      return true;
    } catch (err) {
      setError(describe(err));
      return false;
    }
  };

  const finishSignIn = async () => {
    if (!signIn) return;
    if (signIn.status === 'complete') {
      await run(() => signIn.finalize());
      return;
    }
    // A new device or a second factor: Clerk emails a code before the session starts.
    if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
      if (await run(() => signIn.mfa.sendEmailCode())) {
        setStep('code');
        setNotice('We emailed you a 6-digit code to confirm it is you.');
      }
      return;
    }
    setError('This sign-in needs a step Grove does not support yet. Ask your administrator.');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !signUp || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin' && step === 'form') {
        if (await run(() => signIn.password({ identifier: identifier.trim(), password }))) await finishSignIn();
      } else if (mode === 'signin' && step === 'code') {
        if (await run(() => signIn.mfa.verifyEmailCode({ code: code.trim() }))) await finishSignIn();
      } else if (mode === 'signup' && step === 'form') {
        const [firstName, ...rest] = name.trim().split(/\s+/);
        const ok = await run(() =>
          signUp.password({
            emailAddress: email.trim(),
            password,
            username: studentId.trim(),
            firstName,
            lastName: rest.join(' ') || undefined,
          })
        );
        if (!ok) return;
        if (signUp.status === 'complete') {
          await run(() => signUp.finalize());
        } else if (await run(() => signUp.verifications.sendEmailCode())) {
          setStep('code');
          setNotice(`We emailed a 6-digit code to ${email.trim()}. Enter it to finish.`);
        }
      } else if (mode === 'signup' && step === 'code') {
        if (!(await run(() => signUp.verifications.verifyEmailCode({ code: code.trim() })))) return;
        if (signUp.status === 'complete') await run(() => signUp.finalize());
        else setError('Your account still needs: ' + (signUp.missingFields.join(', ') || 'more details') + '.');
      } else if (mode === 'reset' && step === 'form') {
        if (!(await run(() => signIn.create({ identifier: identifier.trim() })))) return;
        if (await run(() => signIn.resetPasswordEmailCode.sendCode())) {
          setStep('code');
          setNotice('If that account exists, we emailed it a 6-digit code.');
        }
      } else if (mode === 'reset' && step === 'code') {
        if (await run(() => signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }))) {
          setStep('newPassword');
          setNotice('Code accepted. Choose a new password.');
        }
      } else if (mode === 'reset' && step === 'newPassword') {
        if (await run(() => signIn.resetPasswordEmailCode.submitPassword({ password: newPassword, signOutOfOtherSessions: true }))) await finishSignIn();
      }
    } finally {
      setBusy(false);
    }
  };

  const title = { signin: 'Sign in', signup: 'Create your account', reset: 'Reset your password' }[mode];
  const button =
    step === 'code' ? 'Confirm code' : step === 'newPassword' ? 'Save new password' : { signin: 'Sign in', signup: 'Create account', reset: 'Email me a code' }[mode];
  const ready = !!signIn && !!signUp;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10 font-sans text-text">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <TreePine className="mx-auto mb-4 h-9 w-9 text-accent" aria-hidden />
          <h1 className="mb-1 font-display text-4xl tracking-tight">Grove</h1>
          <p className="text-muted">Your university's own AI.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-[10px] bg-surface p-5 ring-1 ring-line" aria-labelledby="auth-title" noValidate>
          <h2 id="auth-title" className="text-lg font-semibold">{title}</h2>

          {step === 'form' && mode === 'signin' && (
            <>
              <Field id="a-id" label="Email or student ID" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
              <Field id="a-pw" label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </>
          )}

          {step === 'form' && mode === 'signup' && (
            <>
              <Field id="a-name" label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              <Field id="a-email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Field id="a-sid" label="Student ID" autoComplete="username" value={studentId} onChange={(e) => setStudentId(e.target.value)} required hint="You can sign in with this or your email." />
              <Field id="a-npw" label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="At least 8 characters." />
              {/* Clerk's bot protection renders here when it is switched on. */}
              <div id="clerk-captcha" />
            </>
          )}

          {step === 'form' && mode === 'reset' && (
            <Field id="a-rid" label="Email or student ID" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
          )}

          {step === 'code' && (
            <Field id="a-code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
          )}

          {step === 'newPassword' && (
            <Field id="a-newpw" label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus hint="This also signs you out on your other devices." />
          )}

          {notice && !error && <p className="text-sm text-muted" role="status">{notice}</p>}
          {error && <p className="text-sm text-warn" role="alert">{error}</p>}

          <button type="submit" className={`${primaryBtn} w-full`} disabled={!ready || busy}>
            {busy ? 'One moment…' : button}
          </button>

          <div className="flex flex-wrap justify-between gap-2 text-sm">
            {mode === 'signin' ? (
              <>
                <button type="button" onClick={() => go('signup')} className="text-accent hover:underline">Create an account</button>
                <button type="button" onClick={() => go('reset')} className="text-muted hover:text-text hover:underline">Forgot password?</button>
              </>
            ) : (
              <button type="button" onClick={() => go('signin')} className="text-accent hover:underline">Back to sign in</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
