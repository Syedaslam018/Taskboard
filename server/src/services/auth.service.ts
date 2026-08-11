import bcrypt from "bcrypt";
import { User, IUser } from "../models/User";
import { AppError } from "../utils/AppError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token";

const SALT_ROUNDS = 12;

interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(name: string, email: string, password: string): Promise<AuthResult> {
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      throw AppError.conflict("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash });

    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());
    return { user, accessToken, refreshToken };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());
    return { user, accessToken, refreshToken };
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const userExists = await User.exists({ _id: payload.sub });
      if (!userExists) {
        throw AppError.unauthorized("User no longer exists");
      }
      return { accessToken: signAccessToken(payload.sub) };
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }
  },

  async me(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return user;
  },
};
