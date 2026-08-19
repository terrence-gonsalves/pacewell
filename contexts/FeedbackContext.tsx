import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';

export type FeedbackType = 'success' | 'info' | 'error';

export interface FeedbackOptions {
    type: FeedbackType;
    message: string;
    duration?: number;
}

interface FeedbackState extends FeedbackOptions {
    id: number;
}

interface FeedbackContextValue {
    feedback: FeedbackState | null;
    showFeedback: (options: FeedbackOptions) => void;
    hideFeedback: () => void;
}

const DEFAULT_DURATION = 4000;
const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idRef = useRef(0);

    const clearFeedbackTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const hideFeedback = useCallback(() => {
        clearFeedbackTimeout();
        setFeedback(null);
    }, [clearFeedbackTimeout]);

    const showFeedback = useCallback(
        ({
            type,
            message,
            duration = DEFAULT_DURATION,
        }: FeedbackOptions) => {
            clearFeedbackTimeout();

            idRef.current += 1;

            setFeedback({
                id: idRef.current,
                type,
                message,
                duration,
            });

            if (duration > 0) {
                timeoutRef.current = setTimeout(() => {
                    setFeedback(null);
                    timeoutRef.current = null;
                }, duration);
            }
        },
        [clearFeedbackTimeout]
    );

    const value = useMemo(
        () => ({
            feedback,
            showFeedback,
            hideFeedback,
        }),
        [feedback, showFeedback, hideFeedback]
    );

    return (
        <FeedbackContext.Provider value={value}>
            {children}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = (): FeedbackContextValue => {
    const context = useContext(FeedbackContext);

    if (!context) {
        throw new Error(
            'useFeedback must be used within a FeedbackProvider'
        );
    }

    return context;
};