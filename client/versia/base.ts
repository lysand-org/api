import { DEFAULT_UA } from "./constants.ts";

type HttpVerb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ConvertibleObject = {
    [key: string]:
        | string
        | number
        | boolean
        | File
        | undefined
        | null
        | ConvertibleObject[]
        | ConvertibleObject;
};

/**
 * Output of a request. Contains the data and headers.
 * @template ReturnType The type of the data returned by the request.
 */
export interface Output<ReturnType> {
    data: ReturnType;
    ok: boolean;
    raw: Response;
}

const objectToFormData = (obj: ConvertibleObject): FormData => {
    return Object.keys(obj).reduce((formData, key) => {
        if (obj[key] === undefined || obj[key] === null) {
            return formData;
        }
        if (obj[key] instanceof File) {
            formData.append(key, obj[key] as Blob);
            return formData;
        }
        if (Array.isArray(obj[key])) {
            (obj[key] as ConvertibleObject[]).forEach((item, index) => {
                if (item instanceof File) {
                    formData.append(`${key}[${index}]`, item as Blob);
                    return;
                }
                formData.append(`${key}[${index}]`, String(item));
            });

            return formData;
        }
        if (typeof obj[key] === "object") {
            const nested = objectToFormData(obj[key] as ConvertibleObject);

            for (const [nestedKey, value] of nested.entries()) {
                formData.append(`${key}[${nestedKey}]`, value);
            }

            return formData;
        }
        formData.append(key, String(obj[key]));
        return formData;
    }, new FormData());
};

/**
 * Wrapper around Error, useful for detecting if an error
 * is due to a failed request.
 *
 * Throws if the request returns invalid or unexpected data.
 */
export class ResponseError<
    ReturnType = {
        error?: string;
    },
> extends Error {
    constructor(
        public response: Output<ReturnType>,
        message: string,
    ) {
        super(message);
        this.name = "ResponseError";
    }
}

export class BaseClient {
    constructor(
        protected baseUrl: URL,
        private accessToken?: string,
        public globalCatch: (error: ResponseError) => void = () => {
            // Do nothing by default
        },
    ) {}

    get url(): URL {
        return this.baseUrl;
    }

    get token(): string | undefined {
        return this.accessToken;
    }

    private async request<ReturnType>(
        request: Request,
    ): Promise<Output<ReturnType>> {
        const result = await fetch(request);
        const isJson = result.headers
            .get("Content-Type")
            ?.includes("application/json");

        if (!result.ok) {
            const error = isJson ? await result.json() : await result.text();
            throw new ResponseError(
                {
                    data: error,
                    ok: false,
                    raw: result,
                },
                `Request failed (${result.status}): ${
                    error.error || error.message || result.statusText
                }`,
            );
        }

        return {
            data: isJson ? await result.json() : (await result.text()) || null,
            ok: true,
            raw: result,
        };
    }

    private constructRequest(
        path: string,
        method: HttpVerb,
        body?: object | FormData,
        extra?: RequestInit,
    ): Request {
        const headers = new Headers({
            "User-Agent": DEFAULT_UA,
        });

        if (this.accessToken) {
            headers.set("Authorization", `Bearer ${this.accessToken}`);
        }
        if (body) {
            if (!(body instanceof FormData)) {
                headers.set("Content-Type", "application/json; charset=utf-8");
            } // else: let FormData set the content type, as it knows best (boundary, etc.)
        }

        for (const [key, value] of Object.entries(extra?.headers || {})) {
            headers.set(key, value);
        }

        return new Request(new URL(path, this.baseUrl).toString(), {
            method,
            headers,
            body: body
                ? body instanceof FormData
                    ? body
                    : JSON.stringify(body)
                : undefined,
            ...extra,
        });
    }

    public get<ReturnType>(
        path: string,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(path, "GET", undefined, extra),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public post<ReturnType>(
        path: string,
        body?: object,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(path, "POST", body, extra),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public postForm<ReturnType>(
        path: string,
        body: FormData | ConvertibleObject,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(
                path,
                "POST",
                body instanceof FormData ? body : objectToFormData(body),
                extra,
            ),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public put<ReturnType>(
        path: string,
        body?: object,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(path, "PUT", body, extra),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public putForm<ReturnType>(
        path: string,
        body: FormData | ConvertibleObject,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(
                path,
                "PUT",
                body instanceof FormData ? body : objectToFormData(body),
                extra,
            ),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public patch<ReturnType>(
        path: string,
        body?: object,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(path, "PATCH", body, extra),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public patchForm<ReturnType>(
        path: string,
        body: FormData | ConvertibleObject,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(
                path,
                "PATCH",
                body instanceof FormData ? body : objectToFormData(body),
                extra,
            ),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public delete<ReturnType>(
        path: string,
        body?: object,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(path, "DELETE", body, extra),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }

    public deleteForm<ReturnType>(
        path: string,
        body: FormData | ConvertibleObject,
        extra?: RequestInit,
    ): Promise<Output<ReturnType>> {
        return this.request<ReturnType>(
            this.constructRequest(
                path,
                "DELETE",
                body instanceof FormData ? body : objectToFormData(body),
                extra,
            ),
        ).catch((e) => {
            this.globalCatch(e);
            throw e;
        });
    }
}
