import { useEffect, useRef } from 'react';

const FETCH_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface TelegramWidgetProps {
    userId: string | number;
}

export function TelegramWidget({ userId }: TelegramWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userId || !containerRef.current) return;

        // Clear previous content
        containerRef.current.innerHTML = '';

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', "FormFlowBot");
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-auth-url', `${FETCH_URL}/oauth/telegram/${userId}`);
        script.setAttribute('data-request-access', 'write');
        script.async = true;

        containerRef.current.appendChild(script);

        return () => {
            // Cleanup if needed, though usually the script stays
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [userId]);

    return (
        <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-muted/20 border-dashed">
            <div ref={containerRef} id="telegram-widget-container" />
            <p className="mt-4 text-xs text-muted-foreground text-center">
                Connect your Telegram account to receive instant notifications via FormFlowBot.
            </p>
        </div>
    );
}
