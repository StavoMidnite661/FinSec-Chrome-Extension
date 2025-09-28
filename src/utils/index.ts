export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const generateRandomId = (length: number = 8): string => {
    return Math.random().toString(36).substr(2, length);
};

export const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};