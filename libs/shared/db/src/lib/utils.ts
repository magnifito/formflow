
import { v4 as uuidv4 } from 'uuid';

export function generateSubmitHash(): string {
    return uuidv4().replace(/-/g, '');
}
