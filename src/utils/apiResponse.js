export class apiResponse {
    status;
    data;
    message;
    success;

    constructor(statusCode, data, message = "Success") {
        this.status = statusCode;
        this.data = data;
        this.message = message;
        this.success = true;
    }
}