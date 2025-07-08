export class User {
  userName: string;
  password: string;
  email: string;
  createdAt: Date;
  userId: number;
  isActive: boolean;
  constructor(
    userName: string,
    password: string,
    email: string,
    createdAt: Date,
    userId: number,
  ) {
    this.userName = userName;
    this.password = password;
    this.email = email;
    this.createdAt = createdAt;
    this.userId = userId;
    this.isActive = true;
  }
}
