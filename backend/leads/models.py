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

    client = models.OneToOneField(
        'clients.Client', 
        on_delete=models.CASCADE, 
        related_name='lead_info',
        help_text="Link to the master client record"
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
    
    notes = models.TextField(blank=True, null=True)
    last_contacted_at = models.DateTimeField(null=True, blank=True)
    next_follow_up_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-priority', '-lead_score', '-created_at']

    def __str__(self):
        return f"Lead for {self.client.client_name} ({self.status})"

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
        return f"{self.activity_type} for {self.lead.client.client_name} on {self.created_at}"
