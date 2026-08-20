export interface PortalJwtPayload {
  sub: string; // PortalUser.id
  companyId: string;
  email: string;
  scope: "portal";
}

export interface AuthenticatedPortalUser {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
}
