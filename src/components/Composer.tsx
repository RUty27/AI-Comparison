"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SendIcon, StopIcon } from "./Icons";

export function Composer({
  onSend,
  onStop,
  busy,
  placeholder,
  left,
  initial = "",
  autoFocus,
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder: string;
  left?: ReactNode;
  /** Starting draft (remount with a new key to replace it). */
  initial?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && initial) {
      el.focus();
      el.setSelectionRange(initial.length, initial.length);
    }
  }, [initial]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [text]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="rounded-2xl border border-line bg-panel p-2 shadow-sm focus-within:border-muted">
      <textarea
        ref={ref}
        value={text}
        rows={1}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="block max-h-56 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted"
        aria-label={placeholder}
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="min-w-0">{left}</div>
        <div className="flex items-center gap-1.5">
          {busy && onStop && (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex size-8 items-center justify-center rounded-full border border-line hover:bg-panel-2"
              aria-label="Stop all"
              title="Stop all"
            >
              <StopIcon width={13} height={13} />
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-bg disabled:opacity-30"
            aria-label="Send"
            title="Send (Enter)"
          >
            <SendIcon width={15} height={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
