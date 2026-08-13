import { Module } from "@nestjs/common"

import { OperationalCalendarService } from "./operational-calendar.service"

@Module({
  providers: [OperationalCalendarService],
  exports: [OperationalCalendarService],
})
export class CalendarModule {}
