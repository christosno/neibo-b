import bcCrypt from "bcrypt";
import env from "../../env.ts";

export const hashPassword = async (password: string) => {
  return await bcCrypt.hash(password, env.BCRYPT_ROUNDS);
};

export const comparePasswords = async (
  password: string,
  hashedPassword: string
) => {
  return await bcCrypt.compare(password, hashedPassword);
};
