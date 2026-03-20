from rest_framework.permissions import IsAuthenticated


class CanCreateBooking(IsAuthenticated):
    pass


class CanUpdateBooking(IsAuthenticated):
    pass


class CanDeleteBooking(IsAuthenticated):
    pass
