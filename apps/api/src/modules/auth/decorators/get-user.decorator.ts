// src/common/decorators/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // En algunos sistemas el usuario se guarda en 'user' o 'currentUser'
    const user = request.user; 

    return data ? user?.[data] : user;
  },
);