import { Controller, Get } from '@nestjs/common';
import { AppService, BackendService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,  private readonly backendService: BackendService) {}

  // @Get()
  // getHello(): string {
  //   return this.appService.getHello();
  // }

  @Get()
  getBackend(): string {
    return this.backendService.getBackend();
  }
}
