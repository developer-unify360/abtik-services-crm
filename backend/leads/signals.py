from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Lead, LeadAssignmentRule, LeadActivity

@receiver(post_save, sender=Lead)
def auto_assign_lead(sender, instance, created, **kwargs):
    """
    Automatically assign new leads based on active assignment rules.
    Only triggers if the lead is not already assigned.
    """
    if not created or instance.assigned_to:
        return

    # Find matching active rule (ordered by priority)
    rules = LeadAssignmentRule.objects.filter(is_active=True).order_by('-priority')
    
    for rule in rules:
        # Check Source trigger
        if rule.trigger_source and instance.source != rule.trigger_source:
            continue
        
        # Check Service trigger
        if rule.trigger_service and instance.service != rule.trigger_service:
            continue
            
        # If we reach here, the rule matches
        eligible_users = rule.eligible_users.all()
        if not eligible_users.exists():
            continue
            
        # Strategy: Round Robin
        if rule.strategy == 'round_robin':
            # Simple round robin: find the index of last assigned user and pick the next
            # For brevity and robustness in this environment, pick the one who hasn't been assigned for the longest
            # or isn't the last_assigned_user
            next_user = None
            if rule.last_assigned_user in eligible_users:
                # Get index of last assigned and pick next
                user_list = list(eligible_users.order_by('id'))
                last_index = user_list.index(rule.last_assigned_user)
                next_index = (last_index + 1) % len(user_list)
                next_user = user_list[next_index]
            else:
                next_user = eligible_users.first()
            
            if next_user:
                instance.assigned_to = next_user
                instance.assigned_at = timezone.now()
                instance.assignment_method = 'round_robin'
                instance.save(update_fields=['assigned_to', 'assigned_at', 'assignment_method'])
                
                # Update rule record
                rule.last_assigned_user = next_user
                rule.save(update_fields=['last_assigned_user'])
                
                # Log activity
                LeadActivity.objects.create(
                    lead=instance,
                    activity_type='status_change',
                    description=f"Auto-assigned to {next_user.name or next_user.email} via rule: {rule.name}",
                )
                break
