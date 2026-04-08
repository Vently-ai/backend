import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MicroclientService } from './microclient.service.js';

@Module({
  imports: [HttpModule],
  providers: [MicroclientService],
  exports: [MicroclientService],
})
export class MicroclientModule {}
