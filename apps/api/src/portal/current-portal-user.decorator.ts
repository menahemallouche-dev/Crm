import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedPortalUser } from "./types";

export const CurrentPortalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPortalUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
