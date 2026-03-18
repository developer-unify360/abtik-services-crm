from django.apps import AppConfig


class TasksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tasks'
    verbose_name = 'Workflow & Task Assignment Module'
    
    def ready(self):
        # Import signals when app is ready
        pass
