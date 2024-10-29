// Regular expression to match HTTP/HTTPS URLs
export const httpRegex: RegExp =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&\/=]*)$/;

// @link https://urlregex.com/
// Regular expression to match URIs
export const uriRegex: RegExp =
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.\-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.\-]+)((?:\/[+~%\/.\w_-]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!\/\\\w]*))?)/;
