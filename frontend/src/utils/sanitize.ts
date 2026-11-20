import DOMPurify from 'dompurify';

// Server se aaya hua koi bhi text render karne se pehle isse clean karo
export const clean = (dirty: string): string => DOMPurify.sanitize(dirty);