import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AuthGuard } from "../auth/auth.guard"
import { AuthenticatedRequest } from "../auth/auth.types"
import { ReviewsService } from "./reviews.service"

@Controller("api/v2")
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("relatorios/semanal")
  weeklyReport(
    @Req() request: AuthenticatedRequest,
    @Query("start_date") startDate?: string,
    @Query("end_date") endDate?: string,
  ) {
    return this.reviewsService.weeklyReport(request.currentUser!, startDate, endDate)
  }

  @Get("revisoes/estado")
  reviewState(@Req() request: AuthenticatedRequest) {
    return this.reviewsService.reviewState(request.currentUser!)
  }

  @Get("revisoes")
  listReviews(@Req() request: AuthenticatedRequest) {
    return this.reviewsService.listReviews(request.currentUser!)
  }

  @Post("revisoes/fechar")
  closeReview(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.reviewsService.closeReview(request.currentUser!, payload ?? {})
  }

  @Get("comando-general/suporte")
  generalSupport(@Req() request: AuthenticatedRequest) {
    return this.reviewsService.generalSupport(request.currentUser!)
  }
}
