/**
 * Represents an HTTP verb.
 */
type HttpVerb =
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "OPTIONS"
    | "HEAD";

const base64ToArrayBuffer = (base64: string) =>
    Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

const checkEvironmentSupport = () => {
    // Check if WebCrypto is supported
    if (!globalThis.crypto?.subtle) {
        throw new Error("WebCrypto is not supported in this environment");
    }

    // No way to check if Ed25519 is supported, so just return true
    return true;
};

/**
 * Validates the signature of a request.
 * @see https://lysand.org/security/signing
 */
export class SignatureValidator {
    /**
     * Creates a new instance of SignatureValidator.
     * @param publicKey The public key used for signature verification.
     */
    constructor(private publicKey: CryptoKey) {
        checkEvironmentSupport();
    }

    /**
     * Creates a SignatureValidator instance from a base64-encoded public key.
     * @param base64PublicKey The base64-encoded public key.
     * @returns A Promise that resolves to a SignatureValidator instance.
     * @example
     * const publicKey = "base64PublicKey";
     * const validator = await SignatureValidator.fromStringKey(publicKey);
     */
    static async fromStringKey(
        base64PublicKey: string,
    ): Promise<SignatureValidator> {
        return new SignatureValidator(
            await crypto.subtle.importKey(
                "spki",
                base64ToArrayBuffer(base64PublicKey),
                "Ed25519",
                false,
                ["verify"],
            ),
        );
    }

    /**
     * Validates the signature of a request.
     * @param request The request object to validate.
     * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
     * @throws TypeError if any required headers are missing in the request.
     * @example
     * const request = new Request(); // Should be a Request from a Lysand federation request
     * const isValid = await validator.validate(request);
     */
    async validate(request: Request): Promise<boolean>;

    /**
     * Validates the signature of a request.
     * @param signature The signature string.
     * @param date The date that the request was signed.
     * @param method The HTTP verb.
     * @param url The URL object.
     * @param body The request body.
     * @returns A Promise that resolves to a boolean indicating whether the signature is valid.
     * @throws TypeError if any required parameters are missing or empty.
     * @example
     * const signature = "keyId=\"https://example.com\",algorithm=\"ed25519\",headers=\"(request-target) host date digest\",signature=\"base64Signature\"";
     * const date = new Date("2021-01-01T00:00:00.000Z");
     * const method = "GET";
     * const url = new URL("https://example.com/users/ff54ee40-2ce9-4d2e-86ac-3cd06a1e1480");
     * const body = "{ ... }";
     * const isValid = await validator.validate(signature, date, method, url, body);
     */
    async validate(
        signature: string,
        date: Date,
        method: HttpVerb,
        url: URL,
        body: string,
    ): Promise<boolean>;

    async validate(
        requestOrSignature: Request | string,
        date?: Date,
        method?: HttpVerb,
        url?: URL,
        body?: string,
    ): Promise<boolean> {
        if (requestOrSignature instanceof Request) {
            const signature = requestOrSignature.headers.get("Signature");
            const date = requestOrSignature.headers.get("Date");
            const url = new URL(requestOrSignature.url);
            const body = await requestOrSignature.text();
            const method = requestOrSignature.method as HttpVerb;

            const missingHeaders = [
                !signature && "Signature",
                !date && "Date",
                !method && "Method",
                !url && "URL",
                !body && "Body",
            ].filter(Boolean);

            // Check if all headers are present
            if (!(signature && date && method && url && body)) {
                // Say which headers are missing
                throw new TypeError(
                    `Headers are missing in request: ${missingHeaders.join(
                        ", ",
                    )}`,
                );
            }

            if (signature.split("signature=").length < 2) {
                throw new TypeError(
                    "Invalid Signature header (wrong format or missing signature)",
                );
            }

            const extractedSignature = signature
                .split("signature=")[1]
                .replace(/"/g, "");

            if (!extractedSignature) {
                throw new TypeError(
                    "Invalid Signature header (wrong format or missing signature)",
                );
            }

            return this.validate(
                extractedSignature,
                new Date(date),
                method as HttpVerb,
                url,
                body,
            );
        }

        if (!(date && method && url && body)) {
            throw new TypeError(
                "Missing or empty required parameters: date, method, url or body",
            );
        }

        const signature = requestOrSignature;

        const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(body),
        );

        const expectedSignedString =
            `(request-target): ${method.toLowerCase()} ${url.pathname}\n` +
            `host: ${url.host}\n` +
            `date: ${date.toISOString()}\n` +
            `digest: SHA-256=${arrayBufferToBase64(digest)}\n`;

        // Check if signed string is valid
        const isValid = await crypto.subtle.verify(
            "Ed25519",
            this.publicKey,
            base64ToArrayBuffer(signature),
            new TextEncoder().encode(expectedSignedString),
        );

        return isValid;
    }
}

