export class User {
  userName: string;
  password: string;
  email: string;
  createdAt: Date;
  userId: number;
  isActive: boolean;
  isSocialSignin: boolean;
  constructor(
    userName: string,
    password: string,
    email: string,
    createdAt: Date,
    userId: number,
    isActive: boolean,
    isSocialSignin: boolean
  ) {
    this.userName = userName;
    this.password = password;
    this.email = email;
    this.createdAt = createdAt;
    this.userId = userId;
    this.isActive = isActive;
    this.isSocialSignin = isSocialSignin;
  }
}
