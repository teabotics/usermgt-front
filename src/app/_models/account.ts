import { Role } from './role';

export class Account {
    id: string;
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    idp: string;
    social_id: string;
    role: Role;
    jwtToken?: string;
    access_token: string;
    username: string;
    password: string;
    sign_up_time: string;
    login_count: number;
    last_login_time: string;
    last_session_time: string;
    old_password: string;
}

export class Auth0UserInfo {
  sub: string;
  given_name: string;
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  locale: Role;
  updated_at: string;
  email: string;
  email_verified: string;
}
