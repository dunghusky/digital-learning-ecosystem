"use client";

import { Check, Link2, Share2, Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

const LANG = "vi-VN";
const COPIED_MS = 2000;

function findVietnameseVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.replace("_", "-").toLowerCase().startsWith("vi"));
}

// Voices load asynchronously and change when the OS installs one, hence an external store.
function subscribeVoices(onChange: () => void): () => void {
  if (!("speechSynthesis" in window)) {
    return () => {};
  }
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

function hasVietnameseVoice(): boolean {
  return "speechSynthesis" in window && findVietnameseVoice() !== undefined;
}

/** Read aloud and share. Read aloud only appears when the browser can actually speak Vietnamese. */
export function DocumentActions({ title, text }: { title: string; text: string }) {
  const t = useTranslations("archive");
  const canSpeak = useSyncExternalStore(subscribeVoices, hasVietnameseVoice, () => false);
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Leaving the page must not keep the browser talking.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  function toggleSpeech() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${title}.\n${text}`);
    utterance.lang = LANG;
    utterance.voice = findVietnameseVoice() ?? null;
    utterance.rate = 0.9; // a little slower for young readers
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return; // the reader closed the share sheet
        }
      }
    }
    await copyLink();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context); the address bar is still there.
    }
  }

  const buttonClass =
    "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium text-ink transition hover:border-primary hover:text-primary";

  return (
    <div className="flex flex-wrap gap-2">
      {canSpeak && (
        <button
          type="button"
          onClick={toggleSpeech}
          aria-pressed={speaking}
          className={buttonClass}
        >
          {speaking ? (
            <Square className="size-4 fill-current" aria-hidden />
          ) : (
            <Volume2 className="size-4" aria-hidden />
          )}
          {speaking ? t("stopListening") : t("listen")}
        </button>
      )}
      <button type="button" onClick={share} className={buttonClass}>
        <Share2 className="size-4" aria-hidden />
        {t("share")}
      </button>
      <button type="button" onClick={copyLink} className={buttonClass} aria-live="polite">
        {copied ? (
          <Check className="size-4 text-secondary" aria-hidden />
        ) : (
          <Link2 className="size-4" aria-hidden />
        )}
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
