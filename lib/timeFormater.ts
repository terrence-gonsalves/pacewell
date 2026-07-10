export const formatDisplayTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};