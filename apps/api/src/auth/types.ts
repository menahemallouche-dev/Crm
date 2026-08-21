import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  googleLinked: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
