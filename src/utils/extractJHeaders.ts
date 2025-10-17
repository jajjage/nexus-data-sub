export function extractRefreshToken(rawHeaders: string | string[]) {
  const refreshTokenIndex = rawHeaders.indexOf('refreshtoken');
  if (refreshTokenIndex !== -1 && refreshTokenIndex + 1 < rawHeaders.length) {
    return rawHeaders[refreshTokenIndex + 1];
  }
  return null;
}

// // Method 2: Convert rawHeaders to object and extract
// export function rawHeadersToObject(rawHeaders: string | any[]) {
//   const headers = {};
//   for (let i = 0; i < rawHeaders.length; i += 2) {
//     const key = rawHeaders[i];
//     const value = rawHeaders[i + 1];
//     headers[key.toLowerCase()] = value;
//   }
//   return headers;
// }
