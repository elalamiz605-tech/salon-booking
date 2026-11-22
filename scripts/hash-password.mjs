// Prints a bcrypt hash for ADMIN_PASSWORD_HASH: node scripts/hash-password.mjs "your password"
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your password"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
