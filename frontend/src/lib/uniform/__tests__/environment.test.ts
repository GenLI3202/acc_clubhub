import { describe, expect, it } from 'vitest';

import { isWeChatUserAgent } from '../environment';

const WECHAT_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x18003128) NetType/WIFI Language/zh_CN';
const WECHAT_ANDROID =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0 Mobile Safari/537.36 XWEB/1220133 MMWEBSDK/20240404 MicroMessenger/8.0.49.2600(0x28003133) WeChat/arm64';
const SAFARI_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME_DESKTOP =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

describe('isWeChatUserAgent', () => {
    it('recognises the WeChat in-app browser on iOS and Android', () => {
        expect(isWeChatUserAgent(WECHAT_IOS)).toBe(true);
        expect(isWeChatUserAgent(WECHAT_ANDROID)).toBe(true);
    });

    it('does not flag ordinary browsers', () => {
        expect(isWeChatUserAgent(SAFARI_IOS)).toBe(false);
        expect(isWeChatUserAgent(CHROME_DESKTOP)).toBe(false);
    });

    it('is case-insensitive and safe on empty input', () => {
        expect(isWeChatUserAgent('something micromessenger/8')).toBe(true);
        expect(isWeChatUserAgent('')).toBe(false);
    });
});
