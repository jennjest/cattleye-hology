import type { InertiaLinkProps } from "@inertiajs/react";
import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps["href"]>): string {
    return typeof url === "string" ? url : url.url;
}

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Wayfinder's `.form()` helpers return `{ action, method }` for the `<Form>`
 * component, but `useForm().submit()` expects `{ url, method }`. This converts
 * between the two so a generated route definition can drive both.
 */
export function formatUrl<TMethod extends HttpMethod>(definition: {
    action: string;
    method: TMethod;
}): { url: string; method: TMethod } {
    return { url: definition.action, method: definition.method };
}
