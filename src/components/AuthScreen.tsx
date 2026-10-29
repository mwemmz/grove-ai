/* Grove's own sign-in, sign-up and password reset, built on Clerk's custom-flow API.
   Students sign in with their email address or their student ID (stored as the Clerk username) and a password.
   Clerk keeps the passwords (hashed, checked against breach lists), the sessions and the email codes. */
import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/react';
import { TreePine } from 'lucide-react';
import { field, labelCls, primaryBtn } from './ui';
import { GradCap } from './GradCap';
import { logAuth } from '../services/authLog';

type Mode = 'signin' | 'signup' | 'reset' | 'code';
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
  form_password_not_strong_enough: 'That password is too easy to guess. Make it longer or less common.',
  form_param_format_invalid: 'Check the format of what you typed.',
  form_code_incorrect: 'That code is not right. Check the email and try again.',
  verification_expired: 'That code has expired. Send a new one.',
  too_many_requests: 'Too many attempts. Wait a minute, then try again.',
  strategy_for_user_invalid: 'This account has no password yet. It was probably created with Google or an email code. Sign in with an emailed code below, then set a password in Settings.',
};

function codeOf(err: unknown): string | undefined {
  const e = (err ?? {}) as ClerkLikeError & { errors?: ClerkLikeError[] };
  return (e.errors?.[0] ?? e).code;
}

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
  /** Set when a password sign-in fails because the account has no password: offer an emailed code instead. */
  const [offerCode, setOfferCode] = useState(false);

  const go = (m: Mode) => {
    setMode(m);
    setStep('form');
    setError(null);
    setNotice(null);
    setCode('');
    setOfferCode(false);
    void signIn?.reset();
  };

  /** Runs one Clerk call; returns true when it succeeded. */
  const who = () => (mode === 'signup' ? email || studentId : identifier).trim();
  const run = async (fn: () => Promise<{ error: unknown }>, step = 'step') => {
    const report = (ok: boolean, err?: unknown) => {
      const e = (err ?? {}) as ClerkLikeError & { errors?: ClerkLikeError[] };
      const first = e.errors?.[0] ?? e;
      logAuth({ flow: mode, step, ok, who: who(), code: ok ? undefined : codeOf(err) ?? 'unknown', message: ok ? undefined : first.longMessage || first.message });
    };
    try {
      const { error: err } = await fn();
      if (err) {
        if (codeOf(err) === 'strategy_for_user_invalid') setOfferCode(true);
        setError(describe(err));
        report(false, err);
        return false;
      }
      report(true);
      return true;
    } catch (err) {
      setError(describe(err));
      report(false, err);
      return false;
    }
  };

  const finishSignIn = async () => {
    if (!signIn) return;
    if (signIn.status === 'complete') {
      await run(() => signIn.finalize(), 'finish sign-in');
      return;
    }
    // A new device or a second factor: Clerk emails a code before the session starts.
    if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
      if (await run(() => signIn.mfa.sendEmailCode(), 'send new-device code')) {
        setStep('code');
        setNotice('We emailed you a 6-digit code to confirm it is you.');
      }
      return;
    }
    setError('This sign-in needs a step Grove does not support yet. Ask your administrator.');
  };

  /** Sends the current code again, through the same route that sent it the first time. */
  const resend = async () => {
    if (!signIn || !signUp || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok =
        mode === 'signup'
          ? await run(() => signUp.verifications.sendEmailCode(), 'resend sign-up code')
          : mode === 'reset'
            ? await run(() => signIn.resetPasswordEmailCode.sendCode(), 'resend reset code')
            : mode === 'code'
              ? await run(() => signIn.emailCode.sendCode(), 'resend sign-in code')
              : await run(() => signIn.mfa.sendEmailCode(), 'resend new-device code');
      if (ok) setNotice('Sent again. It can take a minute to arrive.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !signUp || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin' && step === 'form') {
        if (await run(() => signIn.password({ identifier: identifier.trim(), password }), 'password')) await finishSignIn();
      } else if (mode === 'code' && step === 'form') {
        if (!(await run(() => signIn.create({ identifier: identifier.trim() }), 'find account'))) return;
        if (await run(() => signIn.emailCode.sendCode(), 'send sign-in code')) {
          setStep('code');
          setNotice('We emailed you a 6-digit sign-in code.');
        }
      } else if (mode === 'code' && step === 'code') {
        if (await run(() => signIn.emailCode.verifyCode({ code: code.trim() }), 'check sign-in code')) await finishSignIn();
      } else if (mode === 'signin' && step === 'code') {
        if (await run(() => signIn.mfa.verifyEmailCode({ code: code.trim() }), 'check new-device code')) await finishSignIn();
      } else if (mode === 'signup' && step === 'form') {
        const [firstName, ...rest] = name.trim().split(/\s+/);
        const ok = await run(
          () =>
            signUp.password({
              emailAddress: email.trim(),
              password,
              username: studentId.trim(),
              firstName,
              lastName: rest.join(' ') || undefined,
            }),
          'create account',
        );
        if (!ok) return;
        if (signUp.status === 'complete') {
          await run(() => signUp.finalize(), 'finish sign-up');
        } else if (await run(() => signUp.verifications.sendEmailCode(), 'send sign-up code')) {
          setStep('code');
          setNotice(`We emailed a 6-digit code to ${email.trim()}. Enter it to finish.`);
        }
      } else if (mode === 'signup' && step === 'code') {
        if (!(await run(() => signUp.verifications.verifyEmailCode({ code: code.trim() }), 'check sign-up code'))) return;
        if (signUp.status === 'complete') await run(() => signUp.finalize(), 'finish sign-up');
        else setError('Your account still needs: ' + (signUp.missingFields.join(', ') || 'more details') + '.');
      } else if (mode === 'reset' && step === 'form') {
        if (!(await run(() => signIn.create({ identifier: identifier.trim() }), 'find account'))) return;
        if (await run(() => signIn.resetPasswordEmailCode.sendCode(), 'send reset code')) {
          setStep('code');
          setNotice('If that account exists, we emailed it a 6-digit code.');
        }
      } else if (mode === 'reset' && step === 'code') {
        if (await run(() => signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }), 'check reset code')) {
          setStep('newPassword');
          setNotice('Code accepted. Choose a new password.');
        }
      } else if (mode === 'reset' && step === 'newPassword') {
        if (await run(() => signIn.resetPasswordEmailCode.submitPassword({ password: newPassword, signOutOfOtherSessions: true }), 'save new password')) await finishSignIn();
      }
    } finally {
      setBusy(false);
    }
  };

  const title = { signin: 'Sign in', signup: 'Create your account', reset: 'Reset your password', code: 'Sign in with an emailed code' }[mode];
  const button =
    step === 'code' ? 'Confirm code' : step === 'newPassword' ? 'Save new password' : { signin: 'Sign in', signup: 'Create account', reset: 'Email me a code', code: 'Email me a code' }[mode];
  const ready = !!signIn && !!signUp;

  return (
    // The page itself never scrolls (see index.css), so this screen scrolls inside itself: the form can be taller than a phone.
    <div className="relative isolate h-dvh overflow-y-auto bg-bg font-sans text-text">
    <div aria-hidden className="ambient" style={{ zIndex: -1 }} />
    <div className="mx-auto grid min-h-full max-w-6xl items-center gap-6 px-4 py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:px-10">
      {/* The hero: the word, and the cap in front of it, like a product on a studio set. */}
      <div className="relative mx-auto w-full max-w-sm text-center lg:max-w-none lg:text-left">
        <p aria-hidden className="pointer-events-none select-none font-display text-[22vw] leading-[0.85] tracking-[-0.05em] text-text/[0.22] sm:text-[16vw] lg:text-[11rem]">
          Grove
        </p>
        <GradCap className="mx-auto -mt-[16vw] w-[64%] sm:-mt-[11vw] lg:-mt-36 lg:ml-[18%] lg:w-[62%]" />
        <div className="relative mt-2 lg:mt-6">
          <h1 className="flex items-center justify-center gap-2 font-display text-3xl tracking-tight lg:justify-start lg:text-4xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-ink"><TreePine className="h-5 w-5" aria-hidden /></span>
            Grove
          </h1>
          <p className="mt-2 text-text/85 lg:text-lg">Your university's own study companion, from first lecture to graduation.</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm">

        <form onSubmit={submit} className="glass space-y-4 rounded-[28px] p-6 ring-1 ring-line" aria-labelledby="auth-title" noValidate>
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
              <Field id="a-npw" label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {/* Clerk's bot protection renders here when it is switched on. */}
              <div id="clerk-captcha" />
            </>
          )}

          {step === 'form' && (mode === 'reset' || mode === 'code') && (
            <Field id="a-rid" label="Email or student ID" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
          )}

          {step === 'code' && (
            <Field id="a-code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
          )}

          {step === 'newPassword' && (
            <Field id="a-newpw" label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus hint="This also signs you out on your other devices." />
          )}

          {notice && !error && <p className="text-sm text-muted" role="status">{notice}</p>}
          {step === 'code' && (
            <p className="text-xs text-muted">
              No email after a minute? Check your spam or junk folder, then{' '}
              <button type="button" onClick={resend} disabled={busy} className="font-medium text-accent-text underline-offset-2 hover:underline">
                send it again
              </button>
              .
            </p>
          )}
          {error && <p className="text-sm text-warn" role="alert">{error}</p>}

          {offerCode && mode === 'signin' && (
            <button
              type="button"
              onClick={() => {
                const keep = identifier;
                go('code');
                setIdentifier(keep);
              }}
              className="w-full min-h-11 rounded-md text-sm text-text ring-1 ring-line hover:bg-raised"
            >
              Email me a sign-in code instead
            </button>
          )}

          <button type="submit" className={`${primaryBtn} w-full`} disabled={!ready || busy}>
            {busy ? 'One moment…' : button}
          </button>

          <div className="flex flex-wrap justify-between gap-2 text-sm">
            {mode === 'signin' ? (
              <>
                <button type="button" onClick={() => go('signup')} className="text-accent hover:underline">Create an account</button>
                <button type="button" onClick={() => go('reset')} className="text-muted hover:text-text hover:underline">Forgot password?</button>
                <button type="button" onClick={() => go('code')} className="basis-full text-left text-muted hover:text-text hover:underline">Sign in with an emailed code</button>
              </>
            ) : (
              <button type="button" onClick={() => go('signin')} className="text-accent hover:underline">Back to sign in</button>
            )}
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}
