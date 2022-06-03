// Parses an unformatted phone number entry to be in `(650) 000-0000` format.
export function parseCellPhone(phone: string) {
    const [, code, first, second] = phone.match(/\(?(\d{3})\)?[-\s]?(\d{3})[-\s]?(\d{0,4})/)!;
    return `(${code}) ${first}-${second}`;
}

// Capitalizes a string.
export function capitalize(str: string) {
    return str[0].toUpperCase() + str.slice(1);
}
