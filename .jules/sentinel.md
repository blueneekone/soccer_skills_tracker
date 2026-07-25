## 2025-02-28 - [Timing Attack Vulnerability in Webhook]
**Vulnerability:** A simple string equality check (`!==`) was used to compare the provided webhook authentication token against the expected token in `facilityWeatherWebhook.js`.
**Learning:** This exposes the endpoint to a timing attack. An attacker can guess the token character-by-character based on the time it takes the server to reject the request, because the `!==` operator returns early on the first mismatched character.
**Prevention:** Always use `crypto.timingSafeEqual()` (or an equivalent constant-time comparison function) to compare secrets, passwords, or authentication tokens. Ensure both inputs are converted to Buffers of the exact same length before passing them to the timing-safe function.
