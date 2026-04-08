export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