/**
 * Constructs a signature for a request.
 * @see https://lysand.org/security/signing
 */
export class SignatureConstructor {
    /**
     * Creates a new instance of SignatureConstructor.
     * @param privateKey The private key used for signature generation.
     * @param keyId The key ID used for the Signature header.
     * @example
     * const privateKey = // CryptoKey
     * const keyId = "https://example.com/users/6a18f2c3-120e-4949-bda4-2aa4c8264d51";
     * const constructor = new SignatureConstructor(privateKey, keyId);
     */
    constructor(
        private privateKey: CryptoKey,
        private keyId: string,
    ) {
        checkEvironmentSupport();
    }

    /**
     * Creates a SignatureConstructor instance from a base64-encoded private key.
     * @param base64PrivateKey The base64-encoded private key.
     * @param keyId The key ID used for the Signature header.
     * @returns A Promise that resolves to a SignatureConstructor instance.
     * @example
     * const privateKey = "base64PrivateKey";
     * const keyId = "https://example.com/users/6a18f2c3-120e-4949-bda4-2aa4c8264d51";
     * const constructor = await SignatureConstructor.fromStringKey(privateKey, keyId);
     */
    static async fromStringKey(
        base64PrivateKey: string,
        keyId: string,
    ): Promise<SignatureConstructor> {
        return new SignatureConstructor(
            await crypto.subtle.importKey(
                "pkcs8",
                base64ToArrayBuffer(base64PrivateKey),
                "Ed25519",
                false,
                ["sign"],
            ),
            keyId,
        );
    }

    /**
     * Signs a request.
     * @param request The request object to sign.
     * @returns A Promise that resolves to the signed request, plus the signed string.
     * @example
     * const request = new Request();
     * const { request: signedRequest } = await constructor.sign(request);
     */
    async sign(request: Request): Promise<{
        request: Request;
        signedString: string;
    }>;

    /**
     * Signs a request.
     * @param method The HTTP verb.
     * @param url The URL object.
     * @param body The request body.
     * @param headers The request headers.
     * @param date The date that the request was signed (optional)
     * @returns A Promise that resolves to the signed headers, and the signed string.
     * @throws TypeError if any required parameters are missing or empty.
     * @example
     * const method = "GET";
     * const url = new URL("https://example.com");
     * const body = "request body";
     * const { headers: signedHeaders } = await constructor.sign(method, url, body);
     */
    async sign(
        method: HttpVerb,
        url: URL,
        body?: string,
        headers?: Headers,
        date?: Date,
    ): Promise<{
        headers: Headers;
        signedString: string;
    }>;

    async sign(
        requestOrMethod: Request | HttpVerb,
        url?: URL,
        body?: string,
        headers: Headers = new Headers(),
        date?: Date,
    ): Promise<
        | {
              headers: Headers;
              signedString: string;
          }
        | {
              request: Request;
              signedString: string;
          }
    > {
        if (requestOrMethod instanceof Request) {
            const request = requestOrMethod.clone();

            const { headers, signedString } = await this.sign(
                requestOrMethod.method as HttpVerb,
                new URL(requestOrMethod.url),
                await requestOrMethod.text(),
                requestOrMethod.headers,
                requestOrMethod.headers.get("Date")
                    ? new Date(requestOrMethod.headers.get("Date") ?? "")
                    : undefined,
            );

            request.headers.set("Date", headers.get("Date") ?? "");
            request.headers.set("Signature", headers.get("Signature") ?? "");

            return { request, signedString };
        }

        if (!(url && headers)) {
            throw new TypeError(
                "Missing or empty required parameters: url, body or headers",
            );
        }

        const finalDate = date?.toISOString() ?? new Date().toISOString();

        const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(body ?? ""),
        );

        const signedString =
            `(request-target): ${requestOrMethod.toLowerCase()} ${
                url.pathname
            }\n` +
            `host: ${url.host}\n` +
            `date: ${finalDate}\n` +
            `digest: SHA-256=${arrayBufferToBase64(digest)}\n`;

        const signature = await crypto.subtle.sign(
            "Ed25519",
            this.privateKey,
            new TextEncoder().encode(signedString),
        );

        const signatureBase64 = arrayBufferToBase64(signature);

        headers.set("Date", finalDate);
        headers.set(
            "Signature",
            `keyId="${this.keyId}",algorithm="ed25519",headers="(request-target) host date digest",signature="${signatureBase64}"`,
        );

        return {
            headers,
            signedString,
        };
    }
}
