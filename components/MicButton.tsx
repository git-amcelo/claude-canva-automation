"use client";

import { useEffect, useRef, useState } from "react";

export default function MicButton({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (value: string) => void;
  onError?: (message: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef("");
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);

  // Keep latest value/callbacks available to the recognition instance
  // without tearing it down (and interrupting an active listening
  // session) on every parent re-render.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      // Rebuild the full session transcript (finalized so far + the
      // in-progress phrase) on every event so words appear live as
      // they're spoken, not just once a phrase is finalized.
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      const spoken = (finalText + interimText).trim();
      const base = baseTextRef.current;
      onChangeRef.current(spoken ? (base ? `${base} ${spoken}` : spoken) : base);
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        onErrorRef.current?.("Microphone access was blocked. Allow microphone permission in your browser to use voice input.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        onErrorRef.current?.("Voice input error. Please try again.");
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    };
  }, []);

  function toggle() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      baseTextRef.current = valueRef.current.trim();
      try {
        recognition.start();
        setListening(true);
      } catch {
        // start() throws if a session is already in flight — ignore.
      }
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`mic-btn${listening ? " listening" : ""}`}
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={listening ? "Listening… click to stop" : "Speak to fill this in"}
    >
      {listening && <span className="mic-pulse" aria-hidden="true" />}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 11a7 7 0 0 1-14 0M12 18v3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
