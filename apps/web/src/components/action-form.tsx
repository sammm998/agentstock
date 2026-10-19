"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";

export type ActionState = { ok?: string; error?: string } | null;

interface Props {
  action: (fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Clear the fields after a successful submit. */
  reset?: boolean;
  /** Show the success message returned by the action. */
  showOk?: boolean;
  /** Ask for confirmation before submitting. */
  confirm?: string;
  "aria-label"?: string;
}

/**
 * A form that calls a server action, keeps input on error, and announces the
 * result to screen readers.
 */
export function ActionForm({ action, children, className, reset = false, showOk = false, confirm, ...rest }: Props) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pending}
      aria-label={rest["aria-label"]}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(async () => {
          const result = await action(fd);
          setState(result ?? null);
          if (result && !result.error && reset) ref.current?.reset();
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <div aria-live="polite" className="contents">
        {state?.error ? (
          <p role="alert" className="mt-2 basis-full text-sm text-danger">
            {state.error}
          </p>
        ) : showOk && state?.ok ? (
          <p className="mt-2 basis-full text-sm text-mint">{state.ok}</p>
        ) : null}
      </div>
    </form>
  );
}
