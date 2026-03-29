import { useState, useEffect, useRef } from 'react';

export default function Timer({ initialMinutes = 120, onTimeUp, storageKey }) {
    const [endTime] = useState(() => {
        if (storageKey) {
            const saved = localStorage.getItem(`${storageKey}_timer`);
            if (saved) return parseInt(saved, 10);
        }
        const newEndTime = Date.now() + initialMinutes * 60 * 1000;
        if (storageKey) {
            localStorage.setItem(`${storageKey}_timer`, newEndTime.toString());
        }
        return newEndTime;
    });

    const [secondsLeft, setSecondsLeft] = useState(() => {
        const left = Math.round((endTime - Date.now()) / 1000);
        return left > 0 ? left : 0;
    });

    const onTimeUpRef = useRef(onTimeUp);
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    const hasTriggeredRef = useRef(false);

    useEffect(() => {
        if (secondsLeft <= 0 && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            onTimeUpRef.current?.();
            return;
        }

        const intervalId = setInterval(() => {
            const left = Math.round((endTime - Date.now()) / 1000);
            if (left <= 0) {
                setSecondsLeft(0);
                clearInterval(intervalId);
                if (!hasTriggeredRef.current) {
                    hasTriggeredRef.current = true;
                    onTimeUpRef.current?.();
                }
            } else {
                setSecondsLeft(left);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [endTime, secondsLeft]);

    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;

    const pad = (n) => String(n).padStart(2, '0');

    const isLowTime = secondsLeft < 300; // menos de 5 min
    const isCritical = secondsLeft < 60;  // menos de 1 min

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono font-bold transition-all duration-300
      ${isCritical
                ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                : isLowTime
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
            }
    `}>
            <svg className={`w-4 h-4 ${isCritical ? 'text-red-500' : isLowTime ? 'text-amber-500' : 'text-slate-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{pad(hours)}:{pad(minutes)}:{pad(seconds)}</span>
        </div>
    );
}
