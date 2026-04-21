import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

@Injectable()
export class BackendService {
  getBackend(): string {
    return 'Backend is running';
  }
}