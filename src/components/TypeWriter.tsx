'use client';
import { useState, useEffect, useRef } from 'react';

interface TypeWriterProps {
  sequences: {
    text: string;
    pauseAfter?: number;
    backspaceTo?: number;
  }[];
  typeDelay?: number;
  backspaceDelay?: number;
  className?: string;
  loop?: boolean;
}

export function TypeWriter({ 
  sequences, 
  typeDelay = 35, 
  backspaceDelay = 20,
  className = '',
  loop = true 
}: TypeWriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Track sequences by content, not reference
  const sequencesKey = sequences.map(s => s.text).join('|');
  const prevSequencesKey = useRef(sequencesKey);
  
  const currentSequence = sequences[sequenceIndex];

  // Only reset when sequences CONTENT actually changes
  useEffect(() => {
    if (prevSequencesKey.current !== sequencesKey) {
      prevSequencesKey.current = sequencesKey;
      setDisplayedText('');
      setSequenceIndex(0);
      setCharIndex(0);
      setIsDeleting(false);
      setIsPaused(false);
    }
  }, [sequencesKey]);

  useEffect(() => {
    if (!currentSequence) return;

    // Pausing
    if (isPaused) {
      const pauseTime = currentSequence.pauseAfter || 2000;
      const timeout = setTimeout(() => {
        setIsPaused(false);
        if (currentSequence.backspaceTo !== undefined) {
          setIsDeleting(true);
        } else {
          setSequenceIndex((prev) => {
            const next = prev + 1;
            if (next >= sequences.length) {
              return loop ? 0 : prev;
            }
            return next;
          });
          setCharIndex(0);
        }
      }, pauseTime);
      return () => clearTimeout(timeout);
    }

    // Deleting
    if (isDeleting) {
      const targetLength = currentSequence.backspaceTo || 0;
      
      if (displayedText.length > targetLength) {
        const timeout = setTimeout(() => {
          setDisplayedText(prev => prev.slice(0, -1));
        }, backspaceDelay);
        return () => clearTimeout(timeout);
      } else {
        setIsDeleting(false);
        setSequenceIndex((prev) => {
          const next = prev + 1;
          if (next >= sequences.length) {
            return loop ? 0 : prev;
          }
          return next;
        });
        setCharIndex(displayedText.length);
      }
      return;
    }

    // Typing
    const targetText = currentSequence.text;
    
    if (charIndex < targetText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(targetText.slice(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
      }, typeDelay);
      return () => clearTimeout(timeout);
    } else {
      setIsPaused(true);
    }
  }, [charIndex, isDeleting, isPaused, currentSequence, sequences.length, displayedText.length, displayedText, typeDelay, backspaceDelay, loop]);

  return (
    <span className={className}>
      {displayedText}
      <span className="animate-pulse text-slate-500">|</span>
    </span>
  );
}
