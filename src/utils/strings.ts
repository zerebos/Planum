export function formatString(target: string, values: Record<string, any>): string {
        for (const val in values) {
            let replacement = values[val];
            if (Array.isArray(replacement)) replacement = JSON.stringify(replacement);
            if (typeof(replacement) === "object" && replacement !== null) replacement = replacement.toString();
            target = target.replace(new RegExp(`{{${val}}}`, "g"), replacement);
        }
        return target;
    }