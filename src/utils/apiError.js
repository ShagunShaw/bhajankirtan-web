export class apiError extends Error {
    status;
    errName;
    errMessage;
    success;

    constructor(statusCode, errName, errMessage) {
        super(errMessage);

        this.status= statusCode,
        this.errName = errName ?? "UNKNOWN_ERROR"           // err.name to be passes here
        this.errMessage = errMessage ?? "Internal Server Error",        // err.message to be passed here
        this.success= false
    }
}

// err.message — human readable message
// err.name — it gives you "TypeError", "ReferenceError", "SyntaxError" etc.
// err.stack — full stack trace