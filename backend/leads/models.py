from django.db import models
from django.conf import settings
from core.models import BaseModel

class Lead(BaseModel):
    """
    Connects lead management data to a Client.
    Clients are the master record, and this model tracks the sales lifecycle.
    """
    LEAD_STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('proposal_sent', 'Proposal Sent'),
        ('negotiation', 'Negotiation'),
        ('closed_won', 'Closed Won'),
        ('closed_lost', 'Closed Lost'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    ASSIGNMENT_METHOD_CHOICES = [
        ('manual', 'Manual'),
        ('auto', 'Auto'),
        ('round_robin', 'Round Robin'),
    ]

    client = models.ForeignKey(
        'clients.Client', 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        help_text="Link to the master client record"
    )
    
    # Standalone lead fields (before conversion)
    client_name = models.CharField(max_length=255, null=True, blank=True)
    company_name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    mobile = models.CharField(max_length=20, null=True, blank=True)
    industry = models.ForeignKey(
        'attributes.Industry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads'
    )
    
    bde_name = models.CharField(max_length=255, null=True, blank=True)
    source = models.ForeignKey(
        'attributes.LeadSource',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads'
    )
    status = models.CharField(max_length=50, choices=LEAD_STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    lead_score = models.IntegerField(default=0)
    
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_leads'
    )
    
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        help_text="Service the lead is interested in"
    )
    
    notes = models.TextField(blank=True, null=True)
    last_contacted_at = models.DateTimeField(null=True, blank=True)
    next_follow_up_date = models.DateField(null=True, blank=True)

    # P0 enrichment fields
    lead_status_reason = models.CharField(max_length=255, null=True, blank=True,
        help_text="Reason for current status, e.g. why lost or why qualified")
    lost_reason = models.CharField(max_length=255, null=True, blank=True,
        help_text="Specific reason if lead was lost")
    interested_at = models.DateTimeField(null=True, blank=True,
        help_text="When the lead first showed interest")
    converted_at = models.DateTimeField(null=True, blank=True,
        help_text="When the lead was converted to a booking")
    converted_booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_lead',
        help_text="Booking created from this lead"
    )
    assignment_method = models.CharField(
        max_length=20,
        choices=ASSIGNMENT_METHOD_CHOICES,
        null=True,
        blank=True,
        help_text="How this lead was assigned"
    )
    assigned_at = models.DateTimeField(null=True, blank=True,
        help_text="When the lead was assigned to the current owner")
    first_response_at = models.DateTimeField(null=True, blank=True,
        help_text="When the lead was first contacted")
    last_activity_at = models.DateTimeField(null=True, blank=True,
        help_text="Timestamp of the most recent activity on this lead")

    class Meta:
        ordering = ['-priority', '-lead_score', '-created_at']

    def __str__(self):
        name = self.client.client_name if self.client else self.client_name
        return f"Lead for {name} ({self.status})"

class LeadActivity(BaseModel):
    """
    Logs every interaction with a lead for complete transparency.
    """
    ACTIVITY_TYPE_CHOICES = [
        ('call', 'Call'),
        ('email', 'Email'),
        ('meeting', 'Meeting'),
        ('note', 'Note'),
        ('status_change', 'Status Change'),
    ]
    
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPE_CHOICES)
    description = models.TextField()
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        name = self.lead.client.client_name if self.lead.client else self.lead.client_name
        return f"{self.activity_type} for {name} on {self.created_at}"
