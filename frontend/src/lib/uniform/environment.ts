// src/lib/uniform/environment.ts
// Facts about the visitor's browser that change what the order page tells them.

/**
 * WeChat's in-app browser. Google blocks sign-in inside embedded browsers
 * and the Form's screenshot upload needs a Google account, so buyers there
 * are asked to open the page in Safari or Chrome before they order.
 */
export function isWeChatUserAgent(userAgent: string): boolean {
    return /MicroMessenger/i.test(userAgent);
}
