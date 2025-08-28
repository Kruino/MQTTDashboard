// utils/jwt.js
export function parseJwt(token) {
  try {
    // JWT is in the form: header.payload.signature
    const base64Url = token.split(".")[1]; 
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // decode base64
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload); // this will give you the payload object
  } catch (e) {
    console.error("Invalid token", e);
    return null;
  }
}
