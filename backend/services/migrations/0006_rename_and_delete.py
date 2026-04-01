from django.db import migrations, models

def clear_documents_received(apps, schema_editor):
    ServiceRequest = apps.get_model('services', 'ServiceRequest')
    # Update to a value that Postgres can easily cast to boolean (like '0' for False)
    ServiceRequest.objects.all().update(documents_received='0')

class Migration(migrations.Migration):

    dependencies = [
        ('services', '0005_alter_clientdocumentsubmission_file_max_length'),
    ]

    operations = [
        migrations.RunPython(clear_documents_received),
        migrations.RenameField(
            model_name='servicerequest',
            old_name='handoff_note',
            new_name='note',
        ),
        migrations.RemoveField(
            model_name='servicerequest',
            name='service_scope',
        ),
        migrations.RemoveField(
            model_name='servicerequest',
            name='dependencies_blockers',
        ),
        migrations.AlterField(
            model_name='servicerequest',
            name='documents_received',
            field=models.BooleanField(default=False),
        ),
    ]
