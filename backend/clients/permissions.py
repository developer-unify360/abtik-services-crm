from rest_framework.permissions import IsAuthenticated


# Simple permission: just check the user is authenticated (admin role)
# All protected views already use IsAuthenticated from DRF settings.
# These classes are kept as pass-throughs for backward compatibility with any view that imports them.

class CanCreateClient(IsAuthenticated):
    pass


class CanUpdateClient(IsAuthenticated):
    pass


class CanDeleteClient(IsAuthenticated):
    pass
