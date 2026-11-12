
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "./env.js";

// Resolve the backend root directory independently
// of the terminal's current working directory.
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(currentDirectory, "../..");

// Resolve RSA key file paths
const privateKeyPath = resolve(
  backendRoot,
  env.JWT_PRIVATE_KEY_PATH
);

const publicKeyPath = resolve(
  backendRoot,
  env.JWT_PUBLIC_KEY_PATH
);

// Load RSA keys
function loadKey(path: string, keyName: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Unable to load ${keyName}. Check the configured key file path.`
    );
  }
}

export const privateKey = loadKey(
  privateKeyPath,
  "RSA private key"
);

export const publicKey = loadKey(
  publicKeyPath,
  "RSA public key"
);
